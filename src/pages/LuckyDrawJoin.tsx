import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Users, Clock, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface LuckyDraw {
  id: string;
  title: string;
  description: string;
  image_url: string;
  channel_username: string;
  mandatory_channel_username: string;
  require_channel_subscription: boolean;
  entry_fee: number;
  max_participants: number;
  total_participants: number;
  winner_count: number;
  prize_description: string;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
  creator_id: string;
}

const LuckyDrawJoin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const queryClient = useQueryClient();
  const [isParticipating, setIsParticipating] = useState(false);
  const [isChannelMember, setIsChannelMember] = useState<boolean | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);

  // Fetch lucky draw details
  const { data: luckyDraw, isLoading } = useQuery({
    queryKey: ["lucky-draw", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lucky_draws")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as LuckyDraw;
    },
    enabled: !!id,
  });

  // Check if user is already participating
  const { data: isAlreadyParticipating } = useQuery({
    queryKey: ["is-participating", id, telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id || !id) return false;
      
      const { data, error } = await supabase
        .from("lucky_draw_participants")
        .select("id")
        .eq("draw_id", id)
        .eq("participant_id", telegramUser.id)
        .single();
      
      return !!data;
    },
    enabled: !!telegramUser?.id && !!id,
  });

  // Check channel membership
  const checkChannelMembership = async () => {
    if (!telegramUser?.telegram_id || !luckyDraw?.channel_username) return;
    
    setIsCheckingMembership(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-channel-membership', {
        body: { 
          user_id: telegramUser.telegram_id,
          channel_username: luckyDraw.channel_username 
        }
      });
      
      if (error) throw error;
      setIsChannelMember(data.is_member);
    } catch (error) {
      console.error('خطأ في التحقق من عضوية القناة:', error);
      setIsChannelMember(false);
    } finally {
      setIsCheckingMembership(false);
    }
  };

  // Check membership when draw data is loaded
  useEffect(() => {
    if (luckyDraw && telegramUser) {
      checkChannelMembership();
    }
  }, [luckyDraw, telegramUser]);

  // Join draw mutation
  const joinDrawMutation = useMutation({
    mutationFn: async () => {
      if (!telegramUser || !luckyDraw) throw new Error("بيانات غير مكتملة");

      // Check if user is member of the channel (mandatory check)
      if (isChannelMember === false) {
        throw new Error(`يجب الانضمام لقناة السحب @${luckyDraw.channel_username} أولاً`);
      }

      if (isChannelMember === null) {
        throw new Error('جاري التحقق من عضوية القناة، الرجاء المحاولة مرة أخرى');
      }

      // Check if draw is full
      if (luckyDraw.max_participants && luckyDraw.total_participants >= luckyDraw.max_participants) {
        throw new Error("السحبة مكتملة العدد");
      }

      // Check if draw is still active
      if (luckyDraw.status !== "active") {
        throw new Error("السحبة غير نشطة");
      }

      // Check if draw has ended
      if (luckyDraw.ends_at && new Date(luckyDraw.ends_at) <= new Date()) {
        throw new Error("انتهت مدة السحبة");
      }

      // Deduct entry fee if required using secure balance update
      if (luckyDraw.entry_fee > 0) {
        const { error: balanceError } = await supabase.functions.invoke('secure-balance-update', {
          body: {
            telegram_id: telegramUser.telegram_id,
            balance_type: 'ton_balance',
            amount: luckyDraw.entry_fee,
            operation: 'subtract',
            source: 'lucky_draw_entry',
            metadata: {
              draw_id: luckyDraw.id,
              draw_title: luckyDraw.title
            }
          }
        });

        if (balanceError) throw balanceError;
      }

      // Add participant
      const { error: participantError } = await supabase
        .from("lucky_draw_participants")
        .insert({
          draw_id: luckyDraw.id,
          participant_id: telegramUser.id,
          telegram_user_id: telegramUser.telegram_id,
        });

      if (participantError) throw participantError;

      // Update total participants count
      const { error: updateError } = await supabase
        .from("lucky_draws")
        .update({ total_participants: luckyDraw.total_participants + 1 })
        .eq("id", luckyDraw.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "تم الانضمام بنجاح!",
        description: "تم تسجيلك في السحبة بنجاح. بالتوفيق!",
      });
      queryClient.invalidateQueries({ queryKey: ["lucky-draw", id] });
      queryClient.invalidateQueries({ queryKey: ["is-participating", id] });
      setIsParticipating(true);
    },
    onError: (error) => {
      toast({
        title: "خطأ في الانضمام",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "انتهى";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days} يوم و ${hours} ساعة`;
    if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
    return `${minutes} دقيقة`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!luckyDraw) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <Gift className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">السحبة غير موجودة</h1>
          <p className="text-muted-foreground mb-6">لا يمكن العثور على السحبة المطلوبة</p>
          <Button onClick={() => navigate("/lucky-draws")}>
            العودة للسحوبات
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = luckyDraw.ends_at && new Date(luckyDraw.ends_at) <= new Date();
  const isFull = luckyDraw.max_participants && luckyDraw.total_participants >= luckyDraw.max_participants;
  const canJoin = luckyDraw.status === "active" && !isExpired && !isFull && !isAlreadyParticipating && !isParticipating && isChannelMember;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lucky-draws")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">المشاركة في السحبة</h1>
            <p className="text-sm text-muted-foreground">راجع التفاصيل وانضم للسحبة</p>
          </div>
        </div>

        {/* Draw Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">{luckyDraw.title}</CardTitle>
                <CardDescription>{luckyDraw.description}</CardDescription>
              </div>
              <Badge variant={luckyDraw.status === "active" ? "default" : "secondary"}>
                {luckyDraw.status === "active" ? "نشط" : luckyDraw.status === "completed" ? "مكتمل" : "ملغي"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {luckyDraw.image_url && (
              <img
                src={luckyDraw.image_url}
                alt={luckyDraw.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>المشاركين: {luckyDraw.total_participants}</span>
                {luckyDraw.max_participants && <span>/ {luckyDraw.max_participants}</span>}
              </div>
              
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-secondary" />
                <span>الفائزين: {luckyDraw.winner_count}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-accent" />
                <span className="text-green-600 font-medium">رسوم الدخول: مجاني</span>
              </div>
              
              {luckyDraw.ends_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>متبقي: {formatTimeRemaining(luckyDraw.ends_at)}</span>
                </div>
              )}
            </div>
            
            {luckyDraw.prize_description && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium">الجائزة:</p>
                <p className="text-sm text-muted-foreground">{luckyDraw.prize_description}</p>
              </div>
            )}

            {/* Status Messages */}
            {isAlreadyParticipating && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  أنت مشارك بالفعل في هذه السحبة. بالتوفيق!
                </AlertDescription>
              </Alert>
            )}

            {isParticipating && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  تم تسجيلك في السحبة بنجاح! بالتوفيق!
                </AlertDescription>
              </Alert>
            )}

            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  انتهت مدة هذه السحبة
                </AlertDescription>
              </Alert>
            )}

            {isFull && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  السحبة مكتملة العدد
                </AlertDescription>
              </Alert>
            )}


            {/* Channel Membership Check */}
            {isCheckingMembership && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  جاري التحقق من عضوية القناة...
                </AlertDescription>
              </Alert>
            )}

            {isChannelMember === false && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  يجب الانضمام لقناة السحب @{luckyDraw.channel_username} أولاً للمشاركة
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const channelUrl = `https://t.me/${luckyDraw.channel_username.replace('@', '')}`;
                        window.open(channelUrl, '_blank');
                      }}
                    >
                      انضم للقناة
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2"
                      onClick={checkChannelMembership}
                      disabled={isCheckingMembership}
                    >
                      {isCheckingMembership ? "جاري التحقق..." : "تحقق من العضوية"}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isChannelMember === true && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ أنت عضو في قناة السحب. يمكنك المشاركة الآن!
                </AlertDescription>
              </Alert>
            )}

            {/* Channel Requirements */}
            {luckyDraw.require_channel_subscription && luckyDraw.mandatory_channel_username && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  يجب الاشتراك في القناة @{luckyDraw.mandatory_channel_username} للمشاركة في هذه السحبة
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/lucky-draws/${luckyDraw.id}`)}
                variant="outline"
                className="flex-1"
              >
                عرض التفاصيل الكاملة
              </Button>
              
              {canJoin && (
                <Button
                  onClick={() => joinDrawMutation.mutate()}
                  disabled={joinDrawMutation.isPending}
                  className="flex-1"
                >
                  {joinDrawMutation.isPending ? "جاري الانضمام..." : "انضم للسحبة"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LuckyDrawJoin;