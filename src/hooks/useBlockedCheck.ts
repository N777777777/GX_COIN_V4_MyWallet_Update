import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTelegramData } from './useTelegramData';

/**
 * Hook للتحقق من حالة حظر المستخدم
 * يقوم بإعادة توجيه المستخدمين المحظورين تلقائياً
 */
export const useBlockedCheck = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();

  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!telegramUser?.telegram_id) return;

      try {
        const { data, error } = await supabase
          .from('telegram_users')
          .select('status')
          .eq('telegram_id', telegramUser.telegram_id)
          .single();

        if (error) {
          console.error('Error checking blocked status:', error);
          return;
        }

        if ((data as any)?.status === 'banned') {
          toast({
            title: "تم حظر حسابك",
            description: "للأسف، تم حظر حسابك من قبل الإدارة. لا يمكنك الوصول إلى هذه الخدمة.",
            variant: "destructive",
            duration: 5000
          });
          
          navigate('/blocked', { replace: true });
        }
      } catch (error) {
        console.error('Error in blocked check:', error);
      }
    };

    checkBlockedStatus();

    // الاستماع للتحديثات في الوقت الفعلي
    if (telegramUser?.telegram_id) {
      const channel = supabase
        .channel('blocked-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'telegram_users',
            filter: `telegram_id=eq.${telegramUser.telegram_id}`
          },
          (payload: any) => {
            if (payload.new.status === 'banned') {
              toast({
                title: "تم حظر حسابك",
                description: "تم حظر حسابك من قبل الإدارة.",
                variant: "destructive",
                duration: 5000
              });
              navigate('/blocked', { replace: true });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [telegramUser?.telegram_id, navigate, toast]);
};
