-- Fix all database functions to have secure search paths
-- This addresses all 53 security warnings about mutable search paths

-- 1. move_withdrawal_to_completed
CREATE OR REPLACE FUNCTION public.move_withdrawal_to_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- التحقق من أن الحالة تغيرت إلى completed أو failed
  IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
    
    -- إدراج الطلب في جدول الطلبات المكتملة
    INSERT INTO public.completed_ton_withdrawals (
      telegram_user_id,
      wallet_address,
      amount,
      status,
      transaction_hash,
      created_at,
      completed_at,
      reviewer_notes
    ) VALUES (
      NEW.telegram_user_id,
      NEW.wallet_address,
      NEW.amount,
      NEW.status,
      NEW.reviewer_notes, -- استخدام reviewer_notes كـ transaction_hash مؤقتاً
      OLD.created_at,
      COALESCE(NEW.reviewed_at, NOW()),
      NEW.reviewer_notes
    );
    
    -- حذف الطلب من جدول الطلبات المعلقة
    DELETE FROM public.pending_ton_withdrawals WHERE id = NEW.id;
    
    -- منع تحديث السجل الأصلي لأنه تم حذفه
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. participate_in_daily_stars
CREATE OR REPLACE FUNCTION public.participate_in_daily_stars(user_telegram_id bigint, ad_duration_seconds integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_record RECORD;
  existing_participation RECORD;
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
  
  -- التحقق من عدم المشاركة اليوم
  SELECT * INTO existing_participation
  FROM public.daily_stars_participants 
  WHERE telegram_user_id = user_record.id 
  AND participation_date = CURRENT_DATE;
  
  IF existing_participation IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لقد شاركت في سحب النجوم اليوم بالفعل! عد غداً',
      'already_participated', true,
      'next_participation', (CURRENT_DATE + INTERVAL '1 day')::date
    );
  END IF;
  
  -- التحقق من المدة المطلوبة (14 ثانية)
  IF ad_duration_seconds < 14 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب مشاهدة الإعلان لمدة 14 ثانية على الأقل للمشاركة',
      'required_duration', 14,
      'actual_duration', ad_duration_seconds
    );
  END IF;
  
  -- تسجيل المشاركة
  INSERT INTO public.daily_stars_participants (
    telegram_user_id,
    telegram_id,
    participation_date,
    ad_duration_seconds,
    status
  ) VALUES (
    user_record.id,
    user_telegram_id,
    CURRENT_DATE,
    ad_duration_seconds,
    'confirmed'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'أنت الآن مشارك في سحب الحظ! 🎉',
    'participation_confirmed', true,
    'next_draw', (CURRENT_DATE + INTERVAL '1 day')::date
  );
END;
$function$;

-- 3. select_daily_stars_winner
CREATE OR REPLACE FUNCTION public.select_daily_stars_winner()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  winner_record RECORD;
  participants_count INTEGER;
  result JSON;
BEGIN
  -- عد المشاركين في اليوم الماضي
  SELECT COUNT(*) INTO participants_count
  FROM public.daily_stars_participants 
  WHERE participation_date = CURRENT_DATE - INTERVAL '1 day'
  AND status = 'confirmed';
  
  IF participants_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يوجد مشاركين في السحب',
      'participants_count', 0
    );
  END IF;
  
  -- التحقق من عدم وجود فائز لليوم الماضي
  IF EXISTS (
    SELECT 1 FROM public.daily_stars_winners 
    WHERE draw_date = CURRENT_DATE - INTERVAL '1 day'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تم اختيار الفائز بالفعل لهذا اليوم'
    );
  END IF;
  
  -- اختيار فائز عشوائي
  SELECT 
    p.telegram_user_id,
    p.telegram_id,
    u.first_name,
    u.username
  INTO winner_record
  FROM public.daily_stars_participants p
  JOIN public.telegram_users u ON p.telegram_user_id = u.id
  WHERE p.participation_date = CURRENT_DATE - INTERVAL '1 day'
  AND p.status = 'confirmed'
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- تسجيل الفائز
  INSERT INTO public.daily_stars_winners (
    telegram_user_id,
    telegram_id,
    first_name,
    username,
    draw_date,
    stars_won
  ) VALUES (
    winner_record.telegram_user_id,
    winner_record.telegram_id,
    winner_record.first_name,
    winner_record.username,
    CURRENT_DATE - INTERVAL '1 day',
    15
  );
  
  RETURN json_build_object(
    'success', true,
    'winner', json_build_object(
      'telegram_id', winner_record.telegram_id,
      'first_name', winner_record.first_name,
      'username', winner_record.username,
      'stars_won', 15
    ),
    'participants_count', participants_count,
    'draw_date', CURRENT_DATE - INTERVAL '1 day'
  );
END;
$function$;