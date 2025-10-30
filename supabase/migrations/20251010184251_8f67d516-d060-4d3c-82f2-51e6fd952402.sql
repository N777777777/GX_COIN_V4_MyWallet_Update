-- ======================================
-- نظام الأمان المتقدم لحماية البوت من الاختراقات
-- ======================================

-- 1. إنشاء جدول لتسجيل جميع عمليات تعديل الرصيد (Audit Log)
CREATE TABLE IF NOT EXISTS public.balance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL REFERENCES public.telegram_users(id),
  telegram_id BIGINT NOT NULL,
  operation_type TEXT NOT NULL, -- 'add', 'subtract', 'update'
  balance_type TEXT NOT NULL, -- 'coins', 'ton_balance', 'pepe_balance', etc.
  old_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  amount_changed NUMERIC NOT NULL,
  source TEXT NOT NULL, -- 'task_completion', 'admin_action', 'purchase', etc.
  edge_function_name TEXT, -- اسم الـ edge function الذي قام بالعملية
  ip_address TEXT,
  user_agent TEXT,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS على جدول الـ audit log
ALTER TABLE public.balance_audit_log ENABLE ROW LEVEL SECURITY;

-- سياسة: فقط service role يمكنه إدارة الـ audit log
CREATE POLICY "Only service role can manage audit log"
ON public.balance_audit_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. إنشاء جدول للعمليات المشبوهة
CREATE TABLE IF NOT EXISTS public.suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID REFERENCES public.telegram_users(id),
  telegram_id BIGINT,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  ip_address TEXT,
  user_agent TEXT,
  additional_data JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.telegram_users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage suspicious activities"
