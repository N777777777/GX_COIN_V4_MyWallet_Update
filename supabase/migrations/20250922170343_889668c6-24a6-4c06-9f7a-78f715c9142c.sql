-- إنشاء جدول الألغاز اليومية
CREATE TABLE public.daily_puzzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  option_1 TEXT NOT NULL,
  option_2 TEXT NOT NULL,
  option_3 TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.telegram_users(id),
  puzzle_date DATE DEFAULT CURRENT_DATE
);

-- إنشاء جدول إجابات المستخدمين للألغاز
CREATE TABLE public.puzzle_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL REFERENCES public.telegram_users(id),
  puzzle_id UUID NOT NULL REFERENCES public.daily_puzzles(id),
  user_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  coins_spent NUMERIC NOT NULL DEFAULT 10,
  reward_earned NUMERIC NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(telegram_user_id, answer_date)
);

-- تمكين Row Level Security
ALTER TABLE public.daily_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puzzle_answers ENABLE ROW LEVEL SECURITY;

-- سياسات للألغاز اليومية
CREATE POLICY "Anyone can view active puzzles" 
ON public.daily_puzzles 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Service role can manage puzzles" 
ON public.daily_puzzles 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- سياسات لإجابات الألغاز
CREATE POLICY "Users can view their own answers" 
ON public.puzzle_answers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_sessions s
  WHERE s.telegram_user_id = puzzle_answers.telegram_user_id
  AND COALESCE(s.is_active, true) = true
  AND (s.expires_at IS NULL OR s.expires_at > now())
  AND s.session_token = get_request_header('x-session-token')
));

CREATE POLICY "Users can submit their own answers" 
ON public.puzzle_answers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage puzzle answers" 
ON public.puzzle_answers 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- إدراج بعض الألغاز الأولية
INSERT INTO public.daily_puzzles (question, option_1, option_2, option_3, correct_answer) VALUES
('ما هي عاصمة فرنسا؟', 'لندن', 'برلين', 'باريس', 2),
('كم عدد قارات العالم؟', '5', '7', '6', 1),
('ما هو أكبر كوكب في النظام الشمسي؟', 'المشتري', 'زحل', 'الأرض', 0),
('في أي عام وصل الإنسان لأول مرة إلى القمر؟', '1969', '1967', '1971', 0),
('ما هو أطول نهر في العالم؟', 'النيل', 'الأمازون', 'اليانغتسي', 0);

-- دالة لاختيار الغز اليومي
CREATE OR REPLACE FUNCTION public.get_daily_puzzle()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  puzzle_record RECORD;
  puzzle_count INTEGER;
  day_index INTEGER;
BEGIN
  -- عد الألغاز النشطة
  SELECT COUNT(*) INTO puzzle_count
  FROM public.daily_puzzles
  WHERE is_active = true;
  
  IF puzzle_count = 0 THEN
    RETURN json_build_object('success', false, 'message', 'لا توجد ألغاز نشطة');
  END IF;
  
  -- حساب فهرس اليوم
  day_index := EXTRACT(DOY FROM CURRENT_DATE)::INTEGER % puzzle_count;
  
  -- اختيار الغز بناءً على اليوم
  SELECT * INTO puzzle_record
  FROM public.daily_puzzles
  WHERE is_active = true
  ORDER BY created_at
  OFFSET day_index
  LIMIT 1;
  
  RETURN json_build_object(
    'success', true,
    'puzzle', json_build_object(
      'id', puzzle_record.id,
      'question', puzzle_record.question,
      'options', json_build_array(
        puzzle_record.option_1,
        puzzle_record.option_2,
        puzzle_record.option_3
      ),
      'correct_answer', puzzle_record.correct_answer
    )
  );
END;
$function$;

-- دالة لإرسال إجابة الغز
CREATE OR REPLACE FUNCTION public.submit_puzzle_answer(
  p_telegram_id BIGINT,
  p_puzzle_id UUID,
  p_user_answer INTEGER
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  puzzle_record RECORD;
  is_correct BOOLEAN;
  g_coin_reward NUMERIC := 0;
  new_coins NUMERIC;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record
  FROM public.telegram_users
  WHERE telegram_id = p_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- التحقق من الرصيد
  IF user_record.coins < 10 THEN
    RETURN json_build_object('success', false, 'message', 'رصيد غير كافي');
  END IF;
  
  -- التحقق من عدم الإجابة اليوم
  IF EXISTS (
    SELECT 1 FROM public.puzzle_answers
    WHERE telegram_user_id = user_record.id
    AND answer_date = CURRENT_DATE
  ) THEN
    RETURN json_build_object('success', false, 'message', 'لقد أجبت على الغز اليوم بالفعل');
  END IF;
  
  -- البحث عن الغز
  SELECT * INTO puzzle_record
  FROM public.daily_puzzles
  WHERE id = p_puzzle_id AND is_active = true;
  
  IF puzzle_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'الغز غير موجود');
  END IF;
  
  -- التحقق من صحة الإجابة
  is_correct := (p_user_answer = puzzle_record.correct_answer);
  
  -- حساب المكافأة
  IF is_correct THEN
    g_coin_reward := 1;
  END IF;
  
  -- خصم 10 عملات وإضافة المكافأة
  new_coins := user_record.coins - 10 + g_coin_reward;
  
  -- تحديث رصيد المستخدم
  UPDATE public.telegram_users
  SET coins = new_coins
  WHERE id = user_record.id;
  
  -- تسجيل الإجابة
  INSERT INTO public.puzzle_answers (
    telegram_user_id,
    puzzle_id,
    user_answer,
    is_correct,
    coins_spent,
    reward_earned
  ) VALUES (
    user_record.id,
    p_puzzle_id,
    p_user_answer,
    is_correct,
    10,
    g_coin_reward
  );
  
  RETURN json_build_object(
    'success', true,
    'is_correct', is_correct,
    'reward_earned', g_coin_reward,
    'correct_answer', CASE WHEN NOT is_correct THEN puzzle_record.correct_answer ELSE NULL END,
    'correct_option', CASE 
      WHEN NOT is_correct THEN 
        CASE puzzle_record.correct_answer
          WHEN 0 THEN puzzle_record.option_1
          WHEN 1 THEN puzzle_record.option_2
          WHEN 2 THEN puzzle_record.option_3
        END
      ELSE NULL
    END
  );
END;
$function$;

-- دالة للتحقق من إجابة المستخدم اليوم
CREATE OR REPLACE FUNCTION public.check_user_puzzle_answer(p_telegram_id BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  answer_record RECORD;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record
  FROM public.telegram_users
  WHERE telegram_id = p_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- البحث عن إجابة اليوم
  SELECT * INTO answer_record
  FROM public.puzzle_answers
  WHERE telegram_user_id = user_record.id
  AND answer_date = CURRENT_DATE;
  
  IF answer_record IS NULL THEN
    RETURN json_build_object('success', true, 'has_answered', false);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'has_answered', true,
    'is_correct', answer_record.is_correct,
    'reward_earned', answer_record.reward_earned
  );
END;
$function$;