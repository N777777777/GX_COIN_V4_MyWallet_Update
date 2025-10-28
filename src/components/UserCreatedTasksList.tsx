import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Coins, Clock, CheckCircle, ExternalLink } from "lucide-react";

interface Props {
  isEnglish?: boolean;
}

export function UserCreatedTasksList({ isEnglish = false }: Props) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [participatingTaskId, setParticipatingTaskId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  useEffect(() => {
    fetchActiveTasks();
  }, []);

  const fetchActiveTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_created_tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: t("خطأ", "Error"),
          description: t("فشل في جلب المهام", "Failed to fetch tasks"),
          variant: "destructive"
        });
        setTasks([]);
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTask = (task: any) => {
    window.open(task.channel_or_post_link, '_blank');
    setPendingTaskId(task.id);
  };

  const handleVerify = async (taskId: string) => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      toast({
        title: t("خطأ", "Error"),
        description: t("لم يتم العثور على معرف المستخدم", "User ID not found"),
        variant: "destructive"
      });
      return;
    }

    setParticipatingTaskId(taskId);
    
    try {
      const response = await supabase.functions.invoke('verify-channel-membership', {
        body: {
          task_id: taskId,
          user_telegram_id: parseInt(storedTelegramId)
        }
      });

      if (response.error) {
        throw response.error;
      }

      const { data } = response;

      if (!data.success) {
        throw new Error(data.message || data.error || 'فشل في التحقق من العضوية');
      }

      toast({
        title: t("نجحت المشاركة! 🎉", "Participation Successful! 🎉"),
        description: data.message || t("تم تأكيد اشتراكك وحصلت على المكافأة", "Your subscription confirmed and reward added")
      });

      setPendingTaskId(null);
      await fetchActiveTasks();

    } catch (error: any) {
      console.error('Error participating in task:', error);
      toast({
        title: t("خطأ في المشاركة", "Participation Error"),
        description: error.message || t("فشل في التحقق من العضوية", "Failed to verify membership"),
        variant: "destructive"
      });
    } finally {
      setParticipatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {t("لا توجد مهام متاحة", "No Tasks Available")}
          </h3>
          <p className="text-muted-foreground">
            {t("لا توجد مهام نشطة حالياً. تحقق مرة أخرى لاحقاً!", "No active tasks currently. Check back later!")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const progress = (task.current_participants / task.required_participants) * 100;
        const isCompleted = task.status === 'completed' || task.current_participants >= task.required_participants;
        
        return (
          <Card key={task.id} className={`transition-all duration-200 ${isCompleted ? 'opacity-60' : 'hover:shadow-md'}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    {task.title || t("انضم إلى القناة", "Join Channel")}
                    {isCompleted && (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("مكتملة", "Completed")}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.channel_or_post_link && task.channel_or_post_link.includes('t.me/') 
                      ? `${t("اشترك في", "Subscribe to")} ${task.channel_or_post_link.split('/').pop()}` 
                      : t("اشترك في القناة واحصل على المكافأة", "Subscribe to the channel and get rewarded")
                    }
                  </p>
                </div>
                {task.image_url && (
                  <img 
                    src={task.image_url} 
                    alt="Task image" 
                    className="w-16 h-16 rounded-lg object-cover ml-4"
                  />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-green-600">
                    {task.reward_per_person} TON
                  </span>
                  <span className="text-muted-foreground">
                    {t("لكل مشترك", "per subscriber")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(task.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("التقدم", "Progress")}</span>
                  <span>
                    {task.current_participants} / {task.required_participants} {t("مشترك", "subscribers")}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {!isCompleted && (
                <div className="space-y-2">
                  {pendingTaskId !== task.id ? (
                    <Button 
                      onClick={() => handleOpenTask(task)}
                      className="w-full"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t(`شارك واحصل على ${task.reward_per_person} TON`, `Participate and Get ${task.reward_per_person} TON`)}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleVerify(task.id)}
                      disabled={participatingTaskId === task.id}
                      className="w-full"
                      size="lg"
                      variant="secondary"
                    >
                      {participatingTaskId === task.id 
                        ? t("جاري التحقق...", "Verifying...") 
                        : t("تحقق من الاشتراك ✓", "Verify Subscription ✓")
                      }
                    </Button>
                  )}
                </div>
              )}

              {isCompleted && (
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="text-green-700 font-medium">
                    {t("تمت المهمة بنجاح! 🎉", "Task Completed Successfully! 🎉")}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {t("تم الوصول للعدد المطلوب من المشتركين", "Target number of subscribers reached")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}