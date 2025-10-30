-- CRITICAL SECURITY FIX: Secure ton_purchases table (fixed)
-- Remove ALL existing policies first

-- Drop all existing policies
DROP POLICY IF EXISTS "Service role can manage all TON purchases" ON public.ton_purchases;
DROP POLICY IF EXISTS "Service role can manage all purchases" ON public.ton_purchases;
DROP POLICY IF EXISTS "Service role manages ton_purchases" ON public.ton_purchases;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.ton_purchases;
DROP POLICY IF EXISTS "Users can create their own purchases" ON public.ton_purchases;

-- Create secure policies that protect user privacy

-- Block all unauthorized access first
CREATE POLICY "Block unauthorized access to purchase data" 
ON public.ton_purchases 
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);

-- Allow users to view ONLY their own purchase data with session validation
CREATE POLICY "Authenticated users can view only their own purchases" 
ON public.ton_purchases 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_sessions s 
        WHERE s.telegram_user_id = ton_purchases.telegram_user_id 
        AND COALESCE(s.is_active, true) = true 
        AND (s.expires_at IS NULL OR s.expires_at > now()) 
        AND s.session_token = public.get_request_header('x-session-token')
    )
);

-- Allow users to create their own purchase records with session validation
CREATE POLICY "Authenticated users can create their own purchases" 
ON public.ton_purchases 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.user_sessions s 
        WHERE s.telegram_user_id = ton_purchases.telegram_user_id 
        AND COALESCE(s.is_active, true) = true 
        AND (s.expires_at IS NULL OR s.expires_at > now()) 
        AND s.session_token = public.get_request_header('x-session-token')
    )
);

-- Service role maintains full access for admin operations
CREATE POLICY "Service role full access to purchases" 
ON public.ton_purchases 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);