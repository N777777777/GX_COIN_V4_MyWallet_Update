import { useState, useEffect } from "react";
import { Plus, Gift, Users, Clock, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
const LuckyDraws = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    telegramUser
  } = useTelegramData();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "my-draws">("active");
  const [verifiedDraws, setVerifiedDraws] = useState<Set<string>>(new Set());
  const [userParticipations, setUserParticipations] = useState<Set<string>>(new Set());

  // Fetch active lucky draws
  const {
    data: luckyDraws,
    isLoading
  } = useQuery({
    queryKey: ["lucky-draws", activeTab],
    queryFn: async () => {
      let query = supabase.from("lucky_draws").select(`
          *,
          lucky_draw_participants(count),
          lucky_draw_winners(*)
        `);
      if (activeTab === "active") {
        query = query.eq("status", "active");
      } else if (activeTab === "my-draws" && telegramUser?.telegram_id) {
        // Get user ID first
        const {
          data: userData
        } = await supabase.from("telegram_users").select("id").eq("telegram_id", telegramUser.telegram_id).single();
        if (userData) {
          query = query.eq("creator_id", userData.id);
        }
      }
      const {
        data,
        error
      } = await query.order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!telegramUser?.telegram_id
  });

  // Fetch user participations for current draws
  const {
    data: participations
  } = useQuery({
    queryKey: ["user-participations", telegramUser?.telegram_id],
    queryFn: async () => {
      if (!telegramUser?.telegram_id) return [];
      const {
        data,
        error
      } = await supabase.from("lucky_draw_participants").select("draw_id").eq("telegram_user_id", telegramUser.telegram_id);
      if (error) throw error;
      return data;
    },
    enabled: !!telegramUser?.telegram_id
  });

  // Update user participations state when data changes
  useEffect(() => {
    if (participations) {
      setUserParticipations(new Set(participations.map(p => p.draw_id)));
    }
  }, [participations]);

  // Cancel draw mutation
  const cancelDrawMutation = useMutation({
    mutationFn: async (drawId: string) => {
      if (!telegramUser?.id) throw new Error("يجب تسجيل الدخول أولاً");
      const {
        data,
        error
      } = await supabase.functions.invoke('cancel-draw', {
        body: {
          drawId: drawId,
          userId: telegramUser.id
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم إلغاء السحب بنجاح",
        description: "تم إلغاء السحب بنجاح"
      });
      queryClient.invalidateQueries({
        queryKey: ["lucky-draws"]
      });
    },
    onError: error => {
      toast({
        title: "خطأ في إلغاء السحب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // المشاركة في السحب
  const joinDrawMutation = useMutation({
    mutationFn: async (drawId: string) => {
      if (!telegramUser?.telegram_id) throw new Error("يجب تسجيل الدخول أولاً");

      // إضافة المشارك
      const {
        error: participantError
      } = await supabase.from("lucky_draw_participants").insert({
        draw_id: drawId,
        telegram_user_id: telegramUser.telegram_id,
        participant_id: telegramUser.id
      });
      if (participantError) throw participantError;

      // الحصول على العدد الحالي وتحديثه
      const {
        data: currentDraw
      } = await supabase.from("lucky_draws").select("total_participants").eq("id", drawId).single();
      if (currentDraw) {
        const {
          error: updateError
        } = await supabase.from("lucky_draws").update({
          total_participants: currentDraw.total_participants + 1
        }).eq('id', drawId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast({
        title: "تمت المشاركة",
        description: "تم تسجيل مشاركتك في السحب بنجاح"
      });
      queryClient.invalidateQueries({
        queryKey: ["lucky-draws"]
      });
      queryClient.invalidateQueries({
        queryKey: ["user-participations"]
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast({
          title: "مشارك مسبقاً",
          description: "أنت مشارك في هذا السحب بالفعل",
          variant: "destructive"
        });
      } else {
        toast({
          title: "خطأ في المشاركة",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });

  // التحقق من عضوية القناة
  const checkChannelMembership = async (draw: any) => {
    if (!telegramUser?.telegram_id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      return false;
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('check-channel-membership', {
        body: {
          user_id: telegramUser.telegram_id,
          channel_username: draw.channel_username
        }
      });
      if (error) {
        console.error('Error checking membership:', error);
        toast({
          title: "خطأ في التحقق",
          description: "فشل في التحقق من عضوية القناة",
          variant: "destructive"
        });
        return false;
      }

      // التحقق من البيانات المرجعة
      if (!data?.is_member) {
        toast({
          title: "يجب الانضمام للقناة",
          description: `يجب عليك الانضمام لقناة @${draw.channel_username} أولاً للمشاركة في السحب`,
          variant: "destructive"
        });
        return false;
      }
      toast({
        title: "✅ مبروك! أنت عضو في القناة",
        description: "يمكنك الآن المشاركة في السحب"
      });

      // إضافة السحب للمصدقين
      setVerifiedDraws(prev => new Set(prev).add(draw.id));
      return true;
    } catch (error) {
      console.error('Error checking channel membership:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في التحقق من عضوية القناة",
        variant: "destructive"
      });
      return false;
    }
  };
  const handleParticipation = async (draw: any) => {
    // التحقق من عضوية القناة فقط دون أي توجيه
    await checkChannelMembership(draw);
  };
  const handleJoinDraw = (draw: any) => {
    // التحقق من حالة التحقق أولاً
    if (!verifiedDraws.has(draw.id)) {
      return; // لا تفعل شيئاً إذا لم يتم التحقق
    }

    // تنفيذ المشاركة الفعلية
    joinDrawMutation.mutate(draw.id);
  };
  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "انتهى";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    if (days > 0) return `${days} يوم`;
    return `${hours} ساعة`;
  };
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Gift className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                سحوبات الحظ
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground">شارك في سحوبات الحظ واربح جوائز مذهلة</p>
          
          <Button onClick={() => navigate("/lucky-draws/create")} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
            <Plus className="h-4 w-4 mr-2" />
            إنشاء سحب جديد
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-card rounded-lg p-1">
          <Button variant={activeTab === "active" ? "default" : "ghost"} onClick={() => setActiveTab("active")} className="flex-1">
            السحوبات النشطة
          </Button>
          <Button variant={activeTab === "my-draws" ? "default" : "ghost"} onClick={() => setActiveTab("my-draws")} className="flex-1">
            سحوباتي
          </Button>
        </div>

        {/* Lucky Draws List */}
        <div className="grid gap-4">
          {isLoading ? <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div> : luckyDraws && luckyDraws.length > 0 ? luckyDraws.map(draw => <Card key={draw.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{draw.title}</CardTitle>
                      <CardDescription>{draw.description}</CardDescription>
                    </div>
                    <Badge variant={draw.status === "active" ? "default" : "secondary"}>
                      {draw.status === "active" ? "نشط" : draw.status === "completed" ? "مكتمل" : "ملغي"}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {draw.image_url && <img src={draw.image_url} alt={draw.title} className="w-full h-48 object-cover rounded-lg" />}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>المشاركين: {draw.total_participants}</span>
                      {draw.max_participants && <span>/ {draw.max_participants}</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-secondary" />
                      <span>الفائزين: {draw.winner_count}</span>
                    </div>
                    
                    
                    
                    {draw.ends_at && <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>متبقي: {formatTimeRemaining(draw.ends_at)}</span>
                      </div>}
                  </div>
                  
                  {draw.prize_description && <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium">الجائزة:</p>
                      <p className="text-sm text-muted-foreground">{draw.prize_description}</p>
                    </div>}
                  
                  <div className="flex flex-col gap-2">
                    {draw.status === "active" && activeTab !== "my-draws" && <>
                        <Button onClick={() => {
                  const channelUrl = `https://t.me/${draw.channel_username.replace('@', '')}`;
                  window.open(channelUrl, '_blank');
                }} variant="default" className="w-full">
                          انضمام للقناة
                        </Button>
                        <Button onClick={() => handleParticipation(draw)} variant="outline" className="w-full">
                          تحقق من الانضمام
                        </Button>
                        <Button onClick={() => handleJoinDraw(draw)} disabled={!verifiedDraws.has(draw.id) || userParticipations.has(draw.id)} className={`w-full ${userParticipations.has(draw.id) ? 'bg-green-600 hover:bg-green-700 text-white' : verifiedDraws.has(draw.id) ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
                          {userParticipations.has(draw.id) ? 'مشارك بالفعل ✓' : verifiedDraws.has(draw.id) ? 'شارك في السحب' : 'يجب التحقق أولاً'}
                        </Button>
                      </>}

                    {activeTab === "my-draws" && draw.status === "active" && <Button onClick={() => cancelDrawMutation.mutate(draw.id)} disabled={cancelDrawMutation.isPending} variant="destructive" className="flex-1">
                        {cancelDrawMutation.isPending ? "جاري الإلغاء..." : "إلغاء السحب"}
                      </Button>}
                  </div>
                </CardContent>
              </Card>) : <div className="text-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد سحوبات حظ</h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === "active" && "لا توجد سحوبات حظ نشطة حالياً"}
                {activeTab === "my-draws" && "لم تقم بإنشاء أي سحوبات حظ بعد"}
              </p>
              {activeTab === "my-draws" && <Button onClick={() => navigate("/lucky-draws/create")}>
                  إنشاء أول سحب لك
                </Button>}
            </div>}
        </div>
      </div>
    </div>;
};
export default LuckyDraws;