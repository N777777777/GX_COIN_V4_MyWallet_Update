-- Remove the problematic "Enable access for all users" policy from user_referrals
-- This policy is flagged as a security risk

DROP POLICY IF EXISTS "Enable access for all users" ON public.user_referrals;

-- Verify all backup tables are now fully secure
-- Check that only service role policies exist and public access is blocked
SELECT 
    pol.schemaname,
    pol.tablename,
    pol.policyname,
    CASE 
        WHEN pol.policyname LIKE '%Block%' AND pol.roles = '{public}' THEN 'BLOCKING PUBLIC ACCESS ✓'
        WHEN pol.roles = '{service_role}' THEN 'SERVICE ROLE ONLY ✓'
        WHEN pol.roles = '{public}' AND pol.policyname NOT LIKE '%Block%' THEN '⚠️ SECURITY RISK - ALLOWS PUBLIC ACCESS'
        WHEN pol.roles = '{authenticated}' THEN 'AUTHENTICATED ONLY'
        ELSE 'OTHER ROLES'
    END as security_status
FROM pg_policies pol
WHERE pol.schemaname = 'public' 
    AND (pol.tablename LIKE '%backup%' 
         OR pol.tablename LIKE '%restore%'
         OR pol.tablename = 'user_referrals')
ORDER BY pol.tablename, pol.policyname;

-- Final summary report
SELECT 
    'BACKUP TABLES SECURITY AUDIT' as report_type,
    COUNT(*) as total_backup_tables,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as vulnerable_tables
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE '%backup%' OR tablename LIKE '%restore%');