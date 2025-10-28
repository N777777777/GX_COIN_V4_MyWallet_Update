import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Gift, CheckCircle, Clock, Pause, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserCreatedTask {
  id: string;
  title: string;
  channel_or_post_link: string;
  required_participants: number;
  current_participants: number;
  reward_per_person: number;
  total_budget: number;
  status: string;
  created_at: string;
  creator_telegram_id: number;
}

interface UserCreatedTasksProps {
  onTaskParticipate?: () => void;
}

export function UserCreatedTasks({ onTaskParticipate }: UserCreatedTasksProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<UserCreatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [participatingTasks, setParticipatingTasks] = useState<Set<string>>(new Set());
  const [cancellingTasks, setCancellingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserCreatedTasks();
  }, []);

  const loadUserCreatedTasks = async () => {
    try {
      const { data: activeTasks, error } = await supabase
        .from('user_created_tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading user created tasks:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل المهام المُنشأة",
          variant: "destructive"
        });
        return;
      }

      setTasks(activeTasks || []);
    } catch (error) {
      console.error('Error loading user created tasks:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المهام",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (task: UserCreatedTask) => {
    const taskId = task.id;
    
    if (participatingTasks.has(taskId)) return;
    
    setParticipatingTasks(prev => new Set(prev).add(taskId));

    try {
      const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
      if (!storedTelegramId) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على معرف المستخدم",
          variant: "destructive"
        });
        setParticipatingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      const userTelegramId = parseInt(storedTelegramId);

      console.log('Claiming community task reward:', taskId, 'for user:', userTelegramId);

      // البحث عن المستخدم في قاعدة البيانات للحصول على UUID الصحيح
      const { data: userData, error: userError } = await supabase
        .from('telegram_users')
        .select('id, coins, ton_balance')
        .eq('telegram_id', userTelegramId)
        .single();
      
      if (userError || !userData) {
        console.error('User not found in database:', userError);
        toast({
          title: "خطأ في النظام",
          description: "لم يتم العثور على المستخدم في قاعدة البيانات",
          variant: "destructive"
        });
        return;
      }

      const userUUID = userData.id;

      // التحقق من عدم وجود مهمة مكتملة مسبقاً
      const { data: existingCompleted } = await supabase
        .from('completed_tasks')
        .select('id')
        .eq('telegram_user_id', userUUID)
        .eq('task_id', taskId)
        .maybeSingle();
      
      if (existingCompleted) {
        toast({
          title: "مهمة مكتملة",
          description: "تم إكمال هذه المهمة مسبقاً",
          variant: "destructive"
        });
        return;
      }

      // إضافة المهمة للمهام المكتملة مباشرة
      const { error: insertCompletedError } = await supabase
        .from('completed_tasks')
        .insert({
          telegram_user_id: userUUID,
          task_id: taskId,
          task_title: task.title,
          task_type: 'community',
          reward_amount: task.reward_per_person,
          campaign_link: task.channel_or_post_link,
          completed_at: new Date().toISOString()
        });

      if (insertCompletedError) {
        console.error('Error inserting completed task:', insertCompletedError);
        toast({
          title: "خطأ في النظام",
          description: "فشل في تسجيل إكمال المهمة",
          variant: "destructive"
        });
        return;
      }

      // إضافة المكافأة TON للمستخدم
      const { error: updateUserError } = await supabase
        .from('telegram_users')
        .update({
          ton_balance: userData.ton_balance + task.reward_per_person
        })
        .eq('id', userUUID);

      if (updateUserError) {
        console.error('Error updating user coins:', updateUserError);
        toast({
          title: "خطأ في النظام",
          description: "فشل في إضافة المكافأة",
          variant: "destructive"
        });
        return;
      }

      // تحديث عدد المشاركين في المهمة
      const { error: updateTaskError } = await supabase
        .from('user_created_tasks')
        .update({
          current_participants: task.current_participants + 1
        })
        .eq('id', taskId);

      if (updateTaskError) {
        console.error('Error updating task participants:', updateTaskError);
        // لا نعتبر هذا خطأ فادح، المكافأة تم إضافتها
      }

      toast({
        title: "تم بنجاح! 🎉",
        description: `تم إكمال المهمة وحصلت على ${task.reward_per_person} TON`,
      });

      // فتح رابط القناة في نافذة جديدة
      const channelLink = task.channel_or_post_link.startsWith('http') 
        ? task.channel_or_post_link 
        : `https://t.me/${task.channel_or_post_link.replace('@', '')}`;
      
      window.open(channelLink, '_blank');

      // إعادة تحميل المهام لتحديث العدادات
      await loadUserCreatedTasks();
      
      if (onTaskParticipate) {
        onTaskParticipate();
      }

    } catch (error) {
      console.error('Error claiming task reward:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء استلام المكافأة",
        variant: "destructive"
      });
    } finally {
      setParticipatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleCancelTask = async (task: UserCreatedTask) => {
    const taskId = task.id;
    
    if (cancellingTasks.has(taskId)) return;
    
    setCancellingTasks(prev => new Set(prev).add(taskId));

    try {
      const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
      if (!storedTelegramId) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على معرف المستخدم",
          variant: "destructive"
        });
        setCancellingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      const userTelegramId = parseInt(storedTelegramId);

      // التحقق من أن المستخدم هو صاحب المهمة
      if (task.creator_telegram_id !== userTelegramId) {
        toast({
          title: "غير مسموح",
          description: "يمكن فقط لصاحب المهمة إلغاؤها",
          variant: "destructive"
        });
        setCancellingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      console.log('Cancelling task:', taskId, 'by user:', userTelegramId);

      // استخدام edge function لإلغاء المهمة
      const response = await fetch('https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/cancel-user-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anhrb2d6c3FpZWtiYXd3aGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTM1NTgsImV4cCI6MjA2ODM4OTU1OH0.8hJxRD86Lhc-4PAOXjXVWWCLHGWqY3Mu9U6lHo0IxPc`
        },
        body: JSON.stringify({
          taskId: taskId,
          userTelegramId: userTelegramId
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Error cancelling task:', result.error);
        toast({
          title: "خطأ في النظام",
          description: result.error || "فشل في إلغاء المهمة",
          variant: "destructive"
        });
        setCancellingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      toast({
        title: "تم الإلغاء بنجاح",
        description: result.message,
      });

      // إعادة تحميل المهام
      await loadUserCreatedTasks();
      
      // تحديث الرصيد في الواجهة
      if (onTaskParticipate) {
        onTaskParticipate();
      }

    } catch (error) {
      console.error('Error cancelling task:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء إلغاء المهمة",
        variant: "destructive"
      });
    } finally {
      setCancellingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const getChannelName = (link: string) => {
    if (link.includes('t.me/')) {
      return '@' + link.split('/').pop();
    }
    return link.startsWith('@') ? link : '@' + link;
  };

  const getProgressPercent = (current: number, required: number) => {
    return Math.min((current / required) * 100, 100);
  };

  const isTaskCompleted = (task: UserCreatedTask) => {
    return task.current_participants >= task.required_participants;
  };

  const isTaskClaimed = async (taskId: string) => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return false;

    const userTelegramId = parseInt(storedTelegramId);
    
    const { data: userData } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('telegram_id', userTelegramId)
      .single();

    if (!userData) return false;

    const { data: completed } = await supabase
      .from('completed_tasks')
      .select('id')
      .eq('telegram_user_id', userData.id)
      .eq('task_id', taskId)
      .maybeSingle();

    return !!completed;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المهام المُنشأة...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Gift className="w-5 h-5 text-primary" />
            مهام المجتمع
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="text-center py-8">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد مهام مُنشأة من المجتمع حالياً</p>
            <p className="text-sm text-muted-foreground mt-2">
              انتظر حتى ينشئ الأعضاء مهام جديدة أو أنشئ مهمتك الخاصة!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-foreground text-lg">
          <Gift className="w-5 h-5 text-primary" />
          مهام المجتمع ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {tasks.map(task => {
          const progressPercent = getProgressPercent(task.current_participants, task.required_participants);
          const isCompleted = isTaskCompleted(task);
          const isParticipating = participatingTasks.has(task.id);
          const isCancelling = cancellingTasks.has(task.id);
          const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
          const isOwner = storedTelegramId && parseInt(storedTelegramId) === task.creator_telegram_id;
          
          return (
            <div 
              key={task.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{task.title}</h3>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
                    <Gift className="w-3 h-3 mr-1" />
                    {task.reward_per_person} TON
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>انضم إلى: {getChannelName(task.channel_or_post_link)}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>التقدم</span>
                    <span>{task.current_participants}/{task.required_participants}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                
                <div className="flex justify-end gap-2 pt-1">
                  {isCompleted ? (
                    <Badge variant="default" className="text-xs px-2 py-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      مكتملة
                    </Badge>
                  ) : (
                    <>
                      <Button 
                        onClick={() => handleClaimReward(task)}
                        disabled={isParticipating}
                        size="sm" 
                        className="mobile-button text-xs px-2 py-1.5 h-auto"
                      >
                        {isParticipating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                            جاري الاستلام...
                          </>
                        ) : (
                          <>
                            <Gift className="w-3 h-3 mr-1" />
                            استلام
                          </>
                        )}
                      </Button>
                      {isOwner && (
                        <Button 
                          onClick={() => handleCancelTask(task)}
                          disabled={isCancelling}
                          size="sm" 
                          variant="destructive"
                          className="text-xs px-2 py-1.5 h-auto"
                        >
                          {isCancelling ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                              جاري الإلغاء...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              إلغاء (50%)
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}