-- إنشاء trigger لمعالجة الإيداعات تلقائياً عند تغيير الحالة
CREATE OR REPLACE FUNCTION public.handle_deposit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق إذا تم تغيير الحالة إلى verified أو completed
  IF NEW.status IN ('verified', 'completed') AND OLD.status != NEW.status THEN
    -- إضافة الرصيد للمستخدم إذا لم يتم إضافته من قبل
    IF OLD.status NOT IN ('verified', 'completed') THEN
      -- إضافة الرصيد للمستخدم
      UPDATE public.telegram_users 
      SET ton_balance = ton_balance + NEW.amount
      WHERE id = NEW.telegram_user_id;
      
      -- إنشاء سجل في جدول المشتريات
      INSERT INTO public.ton_purchases (
        telegram_user_id,
        ton_amount,
        coin_amount,
        transaction_hash,
        status,
        verified,
        verification_status,
        completed_at
      ) VALUES (
        NEW.telegram_user_id,
        NEW.amount,
        0,
        NEW.transaction_hash,
        'completed',
        true,
        'verified',
        now()
      );
    END IF;
    
    -- تحديث وقت التحقق
    NEW.verified_at = COALESCE(NEW.verified_at, now());
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء الـ trigger
CREATE TRIGGER trigger_deposit_status_change
  BEFORE UPDATE ON public.pending_ton_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deposit_status_change();