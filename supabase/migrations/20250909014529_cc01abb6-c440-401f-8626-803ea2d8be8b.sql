-- Remove the dangerous policy that allows public read access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.telegram_users;
DROP POLICY IF EXISTS "Only service role can insert telegram_users" ON public.telegram_users;

-- Ensure we have proper restrictive policies only
-- Policy 1: Users can only view their own data with valid session
-- Policy 2: Users can only update their own data with valid session  
-- Policy 3: Allow creating new users (for bootstrapping new Telegram users)
-- Policy 4: Service role has full access (for edge functions)

-- The existing correct policies should remain:
-- "Users can view own telegram_users row" - already exists
-- "Users can update own telegram_users row" - already exists  
-- "Users can create telegram_users (bootstrap)" - already exists
-- "Service role can manage telegram_users" - already exists

-- Verify no public access policies remain by checking the current policies
SELECT pol.policyname, pol.cmd, pol.permissive, pol.qual 
FROM pg_policies pol 
WHERE pol.schemaname = 'public' AND pol.tablename = 'telegram_users';