ON public.suspicious_activities FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. دالة آمنة لإضافة رصيد (يجب استخدامها فقط من edge functions)
CREATE OR REPLACE FUNCTION public.secure_add_balance(
  p_telegram_user_id UUID,
  p_balance_type TEXT,
  p_amount NUMERIC,
  p_source TEXT,
  p_edge_function TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
  v_operation_type TEXT;
BEGIN
  -- التحقق من صحة المعاملات
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المبلغ غير صحيح'
    );
  END IF;

  -- الحصول على المستخدم مع قفل الصف لمنع race conditions
  SELECT * INTO v_user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id
  FOR UPDATE;

  IF v_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;

  -- تحديد نوع العملية
  v_operation_type := CASE WHEN p_amount > 0 THEN 'add' ELSE 'subtract' END;

  -- الحصول على الرصيد القديم
  CASE p_balance_type
    WHEN 'coins' THEN
      v_old_balance := COALESCE(v_user_record.coins, 0);
    WHEN 'ton_balance' THEN
      v_old_balance := COALESCE(v_user_record.ton_balance, 0);
    WHEN 'pepe_withdrawable_balance' THEN
      v_old_balance := COALESCE(v_user_record.pepe_withdrawable_balance, 0);
    WHEN 'pepe_advertising_balance' THEN
      v_old_balance := COALESCE(v_user_record.pepe_advertising_balance, 0);
    WHEN 'gcoin_v4_balance' THEN
      v_old_balance := COALESCE(v_user_record.gcoin_v4_balance, 0);
    WHEN 'alpha_balance' THEN
      v_old_balance := COALESCE(v_user_record.alpha_balance, 0);
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'نوع الرصيد غير صحيح'
      );
  END CASE;

  -- حساب الرصيد الجديد
  v_new_balance := v_old_balance + p_amount;

  -- التحقق من أن الرصيد لن يصبح سالب
  IF v_new_balance < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الرصيد غير كافي'
    );
  END IF;

  -- تحديث الرصيد
  CASE p_balance_type
    WHEN 'coins' THEN
      UPDATE public.telegram_users 
      SET coins = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
    WHEN 'ton_balance' THEN
      UPDATE public.telegram_users 
      SET ton_balance = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
    WHEN 'pepe_withdrawable_balance' THEN
      UPDATE public.telegram_users 
      SET pepe_withdrawable_balance = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
    WHEN 'pepe_advertising_balance' THEN
      UPDATE public.telegram_users 
      SET pepe_advertising_balance = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
    WHEN 'gcoin_v4_balance' THEN
      UPDATE public.telegram_users 
      SET gcoin_v4_balance = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
    WHEN 'alpha_balance' THEN
      UPDATE public.telegram_users 
      SET alpha_balance = v_new_balance, updated_at = NOW()
      WHERE id = p_telegram_user_id;
  END CASE;

  -- تسجيل العملية في audit log
  INSERT INTO public.balance_audit_log (
    telegram_user_id,
    telegram_id,
    operation_type,
    balance_type,
    old_balance,
    new_balance,
    amount_changed,
    source,
    edge_function_name,
    additional_data
  ) VALUES (
    p_telegram_user_id,
    v_user_record.telegram_id,
    v_operation_type,
    p_balance_type,
    v_old_balance,
    v_new_balance,
    p_amount,
    p_source,
    p_edge_function,
    p_additional_data
  );

  -- كشف النشاط المشبوه: إضافة مبالغ كبيرة
  IF p_amount > 1000 AND p_balance_type = 'coins' THEN
    INSERT INTO public.suspicious_activities (
      telegram_user_id,
      telegram_id,
      activity_type,
      description,
      severity,
      additional_data
    ) VALUES (
      p_telegram_user_id,
      v_user_record.telegram_id,
      'large_balance_addition',
      'تمت إضافة مبلغ كبير: ' || p_amount || ' من نوع ' || p_balance_type,
      'high',
      json_build_object(
        'amount', p_amount,
        'balance_type', p_balance_type,
        'source', p_source,
        'edge_function', p_edge_function
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'amount_changed', p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$$;

-- 4. تشديد RLS policies على جدول telegram_users
-- إلغاء السياسات القديمة التي قد تسمح بتعديل الرصيد مباشرة
DROP POLICY IF EXISTS "Users can update their own balance" ON public.telegram_users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.telegram_users;

-- سياسة جديدة: منع أي تعديل مباشر على الأرصدة
CREATE POLICY "Block direct balance modifications"
ON public.telegram_users FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- السماح للمستخدمين بقراءة بياناتهم فقط
DROP POLICY IF EXISTS "Users can view their own data safely" ON public.telegram_users;
CREATE POLICY "Users can view their own data securely"
ON public.telegram_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = telegram_users.id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
    AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- 5. إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_balance_audit_log_user_id ON public.balance_audit_log(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_balance_audit_log_created_at ON public.balance_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_audit_log_source ON public.balance_audit_log(source);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON public.suspicious_activities(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_created_at ON public.suspicious_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_resolved ON public.suspicious_activities(resolved);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON public.suspicious_activities(severity);

-- 6. دالة للحصول على سجل التعديلات المشبوهة
CREATE OR REPLACE FUNCTION public.get_user_suspicious_activities(
  p_telegram_id BIGINT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activities JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_activities
  FROM (
    SELECT 
      id,
      activity_type,
      description,
      severity,
      created_at,
      resolved
    FROM public.suspicious_activities
    WHERE telegram_id = p_telegram_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN json_build_object(
    'success', true,
    'activities', v_activities
  );
END;
$$;

-- 7. دالة للحصول على آخر تعديلات الرصيد للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_balance_history(
  p_telegram_id BIGINT,
  p_balance_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_history
  FROM (
    SELECT 
      operation_type,
      balance_type,
      old_balance,
      new_balance,
      amount_changed,
      source,
      edge_function_name,
      created_at
    FROM public.balance_audit_log
    WHERE telegram_id = p_telegram_id
    AND (p_balance_type IS NULL OR balance_type = p_balance_type)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN json_build_object(
    'success', true,
    'history', v_history
  );
END;
$$;