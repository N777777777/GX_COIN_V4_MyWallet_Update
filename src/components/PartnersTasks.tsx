import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Users, Coins, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface PartnersTasksProps {
  onReward: (amount: number, currency: 'coins' | 'pepe') => void;
  isEnglish?: boolean;
  pepeAdvertisingBalance?: number;
}
export function PartnersTasks({
  onReward,
  isEnglish = false,
  pepeAdvertisingBalance = 0
}: PartnersTasksProps) {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [customTasks, setCustomTasks] = useState<any[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // Load custom tasks from partner tasks table
  const loadCustomTasks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_active_partner_tasks');
      if (error) {
        console.error('Error loading partner tasks:', error);
        return;
      }
      if (data && typeof data === 'object' && 'success' in data && data.success && 'tasks' in data && Array.isArray(data.tasks)) {
        setCustomTasks(data.tasks);
      } else {
        console.warn('Invalid partner tasks data format:', data);
        setCustomTasks([]);
      }
    } catch (error) {
      console.error('Error loading partner tasks:', error);
      setCustomTasks([]);
    }
  };

  // Check completed tasks
  const checkCompletedTasks = async () => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return;
    try {
      // Get user ID first
      const {
        data: userData
      } = await supabase.from('telegram_users').select('id').eq('telegram_id', parseInt(storedTelegramId)).maybeSingle();
      if (!userData?.id) {
        console.warn('User not found for telegram_id:', storedTelegramId);
        return;
      }

      // Check completed tasks
      const {
        data: completions
      } = await supabase.from('completed_tasks').select('task_id').eq('telegram_user_id', userData.id).eq('task_type', 'partner');
      const completedIds = completions?.map(c => c.task_id) || [];
      setCompletedTaskIds(completedIds);
    } catch (error) {
      console.error('Error checking completed tasks:', error);
      setCompletedTaskIds([]);
    }
  };
  useEffect(() => {
    const initializeTasks = async () => {
      await loadCustomTasks();
      await checkCompletedTasks();
    };
    initializeTasks();

    // Subscribe to real-time updates for completed tasks
    const channel = supabase
      .channel('partner-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completed_tasks',
          filter: 'task_type=eq.partner'
        },
        () => {
          checkCompletedTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_tasks'
        },
        () => {
          loadCustomTasks();
        }
      )
      .subscribe();

    // Re-check when component becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        initializeTasks();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);


  // Open task link
  const handleOpenPartnerTask = (partnerTask: any) => {
    if (completedTaskIds.includes(partnerTask.id)) {
      toast({
        title: t("مهمة مكتملة", "Task Completed"),
        description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
        variant: "default"
      });
      return;
    }
    window.open(partnerTask.task_url, '_blank');
    setPendingTaskIds(prev => [...prev, partnerTask.id]);
  };

  // Verify task
  const handleVerifyPartnerTask = async (partnerTask: any) => {
    // التحقق من أن المهمة ليست مكتملة بالفعل
    if (completedTaskIds.includes(partnerTask.id)) {
      toast({
        title: t("مهمة مكتملة", "Task Completed"),
        description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
        variant: "default"
      });
      setPendingTaskIds(prev => prev.filter(id => id !== partnerTask.id));
      return;
    }

    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return;
    setVerifyingTaskId(partnerTask.id);
    try {
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('id, coins')
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
        .eq('task_id', partnerTask.id)
        .maybeSingle();

      if (existingTask) {
        toast({
          title: t("مهمة مكتملة", "Task Completed"),
          description: t("تم إكمال هذه المهمة بالفعل", "This task has already been completed"),
          variant: "default"
        });
        setCompletedTaskIds(prev => [...prev, partnerTask.id]);
        setPendingTaskIds(prev => prev.filter(id => id !== partnerTask.id));
        setVerifyingTaskId(null);
        return;
      }

      const rewardAmount = partnerTask.reward_amount;
      await supabase.from('telegram_users').update({
        coins: userData.coins + rewardAmount
      }).eq('id', userData.id);
      
      await supabase.from('completed_tasks').insert({
        telegram_user_id: userData.id,
        task_id: partnerTask.id,
        task_title: partnerTask.title,
        task_type: 'partner',
        reward_amount: rewardAmount,
        is_latest_attempt: true
      });
      
      setCompletedTaskIds(prev => [...prev, partnerTask.id]);
      setPendingTaskIds(prev => prev.filter(id => id !== partnerTask.id));
      onReward(rewardAmount, 'coins');
      
      toast({
        title: t("مبروك! 🎉", "Congratulations! 🎉"),
        description: t(`تم إكمال المهمة وحصلت على ${rewardAmount} عملة`, `Task completed and you got ${rewardAmount} coins`)
      });
    } catch (error) {
      console.error('Error completing partner task:', error);
      toast({
        title: t("خطأ", "Error"),
        description: t("فشل في التحقق من المهمة", "Failed to verify task"),
        variant: "destructive"
      });
    } finally {
      setVerifyingTaskId(null);
    }
  };
  return <div className="space-y-4">
      <div className="text-center mb-6">
        <Button onClick={() => navigate('/new-task')} className="mb-4" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          {t('مهمة جديدة', 'New Task')}
        </Button>
        
      </div>

      <div className="grid gap-4">
        {customTasks.filter(task => !completedTaskIds.includes(task.id)).length === 0 ? <Card className="bg-gradient-to-br from-card/50 to-card border border-border/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {customTasks.length === 0 ? t('لا توجد مهام شركاء حالياً', 'No Partner Tasks Available') : t('تم إكمال جميع المهام!', 'All Tasks Completed!')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {customTasks.length === 0 ? t('كن أول من ينشئ مهمة للشركاء', 'Be the first to create a partner task') : t('أحسنت! لقد أكملت جميع المهام المتاحة', 'Great job! You completed all available tasks')}
              </p>
            </CardContent>
          </Card> : customTasks.filter(task => !completedTaskIds.includes(task.id)).map(task => {
        const isCompleted = completedTaskIds.includes(task.id);
        return <Card key={task.id} className="bg-gradient-to-br from-card/50 to-card border border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                        {task.partner_logo_url ? <img src={task.partner_logo_url} alt={task.partner_name || task.title} className="w-full h-full object-cover" onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }} /> : null}
                        <Users className={`w-6 h-6 text-primary ${task.partner_logo_url ? 'hidden' : ''}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {task.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {task.description || t(`احصل على ${task.reward_amount} عملة`, `Get ${task.reward_amount} coins`)}
                        </p>
                        {task.partner_name && <p className="text-xs text-muted-foreground">
                            {t('بواسطة:', 'By:')} {task.partner_name}
                          </p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-lg font-bold text-foreground">
                        {task.reward_amount} {t('عملة', 'coins')}
                      </span>
                    </div>
                    
                    {pendingTaskIds.includes(task.id) ? <Button size="lg" onClick={() => handleVerifyPartnerTask(task)} disabled={verifyingTaskId === task.id} className="px-6" variant="secondary">
                        {verifyingTaskId === task.id ? t("جاري التحقق...", "Verifying...") : t("تحقق ✓", "Verify ✓")}
                      </Button> : <Button size="lg" onClick={() => handleOpenPartnerTask(task)} className="px-6">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t("ابدأ", "Start")}
                      </Button>}
                  </div>
                </CardContent>
              </Card>;
      })}
      </div>
    </div>;
}