import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramData } from '@/hooks/useTelegramData';
import { useClickSound } from '@/hooks/useClickSound';

interface Campaign {
  id: string;
  campaign_name: string;
  liquidity_amount: number;
  payment_type: string;
  campaign_image_url: string;
  channel_username: string;
  total_participants: number;
  total_referrals: number;
  status: string;
  created_at: string;
  ends_at: string | null;
}

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const { playSound } = useClickSound();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [hasParticipated, setHasParticipated] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const isEnglish = false;
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // حساب الوقت المتبقي
  useEffect(() => {
    if (!campaign?.ends_at) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(campaign.ends_at!).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days} ${t('أيام', 'days')} ${hours} ${t('ساعات', 'hours')}`);
        } else if (hours > 0) {
          setTimeLeft(`${hours} ${t('ساعات', 'hours')} ${minutes} ${t('دقائق', 'minutes')}`);
        } else {
          setTimeLeft(`${minutes} ${t('دقائق', 'minutes')}`);
        }
      } else {
        setTimeLeft(t('انتهت', 'Ended'));
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [campaign?.ends_at, t]);

  // تحميل تفاصيل الكامبين
  useEffect(() => {
    const loadCampaign = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCampaign(data);

        // التحقق من المشاركة السابقة
        if (telegramUser?.id) {
          const { data: participation } = await supabase
            .from('campaign_participants')
            .select('*')
            .eq('campaign_id', id)
            .eq('user_id', telegramUser.id)
            .single();

          setHasParticipated(!!participation);
        }
      } catch (error) {
        console.error('Error loading campaign:', error);
        toast({
          title: t('خطأ', 'Error'),
          description: t('فشل في تحميل تفاصيل الكامبين', 'Failed to load campaign details'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [id, telegramUser, toast, t]);

  const handleParticipate = async () => {
    if (!campaign || !telegramUser) return;

    setParticipating(true);
    try {
      // إدراج المشاركة
      const { error } = await supabase
        .from('campaign_participants')
        .insert({
          campaign_id: campaign.id,
          user_id: telegramUser.id,
          user_telegram_id: telegramUser.telegram_id,
          participation_type: 'direct',
          verified_channel_membership: true // سيتم التحقق لاحقاً
        });

      if (error) throw error;

      setHasParticipated(true);
      toast({
        title: t('تم!', 'Done!'),
        description: t('تم تسجيل مشاركتك بنجاح', 'Your participation has been registered successfully'),
        variant: 'default',
      });

      // إعادة تحميل تفاصيل الكامبين لتحديث عدد المشاركين
      const { data: updatedCampaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();

      if (updatedCampaign) {
        setCampaign(updatedCampaign);
      }
    } catch (error) {
      console.error('Error participating in campaign:', error);
      toast({
        title: t('خطأ', 'Error'),
        description: t('فشل في تسجيل المشاركة', 'Failed to register participation'),
        variant: 'destructive',
      });
    } finally {
      setParticipating(false);
    }
  };

  const handleShare = async () => {
    if (!campaign || !telegramUser) return;

    // إنشاء رابط الإحالة
    const referralLink = `https://t.me/GCoinArabianBot/start?startapp=campaign_${campaign.id}_ref_${telegramUser.telegram_id}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: t('تم النسخ!', 'Copied!'),
        description: t('تم نسخ رابط الإحالة', 'Referral link copied'),
        variant: 'default',
      });
    } catch (error) {
      // Fallback for older browsers
      toast({
        title: t('رابط الإحالة', 'Referral Link'),
        description: referralLink,
        variant: 'default',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Button variant="ghost" size="icon" onClick={() => {
            playSound();
            navigate(-1);
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">
              {t('الكامبين غير موجود', 'Campaign Not Found')}
            </h1>
            <p className="text-muted-foreground">
              {t('لم يتم العثور على الكامبين المطلوب', 'The requested campaign was not found')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => {
            playSound();
            navigate(-1);
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {t('تفاصيل الكامبين', 'Campaign Details')}
          </h1>
        </div>

        {/* Campaign Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {campaign.campaign_name}
                </CardTitle>
                <CardDescription>
                  {campaign.liquidity_amount.toLocaleString()} {campaign.payment_type.toUpperCase()}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {campaign.payment_type.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {/* Campaign Image */}
            {campaign.campaign_image_url && (
              <div className="mb-6 flex justify-center">
                <img 
                  src={campaign.campaign_image_url} 
                  alt="Campaign"
                  className="w-40 h-40 object-cover rounded-full border-4 border-primary/20"
                />
              </div>
            )}

            {/* Campaign Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{campaign.total_participants}</div>
                <div className="text-sm text-muted-foreground">
                  {t('مشارك', 'Participants')}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-lg font-bold">{timeLeft}</div>
                <div className="text-sm text-muted-foreground">
                  {t('متبقي', 'Remaining')}
                </div>
              </div>
            </div>

            {/* Channel Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <h3 className="font-semibold mb-2">
                {t('متطلبات المشاركة', 'Participation Requirements')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('يجب الاشتراك في قناة:', 'Must subscribe to channel:')} @{campaign.channel_username}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!hasParticipated ? (
                <Button 
                  onClick={handleParticipate}
                  disabled={participating || campaign.status !== 'active'}
                  className="w-full py-6 text-lg font-semibold"
                >
                  {participating ? 
                    t('جاري التسجيل...', 'Registering...') : 
                    t('المشاركة', 'Participate')
                  }
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  disabled
                  className="w-full py-6 text-lg font-semibold"
                >
                  {t('تم التسجيل ✓', 'Registered ✓')}
                </Button>
              )}

              <Button 
                variant="outline"
                onClick={handleShare}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('مشاركة رابط الإحالة', 'Share Referral Link')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}