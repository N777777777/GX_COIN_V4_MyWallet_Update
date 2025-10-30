-- Final comprehensive fix for backup table security
-- Focus only on backup tables to avoid type mismatches

-- Ensure all backup tables containing personal information are properly secured
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
        -- Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', backup_table);
        
        -- Drop any potentially permissive policies
        EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Anyone can view" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Public can view" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Users can read" ON public.%I', backup_table);
        EXECUTE format('DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.%I', backup_table);
        
    END LOOP;
END $$;

-- Separately handle user_referrals table to avoid type issues
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_referrals' AND table_schema = 'public') THEN
        ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
        
        -- Drop any overly permissive policies
        DROP POLICY IF EXISTS "Public can view referrals" ON public.user_referrals;
        DROP POLICY IF EXISTS "Anyone can view referrals" ON public.user_referrals;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_referrals;
        
        -- Create a simple restrictive policy - only service role access
        DROP POLICY IF EXISTS "Service role only for referrals" ON public.user_referrals;
        CREATE POLICY "Service role only for referrals"
        ON public.user_referrals
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
        
        -- Block all other access
        DROP POLICY IF EXISTS "Block public access to referrals" ON public.user_referrals;
        CREATE POLICY "Block public access to referrals"
        ON public.user_referrals
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Final verification - show security status of all backup and user tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'SECURE ✓'
        ELSE 'VULNERABLE ⚠️'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE '%backup%' 
         OR tablename LIKE '%restore%' 
         OR tablename = 'user_referrals')
ORDER BY tablename;

-- Also check that no policies exist that could allow public access
SELECT 
    pol.schemaname,
    pol.tablename,
    pol.policyname,
    CASE 
        WHEN pol.roles = '{public}' THEN 'POTENTIAL SECURITY RISK'
        WHEN pol.roles = '{authenticated}' THEN 'AUTHENTICATED ONLY'
        WHEN pol.roles = '{service_role}' THEN 'SERVICE ROLE ONLY - SECURE'
        ELSE 'OTHER ROLES'
    END as access_level
FROM pg_policies pol
WHERE pol.schemaname = 'public' 
    AND (pol.tablename LIKE '%backup%' 
         OR pol.tablename LIKE '%restore%'
         OR pol.tablename = 'user_referrals')
ORDER BY pol.tablename, pol.policyname;