import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Trophy, PlayCircle, CheckCircle, Clock, Gift, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { supabase } from "@/integrations/supabase/client";

// إضافة نوع للإعلانات في window
declare global {
  interface Window {
    show_9602684?: () => Promise<void>;
  }
}
interface AlphaTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'ad' | 'daily' | 'social' | 'special';
  completed: boolean;
  progress?: number;
  maxProgress?: number;
}
interface AdCheckResult {
  success: boolean;
  qualification_won?: boolean;
  views_today?: number;
  remaining_views?: number;
  message?: string;
  max_reached?: boolean;
}
export default function AlphaPlatform() {
  const {
    toast
  } = useToast();
  const {
    telegramUser
  } = useTelegramData();
  const [alphaPoints, setAlphaPoints] = useState(0);
  const [adViewsToday, setAdViewsToday] = useState(0);
  const [isProcessingAd, setIsProcessingAd] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");

  // مهام الفا المختلفة
  const [alphaTasks] = useState<AlphaTask[]>([{
    id: 'daily_login',
    title: 'Daily Login',
    description: 'Log in daily to get Alpha points',
    reward: 50,
    type: 'daily',
    completed: false
  }, {
    id: 'watch_ads',
    title: 'Watch Ads',
    description: 'Watch ads to get Alpha coins (maximum 15 daily)',
    reward: 1,
    type: 'ad',
    completed: false,
    progress: 0,
    maxProgress: 15
  }, {
    id: 'social_share',
    title: 'Social Media Share',
    description: 'Share the app with your friends',
    reward: 100,
    type: 'social',
    completed: false
  }, {
    id: 'weekly_challenge',
    title: 'Weekly Challenge',
    description: 'Complete all weekly tasks',
    reward: 500,
    type: 'special',
    completed: false
  }]);

  // تحميل البيانات من قاعدة البيانات وتهيئة Giga ads
  useEffect(() => {
    const userId = telegramUser?.telegram_id || 'test_user_12345';
    const savedAdViews = localStorage.getItem(`ad_views_today_${userId}_${new Date().toDateString()}`);

    // استخدام bal_a6c3z (alpha_coins obfuscated) من قاعدة البيانات بدلاً من localStorage
    if (telegramUser?.bal_a6c3z !== undefined) {
      setAlphaPoints(telegramUser.bal_a6c3z);
    }
    if (savedAdViews) {
      setAdViewsToday(parseInt(savedAdViews));
    }

    // تحميل إعلانات Alpha مع نظام النسخ الاحتياطية
    initializeAlphaAds();
  }, [telegramUser]);

  // تهيئة إعلانات Alpha مع تحسينات
  const initializeAlphaAds = () => {
    console.log('🔄 Initializing Alpha ads...');

    // التحقق من وجود الدالة بالفعل
    if (typeof window.show_9602684 === 'function') {
      console.log('✅ Alpha ads already available');
      return;
    }

    // انتظار تحميل السكريبت مع مهلة زمنية
    let checkCount = 0;
    const maxChecks = 20; // 10 ثوانِ بمعدل فحص كل 500ms

    const checkAlphaAds = () => {
      checkCount++;
      if (typeof window.show_9602684 === 'function') {
        console.log('✅ Alpha ads function is now available');
        return;
      }
      if (checkCount < maxChecks) {
        console.log(`⏳ Waiting for Alpha ads... (${checkCount}/${maxChecks})`);
        setTimeout(checkAlphaAds, 500);
      } else {
        console.log('⚠️ Alpha ads not loaded after timeout, using fallback mode');
        // إنشاء fallback function
        window.show_9602684 = () => {
          console.log('📱 Using Alpha ads fallback simulation');
          return new Promise(resolve => {
            setTimeout(resolve, 2000); // محاكاة مدة الإعلان
          });
        };
      }
    };
    checkAlphaAds();
  };

  // حفظ البيانات في قاعدة البيانات
  const saveAlphaPoints = useCallback(async (points: number) => {
    if (!telegramUser?.id) return;
    try {
      // تحديث bal_a6c3z (alpha_coins obfuscated) في قاعدة البيانات
      const {
        error
      } = await supabase.from('telegram_users').update({
        bal_a6c3z: points // alpha_coins (obfuscated)
      }).eq('id', telegramUser.id);
      if (error) {
        console.error('Error updating alpha points:', error);
      } else {
        setAlphaPoints(points);
      }
    } catch (err) {
      console.error('Error saving alpha points:', err);
    }
  }, [telegramUser]);
  const saveAdViews = useCallback((views: number) => {
    const userId = telegramUser?.telegram_id || 'test_user_12345';
    const today = new Date().toDateString();
    localStorage.setItem(`ad_views_today_${userId}_${today}`, views.toString());
    setAdViewsToday(views);
  }, [telegramUser]);

  // دالة مشاهدة الإعلان
  const handleWatchAd = async () => {
    // إنشاء معرف مؤقت للاختبار إذا لم يكن هناك مستخدم تليجرام
    const testUserId = telegramUser?.telegram_id || 'test_user_12345';

    // التحقق من وجود بيئة تليجرام
    const isTelegramEnv = (window as any).Telegram?.WebApp?.platform || window.navigator.userAgent.includes('Telegram');
    if (!isTelegramEnv) {
      // محاكاة مشاهدة الإعلان خارج تليجرام للاختبار
      if (adViewsToday >= 15) {
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily ad limit (15 ads)",
          variant: "destructive"
        });
        return;
      }
      setIsProcessingAd(true);
      // Simulate ad delay
      setTimeout(() => {
        const newAdViews = adViewsToday + 1;
        const newAlphaPoints = alphaPoints + 1;
        saveAdViews(newAdViews);
        saveAlphaPoints(newAlphaPoints);
        toast({
          title: "Congratulations! 🎉",
          description: "You got 1 Alpha coin from watching the ad! (Test mode)",
          variant: "default"
        });
        setIsProcessingAd(false);
      }, 2000);
      return;
    }
    if (adViewsToday >= 15) {
      toast({
        title: "Daily Limit Reached",
        description: "You've reached your daily ad limit (15 ads)",
        variant: "destructive"
      });
      return;
    }
    if (isProcessingAd) {
      return;
    }
    setIsProcessingAd(true);
    try {
      // Check for ad function availability
      console.log('🔍 Checking window.show_9602684 availability:', typeof window.show_9602684);
      if (typeof window.show_9602684 !== 'function') {
        console.log('❌ window.show_9602684 is not available, using fallback');

        // Use ad simulation as fallback
        console.log('🎬 Starting fallback Alpha ad simulation...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate ad duration

        console.log('✅ Fallback ad completed successfully!');
        const newAdViews = adViewsToday + 1;
        const newAlphaPoints = alphaPoints + 1;
        saveAdViews(newAdViews);
        saveAlphaPoints(newAlphaPoints);
        toast({
          title: "Congratulations! 🎉",
          description: "You got 1 Alpha coin from watching the ad! (Simulation mode)",
          variant: "default"
        });
        setIsProcessingAd(false);
        return;
      }

      // عرض الإعلان الحقيقي
      console.log('🎬 Starting Alpha ad...');
      await window.show_9602684();

      // تم مشاهدة الإعلان بنجاح
      console.log('✅ Alpha ad completed successfully!');
      const newAdViews = adViewsToday + 1;
      const newAlphaPoints = alphaPoints + 1;
      saveAdViews(newAdViews);
      saveAlphaPoints(newAlphaPoints);
      toast({
        title: "Congratulations! 🎉",
        description: "You got 1 Alpha coin from watching the ad!",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Alpha ad error:', error);
      toast({
        title: "👀 Ad Not Completed",
        description: "You must watch the entire ad to get Alpha coins",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAd(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header - Alpha Points */}
        <div className="text-center relative">
          {/* Glowing background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl opacity-30"></div>
          
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-primary via-accent to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse-glow">
              <Star className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Alpha Platform
            </h1>
            
            
            <div className="glass-card p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-card/90 to-background/80">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <span className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  {alphaPoints.toLocaleString()}
                </span>
                <span className="text-amber-500 font-bold text-lg">Alpha Coins</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="tasks" className="space-y-4 mt-6">
            {/* Watch Ads Task */}
            <Card className="glass-card border-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-blue-500/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">Watch Ads</h3>
                    <p className="text-sm text-blue-500 font-medium">+1 Alpha coin per ad</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30 px-3 py-1">
                    {adViewsToday}/15
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily Progress</span>
                    <span className="text-blue-500 font-semibold">{adViewsToday}/15</span>
                  </div>
                  <Progress value={adViewsToday / 15 * 100} className="h-3 bg-blue-500/10">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500" />
                  </Progress>
                </div>
                
                <Button onClick={handleWatchAd} disabled={adViewsToday >= 15 || isProcessingAd} className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-neon-blue transition-all duration-300 hover:scale-105">
                  {isProcessingAd ? <>
                      <Zap className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </> : adViewsToday >= 15 ? <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Completed for Today
                    </> : <>
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Watch Ad Now
                    </>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4 mt-6">
            <Card className="glass-card border-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                    Alpha Coin Rewards
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                      <Gift className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-xl"></div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent mb-3">
                    Coming Very Soon!
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    You'll soon be able to exchange Alpha coins for exclusive rewards such as coins and cash prizes
                  </p>
                  
                  {/* Preview of upcoming rewards */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="glass-card p-3 rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-blue-500">Digital Coins</p>
                      <p className="text-xs text-muted-foreground">1000 coins</p>
                    </div>
                    
                    <div className="glass-card p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 to-green-500/5 border border-emerald-500/20">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-500">Cash Prizes</p>
                      <p className="text-xs text-muted-foreground">2500 coins</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}