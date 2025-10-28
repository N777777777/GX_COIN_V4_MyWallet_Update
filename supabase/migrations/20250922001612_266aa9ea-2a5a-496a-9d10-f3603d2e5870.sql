-- إضافة قيد فريد على telegram_id في جدول user_verification لضمان عمل ON CONFLICT

ALTER TABLE public.user_verification 
ADD CONSTRAINT user_verification_telegram_id_unique 
UNIQUE (telegram_id);