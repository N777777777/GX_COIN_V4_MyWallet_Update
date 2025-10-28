-- تعديل دالة مشاهدة الإعلانات لتصبح الحد الأقصى 20 بدلاً من 10
CREATE OR REPLACE FUNCTION public.handle_ad_view_and_check_qualification(user_telegram_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  ad_views_today INTEGER := 0;
  qualification_won BOOLEAN := FALSE;
  random_value NUMERIC;
  new_market_value NUMERIC;
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
  
  -- التحقق من عدد الإعلانات اليوم
  SELECT COALESCE(views_count, 0) INTO ad_views_today
  FROM public.daily_ad_views 
  WHERE telegram_user_id = user_record.id 
  AND view_date = CURRENT_DATE;
  
  -- إذا وصل للحد الأقصى (20 إعلان)
  IF ad_views_today >= 20 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لقد وصلت للحد الأقصى من الإعلانات اليوم (20 إعلان)',
      'max_reached', true,
      'views_today', ad_views_today
    );
  END IF;
  
  -- تحديث عدد الإعلانات
  INSERT INTO public.daily_ad_views (telegram_user_id, telegram_id, views_count)
  VALUES (user_record.id, user_telegram_id, 1)
  ON CONFLICT (telegram_user_id, view_date) 
  DO UPDATE SET 
    views_count = daily_ad_views.views_count + 1,
    updated_at = now();
  
  -- زيادة القيمة السوقية العالمية
  SELECT public.increment_market_value(0.0025) INTO new_market_value;
  
  -- التحقق من الربح بالتأهيل (نسبة 0.0000001%)
  random_value := random();
  IF random_value <= 0.000000001 THEN  -- 0.0000001% = 0.000000001
    qualification_won := TRUE;
    
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
      'ربح التأهيل من صندوق الهدايا'
    )
    ON CONFLICT (telegram_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'qualification_won', qualification_won,
    'views_today', ad_views_today + 1,
    'remaining_views', 20 - (ad_views_today + 1),
    'new_market_value', new_market_value
  );
END;
$function$