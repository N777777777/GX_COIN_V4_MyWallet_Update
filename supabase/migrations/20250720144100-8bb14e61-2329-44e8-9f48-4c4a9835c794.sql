-- إنشاء دالة لزيادة عدد المشاركين في السحب
CREATE OR REPLACE FUNCTION increment_draw_participants(draw_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- زيادة عدد المشاركين بـ 1
  UPDATE public.lucky_draws 
  SET total_participants = total_participants + 1
  WHERE id = draw_id_param;
END;
$$;