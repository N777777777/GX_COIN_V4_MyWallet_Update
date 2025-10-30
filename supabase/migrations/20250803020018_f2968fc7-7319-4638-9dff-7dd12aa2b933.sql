-- Update default reward amount for daily logins from 0.3 to 0.1
ALTER TABLE public.daily_logins ALTER COLUMN reward_amount SET DEFAULT 0.1;