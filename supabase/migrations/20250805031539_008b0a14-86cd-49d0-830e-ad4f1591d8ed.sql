-- Fix the daily login reward amount to be 0.1 instead of 0.3
CREATE OR REPLACE FUNCTION public.handle_daily_login(user_telegram_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    login_record RECORD;
    reward_amount NUMERIC := 0.1; -- Fixed to 0.1 instead of 0.3
BEGIN
    -- Check if user already logged in today
    SELECT * INTO login_record
    FROM daily_logins
    WHERE telegram_user_id = user_telegram_id
    AND login_date = CURRENT_DATE;
    
    -- If already logged in today, return message
    IF login_record.id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'تم التسجيل اليوم بالفعل',
            'already_claimed', true,
            'next_claim', (CURRENT_DATE + INTERVAL '1 day')::text
        );
    END IF;
    
    -- Insert daily login record
    INSERT INTO daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_telegram_id, CURRENT_DATE, reward_amount);
    
    -- Update user's coins
    UPDATE telegram_users 
    SET coins = coins + reward_amount,
        updated_at = NOW()
    WHERE id = user_telegram_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'تم التسجيل بنجاح!',
        'reward_amount', reward_amount,
        'already_claimed', false
    );
END;
$$;