-- إنشاء جدول المستخدمين المؤهلين يدوياً
CREATE TABLE public.manual_qualified_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  first_name TEXT,
  username TEXT,
  qualified_by_admin_id UUID,
  qualification_reason TEXT DEFAULT 'تأهيل يدوي من الإدارة',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- منع التكرار لنفس المستخدم
  UNIQUE(telegram_user_id),
  UNIQUE(telegram_id)
);

-- تفعيل RLS
ALTER TABLE public.manual_qualified_users ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Anyone can view manual qualified users" 
ON public.manual_qualified_users 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Service role can manage manual qualified users" 
ON public.manual_qualified_users 
FOR ALL 
USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_manual_qualified_users_telegram_id ON public.manual_qualified_users(telegram_id);
CREATE INDEX idx_manual_qualified_users_active ON public.manual_qualified_users(is_active);
CREATE INDEX idx_manual_qualified_users_created ON public.manual_qualified_users(created_at);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_manual_qualified_users_updated_at
BEFORE UPDATE ON public.manual_qualified_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لإضافة مستخدم مؤهل يدوياً
CREATE OR REPLACE FUNCTION public.add_manual_qualified_user(
  user_telegram_id BIGINT,
  reason TEXT DEFAULT 'تأهيل يدوي من الإدارة'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result JSON;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من عدم وجوده مسبقاً
  IF EXISTS (
    SELECT 1 FROM public.manual_qualified_users 
    WHERE telegram_id = user_telegram_id AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم مؤهل مسبقاً'
    );
  END IF;
  
  -- إضافة المستخدم للمؤهلين يدوياً
  INSERT INTO public.manual_qualified_users (
    telegram_user_id,
    telegram_id,
    first_name,
    username,
    qualification_reason
  ) VALUES (
    user_record.id,
    user_record.telegram_id,
    user_record.first_name,
    user_record.username,
    reason
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تأهيل المستخدم بنجاح'
  );
END;
$$;

-- إنشاء دالة لإزالة التأهيل اليدوي
CREATE OR REPLACE FUNCTION public.remove_manual_qualified_user(
  user_telegram_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إلغاء التأهيل اليدوي
  UPDATE public.manual_qualified_users 
  SET is_active = false, updated_at = now()
  WHERE telegram_id = user_telegram_id;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'تم إلغاء تأهيل المستخدم بنجاح'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود في قائمة المؤهلين يدوياً'
    );
  END IF;
END;
$$;

-- إنشاء دالة للحصول على جميع المؤهلين (مهام + يدوي)
CREATE OR REPLACE FUNCTION public.get_all_qualified_users()
RETURNS TABLE(
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  qualification_type TEXT,
  qualification_date TIMESTAMP WITH TIME ZONE,
  qualification_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- المؤهلين من خلال المهام
  SELECT 
    qu.telegram_id,
    qu.first_name,
    qu.username,
    'task_completion' as qualification_type,
    qu.qualification_date,
    'إكمال مهمة KuCoin' as qualification_reason
  FROM public.qualified_users qu
  WHERE qu.is_active = true
  
  UNION ALL
  
  -- المؤهلين يدوياً
  SELECT 
    mqu.telegram_id,
    mqu.first_name,
    mqu.username,
    'manual_qualification' as qualification_type,
    mqu.created_at as qualification_date,
    mqu.qualification_reason
  FROM public.manual_qualified_users mqu
  WHERE mqu.is_active = true
  
  ORDER BY qualification_date DESC;
END;
$$;