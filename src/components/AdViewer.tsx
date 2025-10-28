import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle, X, Users, MessageCircle, Star } from "lucide-react";


interface TelegramAd {
  id: string;
  channelName: string;
  channelUsername: string;
  title: string;
  description: string;
  imageUrl?: string;
  subscribersCount: string;
  category: string;
}

interface AdViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const AdViewer = ({ isOpen, onClose, onComplete }: AdViewerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentAd, setCurrentAd] = useState<TelegramAd | null>(null);
  const [adClickTimestamp, setAdClickTimestamp] = useState<number | null>(null);
  const [isVerificationPhase, setIsVerificationPhase] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const { toast } = useToast();

  const AD_DURATION = 30; // 30 seconds
  const MINIMUM_AD_TIME = 15; // يجب قضاء 15 ثانية على الأقل في الإعلان

  // إعلانات رسمية من تليجرام مع روابط حقيقية مربحة
  const telegramAds: TelegramAd[] = [
    {
      id: "1",
      channelName: "CryptoBot - Most Popular Crypto Bot",
      channelUsername: "https://t.me/CryptoBot?start=ref_mining",
      title: "Get Free Bitcoin Daily",
      description: "Official CryptoBot - Earn Bitcoin & Ethereum free every day. Trusted by over 10 million users",
      subscribersCount: "10M+",
      category: "Free Bitcoin Earning"
    },
    {
      id: "2", 
      channelName: "Hamster Kombat - Most Popular Telegram Game",
      channelUsername: "https://t.me/hamster_kombat_bot?start=kentId5298071460",
      title: "Earn Free HMSTR Coins",
      description: "The most popular official game on Telegram - earn millions of coins with simple taps. Airdrop coming soon!",
      subscribersCount: "300M+",
      category: "Tap to Earn Games"
    },
    {
      id: "3",
      channelName: "Notcoin - Official Telegram Coin",
      channelUsername: "https://t.me/notcoin_bot?start=rp_5298071460",
      title: "Earn Free NOT Coins",
      description: "Official Notcoin - first digital currency on Telegram. Earn NOT coins by tapping and get free Airdrop",
      subscribersCount: "35M+", 
      category: "Official Telegram Coin"
    },
    {
      id: "4",
      channelName: "TON Space - Official TON Wallet",
      channelUsername: "https://t.me/wallet",
      title: "Official TON Wallet Inside Telegram",
      description: "Official TON wallet integrated into Telegram - send and receive TON easily and securely",
      subscribersCount: "50M+",
      category: "Official Digital Wallet"
    },
    {
      id: "5",
      channelName: "BotFather - منشئ البوتات الرسمي",
      channelUsername: "https://t.me/BotFather",
      title: "أنشئ بوت تليجرام واربح المال",
      description: "BotFather الرسمي - أنشئ بوت تليجرام مجاناً واربح من الخدمات والاشتراكات",
      subscribersCount: "∞",
      category: "إنشاء بوتات مربحة"
    },
    {
      id: "6",
      channelName: "تليجرام بريميوم - الاشتراك الرسمي",
      channelUsername: "https://t.me/premium",
      title: "اشترك في تليجرام بريميوم",
      description: "احصل على ميزات حصرية: رفع ملفات 4GB، ملصقات متحركة، وميزات VIP أخرى",
      subscribersCount: "5M+",
      category: "اشتراك مدفوع"
    }
  ];

  useEffect(() => {
    if (isOpen && !currentAd) {
      // اختيار إعلان عشوائي عند فتح النافذة
      const randomAd = telegramAds[Math.floor(Math.random() * telegramAds.length)];
      setCurrentAd(randomAd);
    }
  }, [isOpen]);

  // نظام التحقق من المكافأة
  useEffect(() => {
    if (!isTimerActive || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, remainingTime]);

  // وظيفة التحقق من استلام المكافأة
  const handleVerifyCompletion = () => {
    if (!adClickTimestamp) {
      toast({
        title: "❌ خطأ",
        description: "يجب الضغط على رابط الإعلان أولاً",
        variant: "destructive"
      });
      return;
    }

    const currentTime = Date.now();
    const timeSpent = Math.floor((currentTime - adClickTimestamp) / 1000);

    if (timeSpent >= MINIMUM_AD_TIME) {
      // المستخدم قضى وقتاً كافياً
      setCanClaimReward(true);
      setIsCompleted(true);
      setIsVerificationPhase(false);
      
      toast({
        title: "🎉 ممتاز!",
        description: `قضيت ${timeSpent} ثانية في الإعلان. يمكنك الآن استلام المكافأة!`,
        variant: "default"
      });
    } else {
      const remainingSeconds = MINIMUM_AD_TIME - timeSpent;
      setRemainingTime(remainingSeconds);
      setIsTimerActive(true);
      
      toast({
        title: "⏰ انتظر قليلاً",
        description: `تحتاج إلى ${remainingSeconds} ثانية إضافية لاستلام المكافأة`,
        variant: "default"
      });
    }
  };


  // مؤقت الإعلان العادي (30 ثانية)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / AD_DURATION);
        if (newProgress >= 100) {
          setIsCompleted(true);
          setIsPlaying(false);
          setCanClaimReward(true);
          toast({
            title: "تم!",
            description: "شاهدت الإعلان بالكامل. يمكنك الآن استلام المكافأة",
          });
          return 100;
        }
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, toast]);

  const handlePlayAd = () => {
    setIsPlaying(true);
    setProgress(0);
    setIsCompleted(false);
    setCanClaimReward(false);
    setAdClickTimestamp(null);
    setIsVerificationPhase(false);
    setIsTimerActive(false);
    setRemainingTime(0);
  };

  const handleComplete = () => {
    if (canClaimReward) {
      onComplete();
      handleClose();
    } else {
      toast({
        title: "❌ لا يمكن استلام المكافأة",
        description: "يجب إما مشاهدة الإعلان كاملاً أو التحقق من إتمام المهمة",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    // إلغاء المؤقت إذا كان يعمل
    if (verificationTimer) {
      clearTimeout(verificationTimer);
      setVerificationTimer(null);
    }
    
    setIsPlaying(false);
    setProgress(0);
    setIsCompleted(false);
    setCanClaimReward(false);
    setAdClickTimestamp(null);
    setIsVerificationPhase(false);
    setIsTimerActive(false);
    setRemainingTime(0);
    setCurrentAd(null);
    onClose();
  };

  const handleJoinChannel = async () => {
    if (currentAd?.channelUsername) {
      try {
        // تسجيل الضغط على الخادم
        const response = await fetch('/api/track-ad-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adId: currentAd.id,
            userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          // تسجيل وقت الضغط على الإعلان محلياً أيضاً
          setAdClickTimestamp(Date.now());
          setIsVerificationPhase(true);
          
          // إيقاف مؤقت الإعلان العادي إذا كان يعمل
          if (isPlaying) {
            setIsPlaying(false);
            setProgress(0);
            setIsCompleted(false);
          }
          
          // فتح الإعلان في نافذة جديدة
          window.open(currentAd.channelUsername, '_blank');
          
          toast({
            title: "🔗 تم فتح الإعلان!",
            description: `ابق في الإعلان لمدة ${MINIMUM_AD_TIME} ثانية على الأقل، ثم ارجع واضغط 'تحقق من الإتمام'`,
            variant: "default"
          });
        } else {
          toast({
            title: "❌ خطأ",
            description: "حدث خطأ في تسجيل الضغط. حاول مرة أخرى",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error tracking ad click:', error);
        toast({
          title: "❌ خطأ في الشبكة",
          description: "تحقق من اتصالك بالإنترنت",
          variant: "destructive"
        });
      }
    }
  };

  if (!currentAd) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            إعلان من تليجرام
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ad Display Area */}
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 flex items-center justify-center overflow-hidden">
            {!isPlaying && !isCompleted && (
              <div className="text-center space-y-4 p-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-bold text-blue-700">{currentAd.channelName}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-blue-600 font-mono">رابط رسمي وآمن 🔐</p>
                  </div>
                  <p className="text-sm text-green-600 font-semibold">💰 ربح حقيقي ومضمون</p>
                  <p className="text-xs text-muted-foreground">اضغط تشغيل لمشاهدة التفاصيل</p>
                </div>
              </div>
            )}

            {isPlaying && (
              <div className="text-center space-y-4 p-4">
                {/* Channel Header */}
                <div className="flex items-center gap-3 bg-white/90 rounded-lg p-3 border border-blue-200">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-blue-700 text-sm">{currentAd.channelName}</p>
                    <p className="text-blue-500 text-xs">{currentAd.channelUsername}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-600">{currentAd.subscribersCount} مشترك</span>
                    </div>
                  </div>
                </div>

                {/* Ad Content */}
                <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-3">
                  <h3 className="font-bold text-blue-800 text-lg">{currentAd.title}</h3>
                  <p className="text-blue-700 text-sm leading-relaxed">{currentAd.description}</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {currentAd.category}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-blue-600">موصى به</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg">
                    🎯 انضم الآن واربح فوراً! 🎯
                  </div>

                  {/* زر الانضمام المباشر */}
                  <Button 
                    onClick={handleJoinChannel}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    انضم الآن - رابط رسمي
                  </Button>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="text-center space-y-4 p-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-foreground font-semibold">🎉 مبروك! ربحت 2 عملة</p>
                <p className="text-green-600 font-bold text-lg">💰 +2 عملة</p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-700">
                    🔥 انضم للحصول على المزيد من الأرباح:
                  </p>
                  <Button 
                    onClick={handleJoinChannel}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    انضم لـ {currentAd.channelName}
                  </Button>
                  <p className="text-xs text-blue-600">رابط آمن ورسمي 100%</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {(isPlaying || isCompleted) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">التقدم</span>
                <span className="text-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {isCompleted ? "مكتمل!" : `${Math.round((AD_DURATION * (100 - progress)) / 100)} ثانية متبقية`}
              </p>
            </div>
          )}

          {/* Verification Phase Info */}
          {isVerificationPhase && !canClaimReward && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">مرحلة التحقق</span>
              </div>
              <p className="text-sm text-yellow-700">
                تم فتح الإعلان. اقض {MINIMUM_AD_TIME} ثانية على الأقل في الإعلان، ثم ارجع واضغط "تحقق من الإتمام"
              </p>
              {isTimerActive && remainingTime > 0 && (
                <div className="text-center">
                  <span className="text-orange-600 font-bold">
                    ⏰ {remainingTime} ثانية متبقية
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isPlaying && !isCompleted && !isVerificationPhase && (
              <>
                <Button onClick={handlePlayAd} className="flex-1 gap-2">
                  <Play className="w-4 h-4" />
                  تشغيل الإعلان
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}

            {isVerificationPhase && !canClaimReward && (
              <Button 
                onClick={handleVerifyCompletion} 
                className="flex-1 gap-2"
                variant="default"
              >
                <CheckCircle className="w-4 h-4" />
                تحقق من الإتمام
              </Button>
            )}

            {isPlaying && (
              <Button variant="outline" onClick={handleClose} className="flex-1">
                إلغاء
              </Button>
            )}

            {isCompleted && (
              <Button 
                onClick={handleComplete} 
                className="flex-1 gap-2"
                disabled={!canClaimReward}
                variant={canClaimReward ? "default" : "secondary"}
              >
                <CheckCircle className="w-4 h-4" />
                {canClaimReward ? "استلام المكافأة 🎁" : "انتظار..."}
              </Button>
            )}

            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};