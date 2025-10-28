-- إنشاء edge function لإرجاع العملات المجمدة في P2P عند انتهاء المنصة
CREATE OR REPLACE FUNCTION public.return_frozen_p2p_balances()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  total_returned INTEGER := 0;
  order_record RECORD;
  frozen_record RECORD;
BEGIN
  -- الحصول على جميع الطلبات النشطة
  FOR order_record IN 
    SELECT * FROM public.p2p_orders 
    WHERE status IN ('active', 'partially_filled')
  LOOP
    -- البحث عن الرصيد المجمد لهذا الطلب
    SELECT * INTO frozen_record
    FROM public.frozen_balances
    WHERE order_id = order_record.id;
    
    IF frozen_record IS NOT NULL THEN
      -- إرجاع الرصيد للمستخدم
      IF frozen_record.balance_type = 'coins' THEN
        UPDATE public.telegram_users 
        SET coins = coins + frozen_record.amount
        WHERE id = frozen_record.user_id;
      ELSE
        UPDATE public.telegram_users 
        SET ton_balance = ton_balance + frozen_record.amount
        WHERE id = frozen_record.user_id;
      END IF;
      
      -- حذف الرصيد المجمد
      DELETE FROM public.frozen_balances WHERE id = frozen_record.id;
      
      total_returned := total_returned + 1;
    END IF;
    
    -- تحديث حالة الطلب إلى منتهي
    UPDATE public.p2p_orders 
    SET status = 'expired', updated_at = now()
    WHERE id = order_record.id;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إرجاع جميع الأرصدة المجمدة',
    'returned_orders', total_returned
  );
END;
$function$;