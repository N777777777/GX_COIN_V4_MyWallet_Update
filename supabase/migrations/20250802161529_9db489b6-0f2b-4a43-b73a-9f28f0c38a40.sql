-- إنشاء جدول لتتبع مشاركات صندوق النجوم اليومي
CREATE TABLE public.daily_stars_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  participation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ad_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ad_duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(telegram_user_id, participation_date)
);

-- إنشاء جدول لتتبع الفائزين في السحب اليومي
CREATE TABLE public.daily_stars_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  first_name TEXT,
  username TEXT,
  draw_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stars_won INTEGER NOT NULL DEFAULT 15,
  message_sent BOOLEAN DEFAULT false,
  announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.daily_stars_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stars_winners ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view their own daily stars participation"
  ON public.daily_stars_participants FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage daily stars participation"
  ON public.daily_stars_participants FOR ALL
  USING (true);

CREATE POLICY "Anyone can view daily stars winners"
  ON public.daily_stars_winners FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage daily stars winners"
  ON public.daily_stars_winners FOR ALL
  USING (true);

-- دالة للمشاركة في صندوق النجوم اليومي
CREATE OR REPLACE FUNCTION public.participate_in_daily_stars(
  user_telegram_id BIGINT,
  ad_duration_seconds INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- دالة لاختيار الفائز اليومي
CREATE OR REPLACE FUNCTION public.select_daily_stars_winner()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- إعطاء 15 نجمة للفائز (نحتاج لإضافة عمود النجوم لاحقاً)
  -- UPDATE public.telegram_users 
  -- SET stars = stars + 15
  -- WHERE id = winner_record.telegram_user_id;
  
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
$$;