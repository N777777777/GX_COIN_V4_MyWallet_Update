import { useState, useEffect, useCallback } from "react";
import coinLogo from "@/assets/1000006763.png";

// إضافة نوع للإعلانات في window
declare global {
  interface Window {
    show_9602684?: () => Promise<void>;
    libtl?: any; // للتحقق من تحميل مكتبة الإعلانات
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Coins, Zap, Settings, Trophy, ShoppingCart, Volume2, VolumeX, Pause, Play, RefreshCw, User, Gift, CheckCircle, Clock, XCircle, Target, Users, Wallet, TrendingUp, Home, Briefcase, Star, Send, ArrowUpDown, ArrowRightLeft, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EnergyBar } from "./EnergyBar";
import { UpgradeShop } from "./UpgradeShop";
import { Stats } from "./Stats";
import { Tasks } from "./Tasks";
import { Campaigns } from "./Campaigns";
import { Referrals } from "./Referrals";
import { QualificationStatus } from "./QualificationStatus";
import { DailyLogin } from "./DailyLogin";
import { CountdownTimer } from "./CountdownTimer";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useHourlyProfit } from "@/hooks/useHourlyProfit";
import { useBlockedCheck } from "@/hooks/useBlockedCheck";
import WalletComponent from "./WalletComponent";
import { supabase } from "@/integrations/supabase/client";
// تم إزالة استيراد useMarketValue
import { AdWarningDialog } from "./AdWarningDialog";
import { AdViewer } from "./AdViewer";
import OffersComponent from "./OffersComponent";
import { QualificationTasks } from "./QualificationTasks";
import { UpgradeCards } from "./UpgradeCards";
import { PepeBalance } from "./PepeBalance";
import { WalletConnect } from "./WalletConnect";
import { TappableCoin } from "./TappableCoin";
import { SwapComponent } from "./SwapComponent";
import AlphaPlatform from "./AlphaPlatform";
import { PartnershipRequestForm } from "./PartnershipRequestForm";
import clickSound from "@/assets/assets_sounds_click.mp3";
interface GameState {
  alpha_coins: number; // Renamed from coins to alpha_coins
  energy: number;
  maxEnergy: number;
  coinsPerTap: number;
  energyRechargeRate: number;
  totalTaps: number;
  playTime: number;
  soundEnabled: boolean;
  isPaused: boolean;
}
interface AdCheckResult {
  success: boolean;
  qualification_won?: boolean;
  views_today?: number;
  remaining_views?: number;
  message?: string;
  max_reached?: boolean;
}
export function TapGame() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // فحص حالة الحظر
  useBlockedCheck();
  
  const {
    telegramUser,
    loading,
    error,
    updateUserStats,
    purchaseUpgrade,
    completeTask
  } = useTelegramData();

  // استخدام نظام الربح بالساعة (سيتم حساب القيمة لاحقاً)
  const {
    isActive
  } = useHourlyProfit(telegramUser?.telegram_id, 0);

  // تم إزالة استخدام القيمة السوقية
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedSound = localStorage.getItem('sound_enabled');
    return {
      alpha_coins: 0,
      // Renamed from coins to alpha_coins
      energy: 1000,
      maxEnergy: 1000,
      coinsPerTap: 1,
      energyRechargeRate: 2,
      totalTaps: 0,
      playTime: 0,
      soundEnabled: savedSound !== 'false', // default to true unless explicitly set to false
      isPaused: false
    };
  });

  // State for G COIN V4 (main currency displayed on home page)
  const [gcoinV4Balance, setGcoinV4Balance] = useState(0);
  const [activeTab, setActiveTab] = useState("account");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tonBalance, setTonBalance] = useState(0);
  const [miningProgress, setMiningProgress] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [showAdViewer, setShowAdViewer] = useState(false);
  const [partnershipDialogOpen, setPartnershipDialogOpen] = useState(false);

  // Language system - with state
  const [isEnglish, setIsEnglish] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'en' || saved === null; // default to English
  });
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // دالة لتنسيق الأرقام مع رقمين عشريين
  const formatBalance = (value: number) => {
    return value.toFixed(2);
  };

  // Sync Telegram user data with local game state
  useEffect(() => {
    if (telegramUser) {
      setGameState(prev => ({
        ...prev,
        alpha_coins: telegramUser.coins,
        // Alpha coins from database
        energy: telegramUser.energy,
        maxEnergy: telegramUser.energy_limit,
        coinsPerTap: telegramUser.coins_per_tap,
        energyRechargeRate: telegramUser.energy_recharge_rate
      }));
      setTonBalance(telegramUser.ton_balance || 0);
      setGcoinV4Balance((telegramUser as any).bal_g4v7y || 0);
    }
  }, [telegramUser]);

  // Mining progress effect - updates every hour
  useEffect(() => {
    if (!telegramUser) return;
    const updateMiningProgress = () => {
      const lastClaim = localStorage.getItem(`last_profit_claim_${telegramUser.telegram_id}`);
      const now = Date.now();
      if (!lastClaim) {
        // First time - set progress to 0
        setMiningProgress(0);
        setIsMining(false);
        return;
      }
      const timeSinceLastClaim = now - parseInt(lastClaim);
      const sixHoursInMs = 6 * 60 * 60 * 1000; // 6 hours
      const oneHourInMs = 60 * 60 * 1000; // 1 hour

      if (timeSinceLastClaim >= sixHoursInMs) {
        // Can claim - 100% progress
        setMiningProgress(100);
        setIsMining(false); // Mining completed
      } else {
        // Calculate progress: 16.66666% per hour
        const hoursElapsed = timeSinceLastClaim / oneHourInMs;
        const progress = Math.min(hoursElapsed * 16.66666, 100);
        setMiningProgress(progress);
        setIsMining(progress > 0); // Mining in progress if any progress exists
      }
    };

    // Update immediately
    updateMiningProgress();

    // Update every minute for smooth progress
    const interval = setInterval(updateMiningProgress, 60000);
    return () => clearInterval(interval);
  }, [telegramUser]);
  const handleReward = useCallback(async (amount: number) => {
    const newAlphaCoins = gameState.alpha_coins + amount;
    setGameState(prev => ({
      ...prev,
      alpha_coins: newAlphaCoins
    }));
    if (telegramUser) {
      await updateUserStats(newAlphaCoins, gameState.energy);
    }
  }, [gameState.alpha_coins, gameState.energy, telegramUser, updateUserStats]);

  // Energy recharge effect
  useEffect(() => {
    if (gameState.isPaused) return;
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        energy: Math.min(prev.energy + prev.energyRechargeRate, prev.maxEnergy),
        playTime: prev.playTime + 1
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.isPaused, gameState.energyRechargeRate, gameState.maxEnergy]);

  // Update timer every second for market value countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // التحقق من تحميل سكريبت الإعلانات
  useEffect(() => {
    const checkAdLoad = () => {
      if (typeof window.show_9602684 === 'function') {
        setAdLoaded(true);
        console.log('✅ Ad SDK loaded successfully');
      } else {
        console.log('⏳ Waiting for Ad SDK to load...');
        // في البيئة المباشرة، إذا لم يتم تحميل السكريپت خلال 5 ثوانٍ، استخدم الإعلانات الداخلية
        const timeout = setTimeout(() => {
          if (typeof window.show_9602684 !== 'function') {
            console.log('⚠️ External Ad SDK failed to load, using fallback ads');
            setAdLoaded(true); // السماح بالإعلانات الداخلية
          }
        }, 5000);
        setTimeout(() => {
          if (typeof window.show_9602684 === 'function') {
            clearTimeout(timeout);
            setAdLoaded(true);
            console.log('✅ Ad SDK loaded successfully');
          } else {
            checkAdLoad();
          }
        }, 1000);
      }
    };

    // بدء التحقق بعد ثانية واحدة من تحميل المكون
    setTimeout(checkAdLoad, 1000);
  }, []);

  // Auto-clicker effect (if purchased)
  useEffect(() => {
    if (gameState.isPaused) return;
    // Add auto-clicker logic here when implemented
  }, [gameState.isPaused]);
  const handleStartMining = useCallback(async () => {
    if (!telegramUser) {
      toast({
        title: t("مطلوب تسجيل الدخول", "Login Required"),
        description: t("يجب تسجيل الدخول عبر تليجرام", "You must login via Telegram"),
        variant: "destructive"
      });
      return;
    }

    // بدء التعدين - حفظ وقت البداية
    const now = Date.now();
    localStorage.setItem(`last_profit_claim_${telegramUser.telegram_id}`, now.toString());

    // تحديث الحالة
    setIsMining(true);
    setMiningProgress(0);
    toast({
      title: t("تم بدء التعدين!", "Mining Started!"),
      description: t("سيكتمل التعدين خلال 6 ساعات", "Mining will complete in 6 hours"),
      variant: "default"
    });
  }, [telegramUser, toast, t]);
  const handleClaimProfit = useCallback(async () => {
    if (!telegramUser) {
      toast({
        title: t("مطلوب تسجيل الدخول", "Login Required"),
        description: t("يجب تسجيل الدخول عبر تليجرام", "You must login via Telegram"),
        variant: "destructive"
      });
      return;
    }
    const lastClaim = localStorage.getItem(`last_profit_claim_${telegramUser.telegram_id}`);
    const now = Date.now();
    const sixHoursInMs = 6 * 60 * 60 * 1000; // 6 ساعات

    if (lastClaim && now - parseInt(lastClaim) < sixHoursInMs) {
      const timeLeft = sixHoursInMs - (now - parseInt(lastClaim));
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutesLeft = Math.floor(timeLeft % (60 * 60 * 1000) / (60 * 1000));
      toast({
        title: t("انتظر قليلاً", "Wait a bit"),
        description: t(`يمكنك استلام الربح بعد ${hoursLeft}س ${minutesLeft}د`, `You can claim profit after ${hoursLeft}h ${minutesLeft}m`),
        variant: "destructive"
      });
      return;
    }
    try {
      // احسب الربح من البطاقات (سنحصل على قيمة افتراضية إذا لم تكن هناك بطاقات)
      const profitAmount = 10; // ربح أساسي في عملات الألفا
      const newAlphaCoins = gameState.alpha_coins + profitAmount;

      // تحديث قاعدة البيانات أولاً - تحديث عملات الألفا
      const {
        error
      } = await supabase.from('telegram_users').update({
        coins: newAlphaCoins
      }).eq('telegram_id', telegramUser.telegram_id);
      if (error) {
        console.error('Error updating coins:', error);
        toast({
          title: t("خطأ", "Error"),
          description: t("فشل في تحديث الرصيد", "Failed to update balance"),
          variant: "destructive"
        });
        return;
      }

      // تحديث الحالة المحلية والبيانات في Telegram
      setGameState(prev => ({
        ...prev,
        alpha_coins: newAlphaCoins
      }));

      // إعادة تحميل بيانات المستخدم من قاعدة البيانات للتأكد من الاتساق
      await updateUserStats(newAlphaCoins, gameState.energy);

      // حفظ وقت آخر استلام
      localStorage.setItem(`last_profit_claim_${telegramUser.telegram_id}`, now.toString());

      // إعادة تعيين عداد التعدين إلى الصفر
      setMiningProgress(0);
      setIsMining(false);
      toast({
        title: t("تم الاستلام!", "Claimed!"),
        description: t(`حصلت على ${profitAmount} عملة ألفا`, `You got ${profitAmount} Alpha coins`),
        variant: "default"
      });
    } catch (error) {
      console.error('Error claiming profit:', error);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في حفظ الربح، حاول مرة أخرى", "Failed to save profit, try again"),
        variant: "destructive"
      });
    }
  }, [gameState.alpha_coins, telegramUser, toast, t]);
  const playClickSound = () => {
    if (!gameState.soundEnabled) return;
    
    const audio = new Audio(clickSound);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // تجاهل الأخطاء إذا لم يتم تشغيل الصوت
    });
  };
  const handleUpgradePurchase = useCallback(async (upgradeId: string, cost: number) => {
    if (gameState.alpha_coins < cost) {
      toast({
        title: t("لا توجد نقاط كافية", "Insufficient Points"),
        description: t("تحتاج إلى المزيد من النقاط لشراء هذا التحسين", "You need more points to purchase this upgrade"),
        variant: "destructive"
      });
      return;
    }
    let upgradeType = '';
    switch (upgradeId) {
      case "tap-power":
        upgradeType = 'coins_per_tap';
        break;
      case "energy-capacity":
        upgradeType = 'energy_limit';
        break;
      case "energy-recharge":
        upgradeType = 'energy_recharge_rate';
        break;
      default:
        return;
    }

    // Try to purchase upgrade
    const success = await purchaseUpgrade(upgradeType, cost);
    if (success) {
      toast({
        title: t("تم شراء التحسين", "Upgrade Purchased"),
        description: t("تم تطبيق التحسين بنجاح", "Upgrade applied successfully"),
        variant: "default"
      });
    } else {
      toast({
        title: t("فشل في شراء التحسين", "Purchase Failed"),
        description: t("حدث خطأ أثناء شراء التحسين", "An error occurred while purchasing the upgrade"),
        variant: "destructive"
      });
    }
  }, [gameState.alpha_coins, purchaseUpgrade, toast]);
  // Toggle sound
  const toggleSound = () => {
    const newSoundState = !gameState.soundEnabled;
    setGameState(prev => ({
      ...prev,
      soundEnabled: newSoundState
    }));
    // Save to localStorage for global access
    localStorage.setItem('sound_enabled', newSoundState ? 'true' : 'false');
  };
  
  const togglePause = () => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  // Toggle language
  const toggleLanguage = () => {
    const newLanguage = !isEnglish;
    setIsEnglish(newLanguage);
    localStorage.setItem('app_language', newLanguage ? 'en' : 'ar');
    toast({
      title: newLanguage ? "Language Changed" : "تم تغيير اللغة",
      description: newLanguage ? "Language changed to English" : "تم تغيير اللغة إلى العربية"
    });
  };
  const resetGame = () => {
    setGameState({
      alpha_coins: 0,
      // Reset Alpha coins
      energy: 1000,
      maxEnergy: 1000,
      coinsPerTap: 1,
      energyRechargeRate: 2,
      totalTaps: 0,
      playTime: 0,
      soundEnabled: true,
      isPaused: false
    });
    toast({
      title: t("تم إعادة تعيين اللعبة", "Game Reset"),
      description: t("بدأت لعبة جديدة", "Started a new game"),
      variant: "default"
    });
  };
  const [showAdWarning, setShowAdWarning] = useState(false);
  const handleGiftBoxClick = async () => {
    if (!telegramUser) {
      toast({
        title: t("مطلوب تسجيل الدخول", "Login Required"),
        description: t("يجب تسجيل الدخول عبر تليجرام لاستخدام هذه الميزة", "You must login via Telegram to use this feature"),
        variant: "destructive"
      });
      return;
    }

    // إظهار رسالة التحذير أولاً
    setShowAdWarning(true);
  };
  const handleContinueAd = async () => {
    setShowAdWarning(false);
    try {
      // التحقق من عدد الإعلانات اليومية أولاً
      const {
        data: adCheckResult,
        error: adCheckError
      } = await supabase.rpc('handle_ad_view_and_check_qualification', {
        user_telegram_id: telegramUser!.telegram_id
      });
      if (adCheckError) {
        console.error('Error checking ad views:', adCheckError);
        toast({
          title: t("خطأ في النظام", "System Error"),
          description: t("حدث خطأ أثناء التحقق من الإعلانات", "An error occurred while checking ads"),
          variant: "destructive"
        });
        return;
      }
      const result = adCheckResult as unknown as AdCheckResult;
      if (!result.success) {
        toast({
          title: t("تم الوصول للحد الأقصى", "Daily Limit Reached"),
          description: result.message || t("لقد وصلت للحد الأقصى من الإعلانات اليوم", "You have reached the daily ad limit"),
          variant: "destructive"
        });
        return;
      }

      // التحقق من وجود دالة الإعلان مع انتظار التحميل
      let attempts = 0;
      const maxAttempts = 10;
      const waitForAd = async (): Promise<boolean> => {
        return new Promise(resolve => {
          const checkAd = () => {
            attempts++;
            if (typeof window.show_9602684 === 'function') {
              resolve(true);
            } else if (attempts < maxAttempts) {
              setTimeout(checkAd, 500); // انتظار 500ms ثم إعادة المحاولة
            } else {
              resolve(false);
            }
          };
          checkAd();
        });
      };
      const adReady = await waitForAd();
      if (!adReady) {
        // استخدام الإعلانات الداخلية كـ fallback
        console.log('🔄 Using internal ads as fallback');
        setShowAdViewer(true);
        return;
      }

      // عرض الإعلان الحقيقي
      console.log('🎬 Starting ad with show_9602684...');
      try {
        await window.show_9602684();
        console.log('✅ Ad completed successfully!');
        // تم مشاهدة الإعلان بنجاح - منح المكافأة
        handleAdReward(result);
        toast({
          title: t("🎉 تم بنجاح!", "🎉 Success!"),
          description: t("تم منحك المكافأة لمشاهدة الإعلان", "You have been rewarded for watching the ad"),
          variant: "default"
        });
      } catch (e) {
        // لم يتم إكمال الإعلان
        console.error('❌ Ad error:', e);
        console.log('Ad rejection reason:', e);

        // التحقق من نوع الخطأ لإعطاء رسالة أكثر دقة
        let errorMessage = t("يجب عليك مشاهدة الإعلان كاملاً للحصول على المكافأة", "You must watch the entire ad to get the reward");
        if (e && typeof e === 'object') {
          if (e.toString().includes('timeout')) {
            errorMessage = t("انتهت صلاحية الإعلان. حاول مرة أخرى", "Ad timeout. Please try again");
          } else if (e.toString().includes('network')) {
            errorMessage = t("مشكلة في الاتصال. تحقق من الإنترنت", "Network issue. Check your internet connection");
          }
        }
        toast({
          title: t("👀 لم تكمل مشاهدة الإعلان", "👀 Ad Not Completed"),
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in handleContinueAd:', error);
      toast({
        title: t("خطأ غير متوقع", "Unexpected Error"),
        description: t("حدث خطأ أثناء معالجة طلبك", "An error occurred while processing your request"),
        variant: "destructive"
      });
    }
  };
  const handleAdReward = async (adResult: AdCheckResult) => {
    if (!telegramUser) return;

    // منح 10 عملات PEPE + 1 عملة كروت
    const pepeReward = 10;
    const cardCurrencyReward = 1;

    // حفظ رصيد PEPE في localStorage
    const currentPepeBalance = parseInt(localStorage.getItem(`pepe_balance_${telegramUser.telegram_id}`) || '0');
    const newPepeBalance = currentPepeBalance + pepeReward;
    localStorage.setItem(`pepe_balance_${telegramUser.telegram_id}`, newPepeBalance.toString());

    // حفظ رصيد عملة الكروت
    const currentCardCurrency = parseInt(localStorage.getItem(`card_currency_${telegramUser.telegram_id}`) || '0');
    const newCardCurrency = currentCardCurrency + cardCurrencyReward;
    localStorage.setItem(`card_currency_${telegramUser.telegram_id}`, newCardCurrency.toString());

    // رسالة التهنئة العادية
    let description = isEnglish ? `You got ${pepeReward} PEPE coins + ${cardCurrencyReward} card coin from watching the ad!` : `لقد حصلت على ${pepeReward} عملة PEPE + ${cardCurrencyReward} عملة كروت من مشاهدة الإعلان!`;

    // التحقق من ربح التأهيل
    if (adResult.qualification_won) {
      description += isEnglish ? `\n🎉 Congratulations! You also won qualification! 🎉` : `\n🎉 مبروك! لقد ربحت التأهيل أيضاً! 🎉`;
      toast({
        title: t("🏆 فوز مذهل!", "🏆 Amazing Win!"),
        description: t("تهانينا! لقد ربحت التأهيل من صندوق الهدايا! حظ سعيد جداً!", "Congratulations! You won qualification from the gift box! Very lucky!"),
        variant: "default"
      });
    }

    // معلومات إضافية عن الإعلانات المتبقية
    if (adResult.remaining_views !== undefined) {
      description += isEnglish ? `\nRemaining ads today: ${adResult.remaining_views}` : `\nالإعلانات المتبقية اليوم: ${adResult.remaining_views}`;
    }
    toast({
      title: adResult.qualification_won ? t("🎉 فوز مضاعف!", "🎉 Double Win!") : t("🎉 مبروك!", "🎉 Congratulations!"),
      description: description,
      variant: "default"
    });
  };
  return <div className="min-h-screen bg-background mobile-container safe-top safe-bottom py-0 mx-0">
      {/* Header - Clean design */}
      <header className="border-b border-border/30 bg-card/95 shadow-sm -mx-3 px-3 sticky top-0 z-50 rounded-b-2xl">
        <div className="py-6">
          {/* معلومات المستخدم في الأعلى */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* صورة المستخدم */}
              <div 
                className="relative cursor-pointer" 
                onClick={() => navigate('/settings')}
              >
                <Avatar className="w-12 h-12 border-2 border-border hover:border-primary transition-colors">
                  <AvatarImage src={(window.Telegram?.WebApp?.initDataUnsafe?.user as any)?.photo_url} alt="User Avatar" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-base">
                    {telegramUser?.first_name ? telegramUser.first_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
              </div>
              
               {/* اسم المستخدم */}
               <div className="flex flex-col">
                 <h3 className="font-bold text-foreground text-base leading-tight">
                   {telegramUser?.first_name || telegramUser?.username ? telegramUser.first_name || `@${telegramUser.username}` : t("مستخدم", "User")}
                 </h3>
                 {telegramUser?.username && telegramUser?.first_name && <p className="text-sm text-muted-foreground leading-tight">
                     @{telegramUser.username}
                   </p>}
               </div>
            </div>
            
            {/* شارة VIP أو معلومة إضافية */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/premium')} className="text-xs p-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/50 hover:from-yellow-500 hover:to-yellow-700 rounded-xl font-semibold flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>Premium</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area - Clean design */}
      <main className="py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-8">

          <TabsContent value="account" className="mt-0">
            <Card className="mobile-card bg-gradient-to-br from-card to-card/80 border-border/50 rounded-3xl overflow-hidden animate-fade-in floating-card">
              
              <CardContent className="p-8 bg-transparent floating-card shimmer-effect">
                <div className="flex flex-col items-center justify-center space-y-8">
                  
                  {/* عرض الرصيد فوق الصورة */}
                  <div className="text-center space-y-6 w-full">
                     <div className="bg-gradient-to-r from-card/80 to-secondary/40 rounded-3xl p-6 border border-primary/30 relative overflow-hidden">
                       <div className="relative z-10">
                         <div className="flex items-center justify-center gap-4 mb-2">
                              <div className="relative animate-pulse">
                                <img src={coinLogo} alt="Coin Logo" className="w-10 h-10 rounded-full object-cover border-2 border-primary/50" />
                              </div>
                           <p className="text-base text-muted-foreground font-medium">{t("رصيد G COIN V4", "G COIN V4 Balance")}</p>
                         </div>
                          <div className="text-center">
                             <h2 className="text-4xl font-bold text-primary mb-1 animate-scale-in">{formatBalance(gcoinV4Balance)}</h2>
                             <p className="text-sm text-accent font-semibold animate-fade-in">{t("G COIN V4", "G COIN V4")}</p>
                          </div>
                       </div>
                     </div>
                      
                      {/* معلومات إضافية */}
                      
                   </div>

                    {/* عرض الصورة تحت الرصيد */}
                    <div className="relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden mt-6 floating-card">
                      <img src="/g-coin-logo.jpg" alt="G COIN V4" className="w-full h-full object-contain hover-scale" />
                    </div>
                 </div>
                </CardContent>
              </Card>
           </TabsContent>
           
           <TabsContent value="referrals" className="mt-0">
             <Referrals coins={gameState.alpha_coins} onReward={handleReward} isEnglish={isEnglish} />
           </TabsContent>

           <TabsContent value="tasks" className="mt-0">
              <Tasks coins={gameState.alpha_coins} onReward={(amount, currency) => {
              setGameState(prev => ({
                ...prev,
                alpha_coins: prev.alpha_coins + amount
              }));
            }} isEnglish={isEnglish} />
           </TabsContent>

           <TabsContent value="campaigns" className="mt-0">
             <Campaigns isEnglish={isEnglish} tonBalance={tonBalance} telegramId={telegramUser?.telegram_id} />
           </TabsContent>

           <TabsContent value="qualification" className="mt-0">
             <QualificationTasks />
           </TabsContent>

           <TabsContent value="cards" className="mt-0">
             <AlphaPlatform />
           </TabsContent>



           {/* تم إزالة تبويب الإنزال وإعادة توجيهه لتبويب المحفظة */}

           </div>
          
           {/* Bottom Navigation - Clean Design */}
          <TabsList className="fixed bottom-0 left-0 right-0 grid w-full grid-cols-7 h-20 gap-1 bg-card/95 p-2 border-t border-border/50 rounded-t-3xl z-50 animate-slide-in-right">
            <TabsTrigger value="account" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Home className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Briefcase className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Gift className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            <TabsTrigger value="qualification" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Trophy className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Star className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            
            <TabsTrigger value="referrals" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={playClickSound}>
              <Users className="w-5 h-5 data-[state=active]:animate-pulse" />
              
            </TabsTrigger>
            
<TabsTrigger value="wallet" className="flex flex-col items-center gap-2 p-2 rounded-full aspect-square data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-110 hover-scale border-2 border-transparent data-[state=active]:border-primary/20" onClick={() => { playClickSound(); navigate('/my-wallet'); }}>
	              <Wallet className="w-5 h-5 data-[state=active]:animate-pulse" />
	              
	            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>

      {/* Ad Warning Dialog */}
      <AdWarningDialog open={showAdWarning} onOpenChange={setShowAdWarning} onContinue={handleContinueAd} />
      
      {/* Fallback Ad Viewer */}
      <AdViewer isOpen={showAdViewer} onClose={() => setShowAdViewer(false)} onComplete={() => {
      // منح مكافأة الإعلان الداخلي
      handleAdReward({
        success: true,
        views_today: undefined,
        remaining_views: undefined
      });
      setShowAdViewer(false);
      toast({
        title: t("🎉 تم بنجاح!", "🎉 Success!"),
        description: t("تم منحك المكافأة لمشاهدة الإعلان", "You have been rewarded for watching the ad"),
        variant: "default"
      });
    }} />
    </div>;
}