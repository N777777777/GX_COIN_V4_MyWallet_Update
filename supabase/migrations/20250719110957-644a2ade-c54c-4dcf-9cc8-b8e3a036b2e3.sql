-- إنشاء جدول طلبات السحب المعلقة
CREATE TABLE public.pending_ton_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewer_notes text,
  reviewed_at timestamp with time zone
);

-- إنشاء جدول طلبات السحب المكتملة
CREATE TABLE public.completed_ton_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  transaction_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewer_notes text
);

-- تفعيل RLS للجدولين
ALTER TABLE public.pending_ton_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_ton_withdrawals ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للطلبات المعلقة
CREATE POLICY "Users can view their own pending withdrawals" 
ON public.pending_ton_withdrawals 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create pending withdrawals" 
ON public.pending_ton_withdrawals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update pending withdrawals" 
ON public.pending_ton_withdrawals 
FOR UPDATE 
USING (true);

-- سياسات الأمان للطلبات المكتملة
CREATE POLICY "Users can view their own completed withdrawals" 
ON public.completed_ton_withdrawals 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage completed withdrawals" 
ON public.completed_ton_withdrawals 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- نقل البيانات الموجودة
INSERT INTO public.pending_ton_withdrawals (
  telegram_user_id, wallet_address, amount, status, created_at
)
SELECT telegram_user_id, wallet_address, amount, status, created_at
FROM public.ton_withdrawals 
WHERE status = 'pending';

INSERT INTO public.completed_ton_withdrawals (
  telegram_user_id, wallet_address, amount, status, transaction_hash, created_at, completed_at
)
SELECT telegram_user_id, wallet_address, amount, status, transaction_hash, created_at, 
       COALESCE(completed_at, created_at)
FROM public.ton_withdrawals 
WHERE status IN ('completed', 'failed');

-- إنشاء trigger لنقل الطلبات من المعلقة للمكتملة
CREATE OR REPLACE FUNCTION public.move_withdrawal_to_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- التحقق من أن الحالة تغيرت إلى completed أو failed
  IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
    
    -- إدراج الطلب في جدول الطلبات المكتملة
    INSERT INTO public.completed_ton_withdrawals (
      telegram_user_id,
      wallet_address,
      amount,
      status,
      transaction_hash,
      created_at,
      completed_at,
      reviewer_notes
    ) VALUES (
      NEW.telegram_user_id,
      NEW.wallet_address,
      NEW.amount,
      NEW.status,
      NEW.reviewer_notes, -- استخدام reviewer_notes كـ transaction_hash مؤقتاً
      OLD.created_at,
      COALESCE(NEW.reviewed_at, NOW()),
      NEW.reviewer_notes
    );
    
    -- حذف الطلب من جدول الطلبات المعلقة
    DELETE FROM public.pending_ton_withdrawals WHERE id = NEW.id;
    
    -- منع تحديث السجل الأصلي لأنه تم حذفه
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- إنشاء trigger
CREATE TRIGGER move_pending_withdrawal_to_completed
  BEFORE UPDATE ON public.pending_ton_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.move_withdrawal_to_completed();

-- إضافة trigger للتحديث التلقائي للوقت
CREATE TRIGGER update_pending_ton_withdrawals_updated_at
  BEFORE UPDATE ON public.pending_ton_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();