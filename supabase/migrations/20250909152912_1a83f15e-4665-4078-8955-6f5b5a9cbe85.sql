-- Fix the backup table security issue properly
-- First, let's focus on the backup tables that definitely exist and secure them

-- Comprehensive security fix for all backup tables containing personal information
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
        EXECUTE format('DROP POLICY IF EXISTS "Public can view" ON public.%I', backup_table);
        
        -- Ensure our restrictive policies exist
        BEGIN
            EXECUTE format('CREATE POLICY "Service role only access to %s"
                ON public.%I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true)', backup_table, backup_table);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Policy already exists
        END;
        
        BEGIN
            EXECUTE format('CREATE POLICY "Block all public access to %s"
                ON public.%I
                FOR ALL
                TO public
                USING (false)
                WITH CHECK (false)', backup_table, backup_table);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Policy already exists
        END;
        
    END LOOP;
END $$;

-- Let's check for user_referrals table and secure it properly based on actual column structure
DO $$
DECLARE
    referrer_col TEXT;
    referred_col TEXT;
BEGIN
    -- Check if user_referrals table exists and get correct column names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_referrals' AND table_schema = 'public') THEN
        
        -- Find the correct column names for referrer and referred user
        SELECT column_name INTO referrer_col 
        FROM information_schema.columns 
        WHERE table_name = 'user_referrals' 
        AND table_schema = 'public' 
        AND column_name LIKE '%referrer%'
        LIMIT 1;
        
        SELECT column_name INTO referred_col 
        FROM information_schema.columns 
        WHERE table_name = 'user_referrals' 
        AND table_schema = 'public' 
        AND column_name LIKE '%referred%'
        LIMIT 1;
        
        -- Enable RLS
        ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
        
        -- Drop overly permissive policies
        DROP POLICY IF EXISTS "Public can view referrals" ON public.user_referrals;
        DROP POLICY IF EXISTS "Anyone can view referrals" ON public.user_referrals;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_referrals;
        
        -- If we found the columns, create appropriate policy
        IF referrer_col IS NOT NULL AND referred_col IS NOT NULL THEN
            DROP POLICY IF EXISTS "Users can view their own referrals" ON public.user_referrals;
            EXECUTE format('CREATE POLICY "Users can view their own referrals"
                ON public.user_referrals
                FOR SELECT
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM public.user_sessions s
                        WHERE (s.telegram_user_id = user_referrals.%I OR s.telegram_user_id = user_referrals.%I)
                          AND COALESCE(s.is_active, true) = true
                          AND (s.expires_at IS NULL OR s.expires_at > now())
                          AND s.session_token = public.get_request_header(''x-session-token'')
                    )
                )', referrer_col, referred_col);
        ELSE
            -- Fallback: block all access if we can't determine column structure
            DROP POLICY IF EXISTS "Block all access to referrals" ON public.user_referrals;
            CREATE POLICY "Block all access to referrals"
            ON public.user_referrals
            FOR ALL
            TO authenticated
            USING (false)
            WITH CHECK (false);
        END IF;
        
        -- Always block public access
        DROP POLICY IF EXISTS "Block public access to referrals" ON public.user_referrals;
        CREATE POLICY "Block public access to referrals"
        ON public.user_referrals
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Verify all backup tables now have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled ✓'
        ELSE 'RLS DISABLED ⚠️ SECURITY RISK'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE '%backup%' 
         OR tablename LIKE '%restore%')
ORDER BY tablename;