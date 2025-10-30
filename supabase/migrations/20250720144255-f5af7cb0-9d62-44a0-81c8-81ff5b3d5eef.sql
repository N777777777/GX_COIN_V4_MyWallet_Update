-- إضافة unique constraint لمنع المشاركة المتكررة
ALTER TABLE public.lucky_draw_participants 
ADD CONSTRAINT unique_draw_participant 
UNIQUE (draw_id, telegram_user_id);