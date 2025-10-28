import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Coins, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Add type for ads in window
declare global {
  interface Window {
    show_9602684?: () => Promise<void>;
  }
}
interface DailyTasksProps {
  onReward: (amount: number, currency: 'coins' | 'pepe') => void;
  isEnglish?: boolean;
}
export function DailyTasks({
  onReward,
  isEnglish = false
}: DailyTasksProps) {
  const {
    toast
  } = useToast();
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // Load today's ad views count
  const loadTodayAdsCount = async () => {
    // Check Telegram Web App first
    let telegramId = localStorage.getItem('gcoin_telegram_id');

    // If not in localStorage, try to get it from Telegram WebApp
    if (!telegramId && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      telegramId = (window as any).Telegram.WebApp.initDataUnsafe.user.id.toString();
      localStorage.setItem('gcoin_telegram_id', telegramId);
    }
    if (!telegramId) return;
    try {
      const {
        data: userData
      } = await supabase.from('telegram_users').select('id').eq('telegram_id', parseInt(telegramId)).maybeSingle();
      if (!userData) return;
      const {
        data: adRewards
      } = await supabase.from('daily_ad_rewards').select('ads_watched').eq('user_id', userData.id).eq('date', new Date().toISOString().split('T')[0]).maybeSingle();
      if (adRewards) {
        setAdsWatchedToday(adRewards.ads_watched);
      }
    } catch (error) {
      console.error('Error loading ads count:', error);
    }
  };
  useEffect(() => {
    loadTodayAdsCount();

    // Check ad script loading with fallback
    const checkAdLoad = () => {
      if (typeof window.show_9602684 === 'function') {
        setAdLoaded(true);
        console.log('✅ Ad SDK loaded successfully in DailyTasks');
      } else {
        console.log('⏳ Waiting for Ad SDK to load in DailyTasks...');
        // In production, if script doesn't load within 5 seconds, use internal ads
        const timeout = setTimeout(() => {
          if (typeof window.show_9602684 !== 'function') {
            console.log('⚠️ External Ad SDK failed to load in DailyTasks, using fallback ads');
            setAdLoaded(true); // Allow internal ads
          }
        }, 5000);
        setTimeout(() => {
          if (typeof window.show_9602684 === 'function') {
            clearTimeout(timeout);
            setAdLoaded(true);
            console.log('✅ Ad SDK loaded successfully in DailyTasks');
          } else {
            checkAdLoad();
          }
        }, 1000);
      }
    };

    // Start checking after 1 second of component loading
    setTimeout(checkAdLoad, 1000);

    // Subscribe to real-time updates for daily ad rewards
    const channel = supabase
      .channel('daily-ad-rewards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_ad_rewards'
        },
        () => {
          loadTodayAdsCount();
        }
      )
      .subscribe();

    // Re-check when component becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTodayAdsCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle watching real ad
  const handleWatchAd = async () => {
    if (adsWatchedToday >= 20) {
      toast({
        title: t("وصلت للحد الأقصى", "Reached Maximum"),
        description: t("لقد شاهدت 20 إعلان اليوم بالفعل", "You've watched 20 ads today already"),
        variant: "destructive"
      });
      return;
    }
    if (!adLoaded) {
      toast({
        title: t("الإعلانات غير متاحة", "Ads Not Available"),
        description: t("لم يتم تحميل سكريپت الإعلانات بعد. جرب إعادة تحميل الصفحة", "Ad script not loaded yet. Try refreshing the page"),
        variant: "destructive"
      });
      return;
    }

    // Check Telegram environment
    const isTelegramWebApp = !!(window as any).Telegram?.WebApp;
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!isTelegramWebApp && !storedTelegramId) {
      toast({
        title: t("يجب الدخول عبر البوت", "Must Enter Via Bot"),
        description: t("يجب الدخول للتطبيق عبر بوت التليجرام لمشاهدة الإعلانات", "Must enter the app via Telegram bot to watch ads"),
        variant: "destructive"
      });
      return;
    }
    if (!storedTelegramId) {
      toast({
        title: t("خطأ في تسجيل الدخول", "Login Error"),
        description: t("يرجى تسجيل الدخول مرة أخرى", "Please login again"),
        variant: "destructive"
      });
      return;
    }
    setIsWatchingAd(true);
    try {
      console.log('🎬 Starting daily task ad with show_9602684...');

      // Show real ad
      await window.show_9602684!();
      console.log('✅ Daily task ad completed successfully!');

      // Grant reward after successfully watching the ad
      // Get correct Telegram ID
      let finalTelegramId = storedTelegramId;
      if (!finalTelegramId && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
        finalTelegramId = (window as any).Telegram.WebApp.initDataUnsafe.user.id.toString();
        localStorage.setItem('gcoin_telegram_id', finalTelegramId);
      }
      const {
        data: userData
      } = await supabase.from('telegram_users').select('id, bal_x7k9m').eq('telegram_id', parseInt(finalTelegramId!)).maybeSingle();
      if (userData) {
        const newAdsCount = adsWatchedToday + 1;
        const rewardAmount = 10;

        // Update PEPE balance (obfuscated)
        await supabase.from('telegram_users').update({
          bal_x7k9m: (userData.bal_x7k9m || 0) + rewardAmount // pepe_balance (obfuscated)
        }).eq('id', userData.id);

        // Update ad views count - use upsert with correct criteria
        const today = new Date().toISOString().split('T')[0];
        const {
          data: existingRecord
        } = await supabase.from('daily_ad_rewards').select('id').eq('user_id', userData.id).eq('date', today).maybeSingle();
        if (existingRecord) {
          // Update existing record
          await supabase.from('daily_ad_rewards').update({
            ads_watched: newAdsCount,
            total_pepe_earned: newAdsCount * rewardAmount,
            updated_at: new Date().toISOString()
          }).eq('id', existingRecord.id);
        } else {
          // Create new record
          await supabase.from('daily_ad_rewards').insert({
            user_id: userData.id,
            user_telegram_id: parseInt(finalTelegramId!),
            ads_watched: newAdsCount,
            total_pepe_earned: newAdsCount * rewardAmount,
            date: today
          });
        }
        setAdsWatchedToday(newAdsCount);
        onReward(rewardAmount, 'pepe');
        toast({
          title: t("مكافأة مستلمة! 🎉", "Reward Received! 🎉"),
          description: t(`حصلت على ${rewardAmount} PEPE من مشاهدة الإعلان`, `You got ${rewardAmount} PEPE from watching the ad`)
        });
      }
    } catch (error) {
      console.error('❌ Daily task ad error:', error);

      // Check error type for more accurate message
      let errorMessage = t("يجب عليك مشاهدة الإعلان كاملاً للحصول على المكافأة", "You must watch the entire ad to get the reward");
      if (error && typeof error === 'object') {
        if (error.toString().includes('timeout')) {
          errorMessage = t("انتهت صلاحية الإعلان. حاول مرة أخرى", "Ad timeout. Please try again");
        } else if (error.toString().includes('network')) {
          errorMessage = t("مشكلة في الاتصال. تحقق من الإنترنت", "Network issue. Check your internet connection");
        }
      }
      toast({
        title: t("👀 لم تكمل مشاهدة الإعلان", "👀 Ad Not Completed"),
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsWatchingAd(false);
    }
  };
  return <div className="space-y-4">
      

      <div className="grid gap-4">
        <Card className="bg-gradient-to-br from-card/50 to-card border border-border/50 hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {t('مشاهدة الإعلانات', 'Watch Ads')}
                  </h3>
                  
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                
                <span className="text-lg font-bold text-foreground">
                  10 PEPE {t('لكل إعلان', 'per ad')}
                </span>
              </div>
              
              <Button size="lg" disabled={adsWatchedToday >= 20 || !adLoaded || isWatchingAd} onClick={handleWatchAd} className="px-6">
                {isWatchingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : !adLoaded ? <Loader2 className="w-4 h-4 animate-spin" /> : adsWatchedToday >= 20 ? <></> : <Play className="w-4 h-4" />}
              </Button>
            </div>

            {/* Progress bar */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{t("التقدم اليومي", "Daily Progress")}</span>
                <span>{adsWatchedToday}/20</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-300" style={{
                width: `${adsWatchedToday / 20 * 100}%`
              }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{t("مشاهد", "Watched")}: {adsWatchedToday}</span>
                <span>{t("متبقي", "Remaining")}: {20 - adsWatchedToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional statistics */}
        
      </div>
    </div>;
}