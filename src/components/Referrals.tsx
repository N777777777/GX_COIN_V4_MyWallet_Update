import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, TrendingUp, Gift, Star, Calendar, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { supabase } from "@/integrations/supabase/client";

interface ReferralsProps {
  coins: number;
  onReward: (amount: number) => void;
  isEnglish?: boolean;
}

interface ReferralData {
  id: string;
  referrer_telegram_id: number;
  referred_telegram_id: number;
  status: string;
  created_at: string;
  reward_claimed: boolean;
  claimed_at: string | null;
  referred_first_name?: string;
  referred_username?: string;
  referred_coins?: number;
}

export function Referrals({ coins, onReward, isEnglish = false }: ReferralsProps) {
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  
  // إحصائيات بسيطة
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [unclaimedReward, setUnclaimedReward] = useState(0);
  const [userCommission, setUserCommission] = useState(0.1); // العمولة الافتراضية

  const t = (arabic: string, english: string) => english;

  // رابط الإحالة
  const referralLink = telegramUser?.telegram_id 
    ? `https://t.me/G3_COIN_V3_BOT?start=${telegramUser.telegram_id}` 
    : 'https://t.me/G3_COIN_V3_BOT';

  // تحميل بيانات الإحالات
  useEffect(() => {
    if (telegramUser?.telegram_id) {
      loadReferrals();
      loadReferralStats();
      loadUserCommission();
    }
  }, [telegramUser?.telegram_id]);

  const loadUserCommission = async () => {
    try {
      if (!telegramUser?.telegram_id) return;

      const { data, error } = await supabase
        .rpc('get_user_referral_commission', {
          p_telegram_id: telegramUser.telegram_id
        });

      if (error) throw error;

      if (data !== null) {
        setUserCommission(Number(data));
      }
    } catch (error) {
      console.error('Error loading user commission:', error);
      // في حالة الخطأ، نستخدم القيمة الافتراضية 0.1
      setUserCommission(0.1);
    }
  };

  const loadReferrals = async () => {
    try {
      setLoading(true);
      
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_telegram_id', telegramUser?.telegram_id)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      if (referralsData && referralsData.length > 0) {
        const referredUserIds = referralsData.map((r: any) => r.referred_user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('telegram_users')
          .select('id, telegram_id, first_name, username, coins')
          .in('id', referredUserIds);
        
        if (usersError) {
          console.error('Error fetching users:', usersError);
        }
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        const transformedData = referralsData.map((referral: any) => {
          const user = usersMap.get(referral.referred_user_id);
          
          return {
            id: referral.id,
            referrer_telegram_id: referral.referrer_telegram_id,
            referred_telegram_id: referral.referred_telegram_id,
            status: referral.status,
            created_at: referral.created_at,
            reward_claimed: referral.reward_claimed || false,
            claimed_at: referral.claimed_at,
            referred_first_name: user?.first_name,
            referred_username: user?.username,
            referred_coins: user?.coins
          };
        });
        
        setReferrals(transformedData);
      } else {
        setReferrals([]);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الإحالات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReferralStats = async () => {
    try {
      if (!telegramUser?.telegram_id) return;

      const { data, error } = await supabase
        .rpc('get_unclaimed_referrals_count', {
          p_referrer_telegram_id: telegramUser.telegram_id
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const stats = data[0];
        setTotalReferrals(stats.total_referrals || 0);
        setUnclaimedCount(stats.unclaimed_count || 0);
        setUnclaimedReward(Number(stats.total_reward) || 0);
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  const handleClaimRewards = async () => {
    if (!telegramUser?.telegram_id) return;
    
    try {
      setClaiming(true);
      
      const { data, error } = await supabase.rpc('claim_referral_rewards', {
        p_referrer_telegram_id: telegramUser.telegram_id
      });

      if (error) throw error;

      const result = data as any;
      
      if (result && result.length > 0) {
        const claimResult = result[0];
        
        if (claimResult.success) {
          toast({
            title: "🎉 تم المطالبة بالمكافآت!",
            description: `حصلت على ${claimResult.total_gcoin} G COIN من ${claimResult.claimed_count} إحالة`,
            variant: "default"
          });
          
          // إعادة تحميل البيانات
          await loadReferrals();
          await loadReferralStats();
          
          // تحديث الرصيد
          if (onReward) {
            onReward(parseFloat(claimResult.total_gcoin));
          }
        } else {
          toast({
            title: "إشعار",
            description: claimResult.message,
            variant: "default"
          });
        }
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء المطالبة بالمكافآت",
        variant: "destructive"
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t("تم النسخ!", "Copied!"),
      description: t("تم نسخ رابط الدعوة", "Referral link copied"),
      variant: "default"
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: t('انضم إلى G COIN V3', 'Join G COIN V3'),
        text: t('انضم معي واحصل على مكافآت!', 'Join me and earn rewards!'),
        url: referralLink
      });
    } else {
      handleCopyReferralLink();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          ⏳ في الانتظار
        </Badge>;
      case 'channel_joined':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
          ✅ انضم للقناة
        </Badge>;
      case 'qualified':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
          🎯 مؤهل
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* بطاقة العنوان الرئيسية */}
      <Card className="bg-gradient-to-br from-primary via-primary/80 to-accent border-none shadow-lg overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h2 className="text-2xl font-bold">{t("نظام الإحالات", "Referral System")}</h2>
            </div>
            <p className="text-white/80 text-sm">
              {t(`احصل على ${userCommission} G COIN لكل إحالة`, `Earn ${userCommission} G COIN for each referral`)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unclaimed Rewards - CLAIM Button */}
      {unclaimedCount > 0 && (
        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  {t("مكافآت قابلة للمطالبة", "Unclaimed Rewards")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("اضغط للمطالبة بمكافآتك", "Click to claim your rewards")}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-6 mb-4 text-center border border-primary/30">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-6 h-6 text-primary" />
                <p className="text-3xl font-bold text-foreground">{unclaimedCount}</p>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t("إحالة غير مطالب بها", "Unclaimed Referrals")}
              </p>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                <p className="text-xs text-muted-foreground mb-1">إجمالي المكافأة</p>
                <p className="text-2xl font-bold text-primary">{unclaimedReward.toFixed(2)} G COIN</p>
              </div>
            </div>
            
            <Button 
              onClick={handleClaimRewards}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
              size="lg"
            >
              {claiming ? (
                <>{t("جاري المطالبة...", "Claiming...")}</>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  {t("المطالبة الآن", "CLAIM NOW")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* إحصائيات الإحالات */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{t("إجمالي الإحالات", "Total Referrals")}</p>
              <p className="text-2xl font-bold text-primary">
                {totalReferrals}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* رابط الإحالة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("رابط الإحالة", "Referral Link")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 border">
            <p className="text-sm font-mono break-all text-muted-foreground">
              {referralLink}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCopyReferralLink} className="flex-1" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              {t("نسخ", "Copy")}
            </Button>
            <Button onClick={handleShare} className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              {t("مشاركة", "Share")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الإحالات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("إحالاتك", "Your Referrals")} ({referrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("جاري التحميل...", "Loading...")}
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <Users className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">{t("لا توجد إحالات بعد", "No referrals yet")}</p>
              <p className="text-sm text-muted-foreground">
                {t("ابدأ بمشاركة رابطك", "Start sharing your link")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral, index) => (
                <div 
                  key={referral.id} 
                  className="bg-gradient-to-r from-background to-muted/30 border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {referral.referred_first_name || referral.referred_username || 'مستخدم'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {t("الرصيد:", "Balance:")} <span className="font-semibold text-primary">{referral.referred_coins?.toFixed(2) || '0.00'}</span> G COIN
                      </p>
                    </div>
                  </div>
                  
                  {/* حالة المكافأة */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t("المكافأة:", "Reward:")}</span>
                      <span className="font-bold text-primary ml-2">{userCommission} G COIN</span>
                    </div>
                    {referral.reward_claimed ? (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                        ✅ {t("تم المطالبة", "Claimed")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        ⏳ {t("قابل للمطالبة", "Claimable")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}