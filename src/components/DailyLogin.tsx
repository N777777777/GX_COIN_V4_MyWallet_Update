import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gift, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramData } from '@/hooks/useTelegramData';
import { useToast } from '@/hooks/use-toast';

interface DailyLoginProps {
  onRewardClaimed?: (amount: number) => void;
  isEnglish?: boolean;
}

export const DailyLogin = ({ onRewardClaimed, isEnglish = false }: DailyLoginProps) => {
  const { telegramUser } = useTelegramData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  useEffect(() => {
    checkDailyLoginStatus();
  }, [telegramUser?.telegram_id]);

  const checkDailyLoginStatus = async () => {
    if (!telegramUser?.telegram_id) return;

    try {
      // Get user by telegram_id
      const { data: users } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', telegramUser.telegram_id)
        .limit(1);

      if (!users || users.length === 0) return;

      const userId = users[0].id;

      // Check if user already logged in today
      const { data: todayLogin } = await supabase
        .from('daily_logins')
        .select('*')
        .eq('telegram_user_id', userId)
        .eq('login_date', new Date().toISOString().split('T')[0])
        .limit(1);

      if (todayLogin && todayLogin.length > 0) {
        // Already claimed today
        setCanClaim(false);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        setNextClaimTime(tomorrow);
      } else {
        // Can claim today
        setCanClaim(true);
        setNextClaimTime(null);
      }
    } catch (error) {
      console.error('Error checking daily login status:', error);
    }
  };

  const handleDailyLogin = async () => {
    if (!telegramUser?.telegram_id || isLoading) return;

    setIsLoading(true);
    try {
      // Get user by telegram_id
      const { data: users } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', telegramUser.telegram_id)
        .limit(1);

      if (!users || users.length === 0) {
        toast({
          title: t("خطأ", "Error"),
          description: t("لم يتم العثور على بيانات المستخدم", "User data not found"),
          variant: "destructive",
        });
        return;
      }

      const userId = users[0].id;

      // Call the handle_daily_login function
      const { data, error } = await supabase.rpc('handle_daily_login', {
        user_telegram_id: userId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; reward_amount?: number; already_claimed?: boolean; next_claim?: string };

      if (result.success) {
        toast({
          title: t("تم التسجيل بنجاح!", "Logged in successfully!"),
          description: isEnglish ? `${result.reward_amount} points added to your account` : `تم إضافة ${result.reward_amount} نقطة لحسابك`,
        });
        
        setCanClaim(false);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        setNextClaimTime(tomorrow);
        
        if (onRewardClaimed && result.reward_amount) {
          onRewardClaimed(result.reward_amount);
        }
      } else {
        toast({
          title: t("تنبيه", "Warning"),
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error claiming daily login:', error);
      toast({
        title: t("خطأ", "Error"),
        description: t("حدث خطأ أثناء محاولة التسجيل اليومي", "An error occurred while trying to log in daily"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeUntilNextClaim = () => {
    if (!nextClaimTime) return '';
    
    const now = new Date();
    const diff = nextClaimTime.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return isEnglish ? `${hours}h ${minutes}m` : `${hours}س ${minutes}د`;
    }
    return isEnglish ? `${minutes}m` : `${minutes}د`;
  };

  return (
    <Card className="p-4 bg-gradient-card border-border">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{t("التسجيل اليومي", "Daily Login")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("احصل على 0.1 نقطة يومياً", "Get 0.1 points daily")}
          </p>
        </div>
        {canClaim ? (
          <Button 
            onClick={handleDailyLogin}
            disabled={isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? t('جاري...', 'Loading...') : t('استلام', 'Claim')}
          </Button>
        ) : (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{getTimeUntilNextClaim() || t('غداً', 'Tomorrow')}</span>
          </div>
        )}
      </div>
    </Card>
  );
};