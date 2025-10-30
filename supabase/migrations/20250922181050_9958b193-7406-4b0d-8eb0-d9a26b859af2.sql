-- حذف الدالة الموجودة
DROP FUNCTION IF EXISTS public.get_user_mining_record(uuid);

-- إنشاء دالة التعدين الرئيسية
CREATE OR REPLACE FUNCTION public.mine_gcoin(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  hours_since_last_mining NUMERIC;
  result JSON;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من الرصيد (يجب أن يكون لديه 10 عملات ألفا على الأقل)
  IF user_record.coins < 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تحتاج إلى 10 عملات ألفا على الأقل للتعدين'
    );
  END IF;
  
  -- البحث عن سجل التعدين السابق
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id
  ORDER BY last_mining_date DESC
  LIMIT 1;
  
  -- التحقق من وقت التعدين الأخير (24 ساعة)
  IF mining_record IS NOT NULL THEN
    hours_since_last_mining := EXTRACT(EPOCH FROM (now() - mining_record.last_mining_date)) / 3600;
    
    IF hours_since_last_mining < 24 THEN
      RETURN json_build_object(
        'success', false,
        'message', 'يجب انتظار 24 ساعة بين عمليات التعدين',
        'hours_remaining', 24 - hours_since_last_mining
      );
    END IF;
  END IF;
  
  -- بدء عملية التعدين
  -- خصم 10 عملات ألفا
  UPDATE public.telegram_users 
  SET coins = coins - 10,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  -- إضافة أو تحديث سجل التعدين
  IF mining_record IS NULL THEN
    -- إنشاء سجل جديد
    INSERT INTO public.gcoin_mining (
      telegram_user_id,
      last_mining_date,
      total_gcoin_mined
    ) VALUES (
      p_telegram_user_id,
      now(),
      1
    );
  ELSE
    -- تحديث السجل الموجود
    UPDATE public.gcoin_mining
    SET last_mining_date = now(),
        total_gcoin_mined = total_gcoin_mined + 1,
        updated_at = now()
    WHERE telegram_user_id = p_telegram_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على 1 G COIN V4',
    'gcoin_earned', 1,
    'alpha_coins_spent', 10,
    'next_mining_available', now() + INTERVAL '24 hours'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- التراجع عن التغييرات في حالة الخطأ
    ROLLBACK;
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء التعدين: ' || SQLERRM
    );
END;
$$;

-- إنشاء دالة لجلب سجل التعدين للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mining_record RECORD;
  hours_until_next_mining NUMERIC;
  result JSON;
BEGIN
  -- البحث عن سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id
  ORDER BY last_mining_date DESC
  LIMIT 1;
  
  IF mining_record IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'can_mine', true,
      'total_gcoin_mined', 0,
      'last_mining_date', null,
      'hours_until_next_mining', 0
    );
  END IF;
  
  -- حساب الوقت المتبقي للتعدين التالي
  hours_until_next_mining := 24 - EXTRACT(EPOCH FROM (now() - mining_record.last_mining_date)) / 3600;
  
  -- إذا كان الوقت سالب، فيمكن التعدين
  IF hours_until_next_mining <= 0 THEN
    hours_until_next_mining := 0;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'can_mine', hours_until_next_mining <= 0,
    'total_gcoin_mined', mining_record.total_gcoin_mined,
    'last_mining_date', mining_record.last_mining_date,
    'hours_until_next_mining', GREATEST(0, hours_until_next_mining)
  );
END;
$$;