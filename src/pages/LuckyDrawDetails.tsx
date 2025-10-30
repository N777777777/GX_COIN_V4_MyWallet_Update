import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Users, Clock, Trophy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClickSound } from "@/hooks/useClickSound";

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

interface Participant {
  id: string;
  telegram_user_id: number;
  joined_at: string;
}

interface Winner {
  id: string;
  telegram_user_id: number;
  prize_position: number;
  selected_at: string;
}

const LuckyDrawDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const queryClient = useQueryClient();
  const { playSound } = useClickSound();
  
  const [draw, setDraw] = useState<LuckyDraw | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Mutation لإلغاء السحبة
  const cancelDrawMutation = useMutation({
    mutationFn: async () => {
      if (!telegramUser?.id) throw new Error("يجب تسجيل الدخول أولاً");
      
      const { data, error } = await supabase.functions.invoke('cancel-draw', {
        body: { 
          drawId: id, 
          userId: telegramUser.id 
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح!",
        description: "تم إلغاء السحبة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['telegram-user'] });
      navigate("/lucky-draws");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إلغاء السحبة",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (id) {
      fetchDrawDetails();
      checkParticipation();
    }
  }, [id, telegramUser]);

  const fetchDrawDetails = async () => {
    try {
      const { data: drawData, error: drawError } = await supabase
        .from("lucky_draws")
        .select("*")
        .eq("id", id)
        .single();

      if (drawError) throw drawError;
      setDraw(drawData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("lucky_draw_participants")
        .select("*")
        .eq("draw_id", id);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Fetch winners
      const { data: winnersData, error: winnersError } = await supabase
        .from("lucky_draw_winners")
        .select("*")
        .eq("draw_id", id);

      if (winnersError) throw winnersError;
      setWinners(winnersData || []);
    } catch (error) {
      console.error("Error fetching draw details:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل تفاصيل السحبة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkParticipation = async () => {
    if (!telegramUser?.telegram_id) return;

    try {
      const { data, error } = await supabase
        .from("lucky_draw_participants")
        .select("id")
        .eq("draw_id", id)
        .eq("telegram_user_id", telegramUser.telegram_id)
        .single();

      if (!error && data) {
        setHasJoined(true);
      }
    } catch (error) {
      // User hasn't joined yet
    }
  };

  const joinDraw = async () => {
    if (!telegramUser?.telegram_id || !draw) return;

    setParticipating(true);
    try {
      // Lucky draws are now free - no entry fee required

      // Check mandatory channel subscription if required
      if (draw.require_channel_subscription && draw.mandatory_channel_username) {
        // Here you would typically check with your Telegram bot
        // For now, we'll trust the user
      }

      const { data, error } = await supabase
        .from("lucky_draw_participants")
        .insert({
          draw_id: id,
          participant_id: telegramUser.id,
          telegram_user_id: telegramUser.telegram_id,
        });

      if (error) throw error;

      // Deduct entry fee if applicable
      if (draw.entry_fee > 0) {
        const { error: balanceError } = await supabase
          .from("telegram_users")
          .update({
            ton_balance: telegramUser.ton_balance - draw.entry_fee
          })
          .eq("id", telegramUser.id);

        if (balanceError) throw balanceError;
      }

      // Update total participants count
      const { error: updateError } = await supabase
        .from("lucky_draws")
        .update({
          total_participants: draw.total_participants + 1
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setHasJoined(true);
      toast({
        title: "تم بنجاح!",
        description: "تم انضمامك للسحبة بنجاح",
      });

      fetchDrawDetails();
    } catch (error) {
      console.error("Error joining draw:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الانضمام للسحبة",
        variant: "destructive",
      });
    } finally {
      setParticipating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!draw) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold">السحبة غير موجودة</h2>
            <Button onClick={() => navigate("/lucky-draws")} className="mt-4">
              العودة للسحوبات
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const timeLeft = new Date(draw.ends_at).getTime() - Date.now();
  const isExpired = timeLeft <= 0;
  const canJoin = draw.status === "active" && !isExpired && !hasJoined && 
    (draw.max_participants ? participants.length < draw.max_participants : true);
  
  // التحقق من أن المستخدم هو منشئ السحبة ويمكنه إلغاؤها
  const canCancel = draw.status === "active" && 
    telegramUser?.id === draw.creator_id && 
    participants.length < 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            playSound();
            navigate("/lucky-draws");
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              تفاصيل السحبة
            </h1>
          </div>
        </div>

        {/* Draw Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{draw.title}</CardTitle>
                <CardDescription>{draw.description}</CardDescription>
              </div>
              <Badge variant={draw.status === "active" ? "default" : "secondary"}>
                {draw.status === "active" ? "نشط" : draw.status === "completed" ? "مكتمل" : "ملغي"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {draw.image_url && (
              <img
                src={draw.image_url}
                alt={draw.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            {/* Draw Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-medium">الجائزة:</span>
                  <span>{draw.prize_description}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">المشاركين:</span>
                  <span>{participants.length}</span>
                  {draw.max_participants && <span>/ {draw.max_participants}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <span className="font-medium">عدد الفائزين:</span>
                  <span>{draw.winner_count}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">رسوم المشاركة:</span>
                  <span className="text-green-600 font-medium">مجاني</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">ينتهي في:</span>
                  <span>{new Date(draw.ends_at).toLocaleDateString('ar-SA')}</span>
                </div>

                {draw.channel_username && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    <span className="font-medium">القناة:</span>
                    <a 
                      href={`https://t.me/${draw.channel_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @{draw.channel_username}
                    </a>
                  </div>
                )}

                {draw.require_channel_subscription && draw.mandatory_channel_username && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-500">اشتراك إجباري:</span>
                    <a 
                      href={`https://t.me/${draw.mandatory_channel_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:underline"
                    >
                      @{draw.mandatory_channel_username}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Join/Cancel Buttons */}
            <div className="space-y-3">
              {canJoin && (
                <Button 
                  onClick={joinDraw}
                  disabled={participating}
                  className="w-full"
                  size="lg"
                >
                  {participating ? "جاري الانضمام..." : "انضم للسحبة (مجاناً)"}
                </Button>
              )}

              {canCancel && (
                <Button 
                  onClick={() => cancelDrawMutation.mutate()}
                  disabled={cancelDrawMutation.isPending}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {cancelDrawMutation.isPending ? "جاري الإلغاء..." : "إلغاء السحبة"}
                </Button>
              )}
            </div>

            {hasJoined && (
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-green-600 font-medium">✅ أنت مشارك في هذه السحبة</p>
              </div>
            )}

            {isExpired && (
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <p className="text-red-600 font-medium">⏰ انتهت فترة الاشتراك في هذه السحبة</p>
              </div>
            )}

            {draw.status === "cancelled" && (
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <p className="text-yellow-600 font-medium">❌ تم إلغاء هذه السحبة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Winners */}
        {winners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                الفائزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {winners.map((winner, index) => (
                  <div key={winner.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="font-medium">المركز {winner.prize_position}</span>
                    <span>معرف المستخدم: {winner.telegram_user_id}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(winner.selected_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LuckyDrawDetails;