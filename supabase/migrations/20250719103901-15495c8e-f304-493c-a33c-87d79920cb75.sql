-- إضافة علاقة foreign key بين ton_withdrawals و telegram_users
ALTER TABLE public.ton_withdrawals 
ADD CONSTRAINT fk_ton_withdrawals_telegram_user 
FOREIGN KEY (telegram_user_id) REFERENCES public.telegram_users(id) ON DELETE CASCADE;