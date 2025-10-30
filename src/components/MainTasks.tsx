import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Users, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface MainTasksProps {
  onReward: (amount: number, currency: 'coins' | 'pepe') => void;
  isEnglish?: boolean;
}
export function MainTasks({
  onReward,
  isEnglish = false
}: MainTasksProps) {
  const {
    toast
  } = useToast();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // 4 hidden qualification tasks
  const qualificationTasks = [{
    id: 'qualification_1',
    title: t('مهمة التأهيل الأولى', 'First Qualification Task'),
    description: t('أكمل هذه المهمة للحصول على تأهيل خاص', 'Complete this task to get special qualification'),
    reward: 1000,
    hidden: true,
    campaignLink: 'https://t.me/qualification_channel_1'
  }, {
    id: 'qualification_2',
    title: t('مهمة التأهيل الثانية', 'Second Qualification Task'),
    description: t('أكمل هذه المهمة للحصول على تأهيل خاص', 'Complete this task to get special qualification'),
    reward: 1500,
    hidden: true,
    campaignLink: 'https://t.me/qualification_channel_2'
  }, {
    id: 'qualification_3',
    title: t('مهمة التأهيل الثالثة', 'Third Qualification Task'),
    description: t('أكمل هذه المهمة للحصول على تأهيل خاص', 'Complete this task to get special qualification'),
    reward: 2000,
    hidden: true,
    campaignLink: 'https://t.me/qualification_channel_3'
  }, {
    id: 'qualification_4',
    title: t('مهمة التأهيل الرابعة', 'Fourth Qualification Task'),
    description: t('أكمل هذه المهمة للحصول على تأهيل خاص', 'Complete this task to get special qualification'),
    reward: 2500,
    hidden: true,
    campaignLink: 'https://t.me/qualification_channel_4'
  }];

  // Visible main tasks
  const mainTasks = [{
    id: 'join_gcoin_community',
    title: t('انضم لمجتمع G COIN', 'Join G COIN Community'),
    description: t('انضم لقناة G COIN الرسمية واحصل على 500 PEPE', 'Join the official G COIN channel and get 500 PEPE'),
    reward: 500,
    hidden: false,
    campaignLink: 'https://t.me/G_COIN_V3'
  }, {
    id: 'follow_gcoin_twitter',
    title: 'Follow G COIN on Twitter',
    description: 'Follow G COIN official Twitter account and get 100 PEPE',
    reward: 100,
    hidden: false,
    campaignLink: 'https://x.com/G_COIN_V4'
  }, {
    id: 'follow_kynavor_twitter',
    title: 'Follow Kynavor on Twitter',
    description: 'Follow Kynavor on Twitter and get 100 PEPE',
    reward: 100,
    hidden: false,
    campaignLink: 'https://x.com/Kynavor'
  }, {
    id: 'follow_mys_twitter',
    title: 'Follow MY_S on Twitter',
    description: 'Follow MY_S on Twitter and get 100 PEPE',
    reward: 100,
    hidden: false,
    campaignLink: 'https://x.com/MY_S_15'
  }, {
    id: 'follow_kbcrypto_twitter',
    title: 'Follow K.B CRYPTO on Twitter',
    description: 'Follow K.B CRYPTO on Twitter and get 100 PEPE',
    reward: 100,
    hidden: false,
    campaignLink: 'https://x.com/KhaledSlm178830'
  }, ...qualificationTasks];

  // Check completed tasks
  const checkCompletedTasks = async () => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      setIsLoadingTasks(false);
      return;
    }
    try {
      const {
        data: userData
      } = await supabase.from('telegram_users').select('id').eq('telegram_id', parseInt(storedTelegramId)).maybeSingle();
      if (!userData) {
        setIsLoadingTasks(false);
        return;
      }
      const {
        data: completedTasksData
      } = await supabase.from('completed_tasks').select('task_id').eq('telegram_user_id', userData.id).eq('is_latest_attempt', true);
      const completedTaskIds = completedTasksData?.map(t => t.task_id) || [];
      setCompletedTasks(completedTaskIds);
    } catch (error) {
      console.error('Error checking completed tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };
  useEffect(() => {
    checkCompletedTasks();

    // Subscribe to real-time updates for completed tasks
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return;

    const channel = supabase
      .channel('completed-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completed_tasks'
        },
        (payload) => {
          // Re-check completed tasks when a new task is completed
          checkCompletedTasks();
        }
      )
      .subscribe();

    // Re-check when component becomes visible (user returns to page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkCompletedTasks();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  const handleOpenTask = (task: any) => {
    if (completedTasks.includes(task.id)) {
      toast({
        title: t("مهمة مكتملة", "Task Completed"),
        description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
        variant: "default"
      });
      return;
    }

    window.open(task.campaignLink, '_blank');
    setPendingTasks(prev => [...prev, task.id]);
  };

  const handleVerifyTask = async (task: any) => {
    // التحقق من أن المهمة ليست مكتملة بالفعل
    if (completedTasks.includes(task.id)) {
      toast({
        title: t("مهمة مكتملة", "Task Completed"),
        description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
        variant: "default"
      });
      setPendingTasks(prev => prev.filter(id => id !== task.id));
      return;
    }

    setVerifyingTaskId(task.id);

    try {
      const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
      if (!storedTelegramId) {
        toast({
          title: t("خطأ", "Error"),
          description: t("لم يتم العثور على معرف المستخدم", "User ID not found"),
          variant: "destructive"
        });
        return;
      }

      // إعادة التحقق من المهام المكتملة من قاعدة البيانات قبل المتابعة
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', parseInt(storedTelegramId))
        .maybeSingle();

      if (!userData) {
        toast({
          title: t("خطأ", "Error"),
          description: t("المستخدم غير موجود", "User not found"),
          variant: "destructive"
        });
        return;
      }

      // التحقق من أن المهمة غير مكتملة في قاعدة البيانات
      const { data: existingTask } = await supabase
        .from('completed_tasks')
        .select('id')
        .eq('telegram_user_id', userData.id)
        .eq('task_id', task.id)
        .eq('is_latest_attempt', true)
        .maybeSingle();

      if (existingTask) {
        toast({
          title: t("مهمة مكتملة", "Task Completed"),
          description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
          variant: "default"
        });
        setCompletedTasks(prev => [...prev, task.id]);
        setPendingTasks(prev => prev.filter(id => id !== task.id));
        setVerifyingTaskId(null);
        return;
      }

      // استخراج اسم القناة من رابط المهمة
      let channelUsername = 'G_COIN_V3'; // قناة G COIN الافتراضية
      
      if (task.campaignLink) {
        const match = task.campaignLink.match(/t\.me\/([^/?#]+)/);
        if (match) {
          channelUsername = match[1];
        }
      }

      // التحقق من عضوية القناة باستخدام edge function
      const { data: membershipData, error: membershipError } = await supabase.functions.invoke(
        'check-channel-membership',
        {
          body: {
            user_id: parseInt(storedTelegramId),
            channel_username: channelUsername
          }
        }
      );

      if (membershipError || !membershipData?.is_member) {
        toast({
          title: t("❌ غير منضم", "❌ Not a Member"),
          description: t(
            "يجب الانضمام للقناة أولاً ثم الضغط على تحقق",
            "You must join the channel first then click verify"
          ),
          variant: "destructive"
        });
        setPendingTasks(prev => prev.filter(id => id !== task.id));
        return;
      }

      // إذا كان المستخدم عضواً، نضيف المكافأة باستخدام النظام الآمن
      // استخدام edge function الآمن لإضافة المكافأة
      const { error: rewardError } = await supabase.functions.invoke('secure-balance-update', {
        body: {
          telegram_id: parseInt(storedTelegramId),
          balance_type: 'bal_x7k9m', // pepe_balance
          amount: task.reward,
          operation: 'add',
          source: 'main_task_completion',
          metadata: {
            task_id: task.id,
            task_title: task.title,
            campaign_link: task.campaignLink
          }
        }
      });

      if (rewardError) {
        throw rewardError;
      }

      await supabase.from('completed_tasks').insert({
        telegram_user_id: userData.id,
        task_id: task.id,
        task_title: task.title,
        task_type: 'main',
        reward_amount: task.reward,
        campaign_link: task.campaignLink,
        is_latest_attempt: true
      });

      setCompletedTasks(prev => [...prev, task.id]);
      setPendingTasks(prev => prev.filter(id => id !== task.id));
      onReward(task.reward, 'pepe');

      toast({
        title: t("مبروك! 🎉", "Congratulations! 🎉"),
        description: t(`تم التحقق من العضوية وحصلت على ${task.reward} PEPE`, `Membership verified and you got ${task.reward} PEPE`)
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في التحقق من المهمة", "Failed to verify task"),
        variant: "destructive"
      });
      setPendingTasks(prev => prev.filter(id => id !== task.id));
    } finally {
      setVerifyingTaskId(null);
    }
  };

  // Display visible tasks only - exclude completed tasks
  const visibleTasks = mainTasks.filter(task => !task.hidden && !completedTasks.includes(task.id));
  
  if (isLoadingTasks) {
    return <div className="space-y-4">
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </div>;
  }
  
  return <div className="space-y-4">

      <div className="grid gap-4">
        {visibleTasks.length === 0 ? (
          <Card className="bg-gradient-to-br from-card/50 to-card border border-border/50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('تم إكمال جميع المهام!', 'All Tasks Completed!')}
              </h3>
              <p className="text-muted-foreground">
                {t('أحسنت! لقد أكملت جميع المهام المتاحة', 'Great job! You completed all available tasks')}
              </p>
            </CardContent>
          </Card>
        ) : (
          visibleTasks.map(task => {
            const isCompleted = completedTasks.includes(task.id);
            return <Card key={task.id} className="bg-gradient-to-br from-card/50 to-card border border-border/50 hover:border-primary/30 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        {task.title}
                      </h3>
                      
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    
                    <span className="text-lg font-bold text-foreground">
                      {task.reward} PEPE
                    </span>
                  </div>
                  
                  {pendingTasks.includes(task.id) ? (
                    <Button 
                      size="lg" 
                      onClick={() => handleVerifyTask(task)} 
                      disabled={verifyingTaskId === task.id}
                      className="px-6"
                      variant="secondary"
                    >
                      {verifyingTaskId === task.id ? t("جاري التحقق...", "Verifying...") : t("تحقق ✓", "Verify ✓")}
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => handleOpenTask(task)} className="px-6">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("ابدأ", "Start")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>;
          })
        )}
      </div>
    </div>;
}