-- Comprehensive security audit and fix for all backup tables containing personal information
-- Ensure no backup tables are publicly accessible

-- Check and secure any remaining backup tables that might contain personal data
-- First, let's check if there are any tables we missed

-- Enable RLS on any backup tables that might not have it enabled
DO $$
DECLARE
    backup_table TEXT;
    backup_tables TEXT[] := ARRAY[
        'coins_restore_24_july_23utc_backup',
        'current_state_backup_before_july25_restore', 
        'current_state_backup_emergency',
        'final_coins_fix_backup',
        'final_restoration_current_backup',
        'p2p_buyers_restoration_backup'
    ];
BEGIN
    FOREACH backup_table IN ARRAY backup_tables
    LOOP
        -- Ensure RLS is enabled (safe to run multiple times)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', backup_table);
        
        -- Drop any overly permissive policies that might exist
        EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Anyone can view" ON public.%I', backup_table);
        
        -- Create strict service-role only policy if it doesn't exist
        BEGIN
            EXECUTE format('CREATE POLICY "Service role only access to %s"
                ON public.%I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true)', backup_table, backup_table);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Policy already exists, skip
                NULL;
        END;
        
        -- Create explicit block policy for public access if it doesn't exist
        BEGIN
            EXECUTE format('CREATE POLICY "Block all public access to %s"
                ON public.%I
                FOR ALL
                TO public
                USING (false)
                WITH CHECK (false)', backup_table, backup_table);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Policy already exists, skip
                NULL;
        END;
        
    END LOOP;
END $$;

-- Also check for any additional tables that might contain personal information
-- Let's be extra thorough and check user_referrals, referral_earnings, and other user data tables

-- Secure user_referrals table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_referrals' AND table_schema = 'public') THEN
        ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
        
        -- Drop overly permissive policies
        DROP POLICY IF EXISTS "Public can view referrals" ON public.user_referrals;
        DROP POLICY IF EXISTS "Anyone can view referrals" ON public.user_referrals;
        
        -- Users can only see their own referral data
        DROP POLICY IF EXISTS "Users can view their own referrals" ON public.user_referrals;
        CREATE POLICY "Users can view their own referrals"
        ON public.user_referrals
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_sessions s
                WHERE (s.telegram_user_id = user_referrals.referrer_id OR s.telegram_user_id = user_referrals.referred_id)
                  AND COALESCE(s.is_active, true) = true
                  AND (s.expires_at IS NULL OR s.expires_at > now())
                  AND s.session_token = public.get_request_header('x-session-token')
            )
        );
        
        -- Block public access
        DROP POLICY IF EXISTS "Block public access to referrals" ON public.user_referrals;
        CREATE POLICY "Block public access to referrals"
        ON public.user_referrals
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Secure referral_earnings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_earnings' AND table_schema = 'public') THEN
        ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
        
        -- Drop overly permissive policies
        DROP POLICY IF EXISTS "Public can view earnings" ON public.referral_earnings;
        DROP POLICY IF EXISTS "Anyone can view earnings" ON public.referral_earnings;
        
        -- Users can only see their own earnings
        DROP POLICY IF EXISTS "Users can view their own earnings" ON public.referral_earnings;
        CREATE POLICY "Users can view their own earnings"
        ON public.referral_earnings
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_sessions s
                WHERE s.telegram_user_id = referral_earnings.referrer_id
                  AND COALESCE(s.is_active, true) = true
                  AND (s.expires_at IS NULL OR s.expires_at > now())
                  AND s.session_token = public.get_request_header('x-session-token')
            )
        );
        
        -- Block public access
        DROP POLICY IF EXISTS "Block public access to earnings" ON public.referral_earnings;
        CREATE POLICY "Block public access to earnings"
        ON public.referral_earnings
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Double-check that all potentially sensitive tables have proper RLS
-- Create a comprehensive list and verify each one

-- Test that backup tables are properly secured by checking policies
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled ✓'
        ELSE 'RLS DISABLED ⚠️'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE '%backup%' 
         OR tablename LIKE '%restore%'
         OR tablename IN ('user_referrals', 'referral_earnings'))
ORDER BY tablename;