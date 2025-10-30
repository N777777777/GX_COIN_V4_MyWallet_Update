import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle, List, RotateCcw, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  telegram_user_id: string;
  task_id: string;
  task_title: string;
  task_type: string;
  reward_amount: number;
  uid?: string;
  campaign_link?: string;
  status?: string;
  completed_at?: string;
  submitted_at?: string;
}

interface ResetResponse {
  success: boolean;
  message: string;
  previous_attempts?: number;
  reset_tasks_count?: number;
}

export function TaskManager() {
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      setIsLoading(false);
      return;
    }

    try {
      // البحث عن المستخدم
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', parseInt(storedTelegramId))
        .single();

      if (userData) {
        // استدعاء edge function للحصول على المهام
        const { data: tasksData, error } = await supabase.functions.invoke('task-manager', {
          body: { 
            action: 'get_user_tasks',
            telegram_user_id: userData.id 
          }
        });

        if (error) {
          console.error('Error fetching tasks:', error);
          toast({
            title: "خطأ",
            description: "فشل في تحميل المهام",
            variant: "destructive",
          });
          return;
        }

        if (tasksData) {
          setCompletedTasks(tasksData.completed || []);
          setPendingTasks(tasksData.pending || []);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل المهام",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetTask = async (taskId: string) => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return;

    try {
      const { data, error } = await supabase.rpc('reset_user_task', {
        user_telegram_id: parseInt(storedTelegramId),
        task_id_param: taskId
      });

      if (error) {
        console.error('Error resetting task:', error);
        toast({
          title: "خطأ",
          description: "فشل في إعادة تعيين المهمة",
          variant: "destructive",
        });
        return;
      }

      const response = data as unknown as ResetResponse;
      if (response?.success) {
        toast({
          title: "نجح!",
          description: response.message,
        });
        await fetchTasks();
      } else {
        toast({
          title: "خطأ",
          description: response?.message || "فشل في إعادة تعيين المهمة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting task:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إعادة تعيين المهمة",
        variant: "destructive",
      });
    }
  };

  const resetAllTasks = async () => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) return;

    try {
      const { data, error } = await supabase.rpc('reset_all_user_tasks', {
        user_telegram_id: parseInt(storedTelegramId)
      });

      if (error) {
        console.error('Error resetting all tasks:', error);
        toast({
          title: "خطأ",
          description: "فشل في إعادة تعيين جميع المهام",
          variant: "destructive",
        });
        return;
      }

      const response = data as unknown as ResetResponse;
      if (response?.success) {
        toast({
          title: "نجح!",
          description: response.message,
        });
        await fetchTasks();
      } else {
        toast({
          title: "خطأ",
          description: response?.message || "فشل في إعادة تعيين جميع المهام",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting all tasks:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إعادة تعيين جميع المهام",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'text-green-500';
      case 'pending':
      case 'reviewing':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'reviewing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'مكتملة';
      case 'pending':
        return 'قيد المراجعة';
      case 'reviewing':
        return 'تحت المراجعة';
      case 'rejected':
        return 'مرفوضة';
      default:
        return 'غير معروف';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المهام...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completed Tasks */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle className="w-5 h-5 text-green-500" />
            المهام المكتملة ({completedTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {completedTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              لا توجد مهام مكتملة بعد
            </p>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-green-600">{task.task_title}</h4>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                    +{task.reward_amount} نقطة
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>تم الإكمال في: {formatDate(task.completed_at!)}</span>
                 </div>
                 {task.uid && (
                   <div className="text-sm text-muted-foreground">
                     <span>UID: {task.uid}</span>
                   </div>
                 )}
                 <div className="flex justify-end">
                   <Button 
                     onClick={() => resetTask(task.task_id)}
                     variant="outline" 
                     size="sm"
                     className="text-xs"
                   >
                     <RotateCcw className="w-3 h-3 mr-1" />
                     إعادة إكمال
                   </Button>
                 </div>
               </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-yellow-500" />
            المهام قيد المراجعة ({pendingTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              لا توجد مهام قيد المراجعة
            </p>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{task.task_title}</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status!)}
                    <span className={`text-sm font-medium ${getStatusColor(task.status!)}`}>
                      {getStatusText(task.status!)}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span>تم الإرسال في: {formatDate(task.submitted_at!)}</span>
                </div>
                {task.uid && (
                  <div className="text-sm text-muted-foreground">
                    <span>UID: {task.uid}</span>
                  </div>
                )}
                <div className="text-sm text-yellow-600">
                  <span>المكافأة المتوقعة: +{task.reward_amount} نقطة</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={fetchTasks} variant="outline">
          <List className="w-4 h-4 mr-2" />
          تحديث المهام
        </Button>
        
        {completedTasks.length > 0 && (
          <Button 
            onClick={resetAllTasks} 
            variant="outline" 
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة تعيين جميع المهام
          </Button>
        )}
      </div>
    </div>
  );
}