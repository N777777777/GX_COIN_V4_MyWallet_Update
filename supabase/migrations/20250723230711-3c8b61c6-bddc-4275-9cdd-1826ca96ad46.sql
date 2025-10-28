-- تحديث دالة تدوير العجلة لإضافة الجوائز الوهمية
CREATE OR REPLACE FUNCTION public.spin_wheel(user_telegram_id BIGINT)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  existing_spin RECORD;
  random_value NUMERIC;
  prize_type TEXT;
  prize_amount NUMERIC;
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
  
  -- التحقق من عدم الدوران اليوم
  SELECT * INTO existing_spin 
  FROM public.daily_wheel_spins 
  WHERE telegram_user_id = user_record.id 
  AND spin_date = CURRENT_DATE;
  
  IF existing_spin IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لقد قمت بتدوير العجلة اليوم بالفعل! عد غداً',
      'already_spun', true,
      'next_spin', (CURRENT_DATE + INTERVAL '1 day')::date
    );
  END IF;
  
  -- توليد رقم عشوائي لتحديد الجائزة
  random_value := random() * 100;
  
  -- تحديد الجائزة بناءً على النسب المحددة
  -- ملاحظة: الجوائز الوهمية (50 عملة و 1 TON) لها نسبة 0% ولن تظهر أبداً
  IF random_value <= 1 THEN
    -- 1% فرصة للحصول على 1 عملة
    prize_type := 'coins';
    prize_amount := 1;
  ELSIF random_value <= 1.001 THEN
    -- 0.001% فرصة للحصول على 5 عملات
    prize_type := 'coins';
    prize_amount := 5;
  ELSIF random_value <= 81.001 THEN
    -- 80% فرصة للحصول على 0.01 عملة
    prize_type := 'coins';
    prize_amount := 0.01;
  ELSE
    -- 18.999% فرصة لعدم الحصول على جائزة
    -- ملاحظة: الجوائز الوهمية (50 عملة و 1 TON) لن تظهر هنا لأن نسبتها 0%
    prize_type := 'none';
    prize_amount := 0;
  END IF;
  
  -- تسجيل الدوران
  INSERT INTO public.daily_wheel_spins (
    telegram_user_id,
    telegram_id,
    spin_date,
    prize_type,
    prize_amount
  ) VALUES (
    user_record.id,
    user_telegram_id,
    CURRENT_DATE,
    prize_type,
    prize_amount
  );
  
  -- إضافة الجائزة للمستخدم إذا لم تكن خسارة
  IF prize_amount > 0 THEN
    IF prize_type = 'coins' THEN
      UPDATE public.telegram_users 
      SET coins = coins + prize_amount
      WHERE id = user_record.id;
    ELSIF prize_type = 'ton' THEN
      UPDATE public.telegram_users 
      SET ton_balance = ton_balance + prize_amount
      WHERE id = user_record.id;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'prize_type', prize_type,
    'prize_amount', prize_amount,
    'message', CASE 
      WHEN prize_amount > 0 THEN '🎉 مبروك! لقد ربحت: ' || prize_amount || ' ' || 
        CASE WHEN prize_type = 'coins' THEN 'عملة' ELSE 'TON' END
      ELSE '😅 حظ أوفر المرة القادمة!'
    END,
    'next_spin', (CURRENT_DATE + INTERVAL '1 day')::date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;