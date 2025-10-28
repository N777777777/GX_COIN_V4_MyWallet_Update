-- إضافة عمود نسبة عمولة إحالة G COIN للمستخدمين
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS gcoin_referral_commission_rate NUMERIC NOT NULL DEFAULT 0.1;

-- إضافة تعليق على العمود
COMMENT ON COLUMN public.telegram_users.gcoin_referral_commission_rate IS 'نسبة عمولة الإحالة من G COIN (القيمة الافتراضية 0.1 = 10%)';

-- إنشاء دالة لتعيين نسبة عمولة إحالة G COIN للمستخدم
CREATE OR REPLACE FUNCTION public.set_user_referral_commission(
  user_telegram_id BIGINT,
  commission_rate NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- التحقق من صحة نسبة العمولة (بين 0 و 10)
  IF commission_rate < 0 OR commission_rate > 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'نسبة العمولة يجب أن تكون بين 0 و 10'
    );
  END IF;
  
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
  
  -- تحديث نسبة العمولة
  UPDATE public.telegram_users 
  SET gcoin_referral_commission_rate = commission_rate,
      updated_at = now()
  WHERE telegram_id = user_telegram_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث نسبة عمولة الإحالة بنجاح',
    'telegram_id', user_telegram_id,
    'commission_rate', commission_rate,
    'commission_percentage', (commission_rate * 100) || '%'
  );
END;
$$;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION public.set_user_referral_commission(BIGINT, NUMERIC) IS 'تعيين نسبة عمولة إحالة G COIN للمستخدم (القيمة بين 0 و 10)';

-- مثال على الاستخدام:
-- SELECT set_user_referral_commission(123456789, 0.5);  -- تعيين عمولة 50%
-- SELECT set_user_referral_commission(123456789, 0.1);  -- تعيين عمولة 10% (القيمة الافتراضية)