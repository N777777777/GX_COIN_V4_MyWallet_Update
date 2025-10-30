-- تمكين RLS على الجداول المطلوبة التي تفتقر إليه

-- تمكين RLS على جداول النسخ الاحتياطية
ALTER TABLE public.coins_restore_24_july_23utc_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_state_backup_before_july25_restore ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_state_backup_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_coins_fix_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_restoration_current_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_buyers_restoration_backup ENABLE ROW LEVEL SECURITY;

-- هذه الجداول لها سياسات موجودة بالفعل تمنع الوصول العام
-- فقط نحتاج لتمكين RLS عليها