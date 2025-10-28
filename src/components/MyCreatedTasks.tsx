import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MyCreatedTask {
  id: string;
  title: string;
  channel_or_post_link: string;
  required_participants: number;
  current_participants: number;
  reward_per_person: number;
  total_budget: number;
  status: string;
  created_at: string;
}

export function MyCreatedTasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<MyCreatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingTasks, setCancellingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMyTasks();
  }, []);

  const loadMyTasks = async () => {
    try {
      const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
      if (!storedTelegramId) {
        setLoading(false);
        return;
      }

      const { data: myTasks, error } = await supabase
        .from('user_created_tasks')
        .select('*')
        .eq('creator_telegram_id', parseInt(storedTelegramId))
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading my tasks:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل مهامك",
          variant: "destructive"
        });
        return;
      }

      setTasks(myTasks || []);
    } catch (error) {
      console.error('Error loading my tasks:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المهام",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async (task: MyCreatedTask) => {
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
        return;
      }

      // حساب الاسترداد (50% من المبلغ المتبقي)
      const spentAmount = task.current_participants * task.reward_per_person;
      const remainingBudget = task.total_budget - spentAmount;
      const refundAmount = remainingBudget * 0.5; // 50% من المبلغ المتبقي

      // الحصول على بيانات المستخدم
      const { data: userData, error: userError } = await supabase
        .from('telegram_users')
        .select('id, ton_balance')
        .eq('telegram_id', parseInt(storedTelegramId))
        .single();

      if (userError || !userData) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات المستخدم",
          variant: "destructive"
        });
        return;
      }

      // إلغاء المهمة
      const { error: cancelError } = await supabase
        .from('user_created_tasks')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (cancelError) {
        console.error('Error cancelling task:', cancelError);
        toast({
          title: "خطأ في الإلغاء",
          description: "فشل في إلغاء المهمة",
          variant: "destructive"
        });
        return;
      }

      // إضافة المبلغ المسترد للمستخدم (50% فقط)
      if (refundAmount > 0) {
        const { error: refundError } = await supabase
          .rpc('increment_ton_balance', {
            user_id: userData.id,
            amount: refundAmount
          });

        if (refundError) {
          console.error('Error processing refund:', refundError);
        }
      }

      toast({
        title: "تم إلغاء المهمة",
        description: `تم إلغاء المهمة واسترداد ${refundAmount.toFixed(2)} TON (50% من المبلغ المتبقي)`,
      });

      // إعادة تحميل المهام
      await loadMyTasks();

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

  const isTaskCompleted = (task: MyCreatedTask) => {
    return task.current_participants >= task.required_participants;
  };

  const calculateRefund = (task: MyCreatedTask) => {
    const spentAmount = task.current_participants * task.reward_per_person;
    const remainingBudget = task.total_budget - spentAmount;
    return remainingBudget * 0.5; // 50% من المبلغ المتبقي
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل مهامك...</p>
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
            <Trash2 className="w-5 h-5 text-primary" />
            مهامي المُنشأة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="text-center py-8">
            <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لم تنشئ أي مهام بعد</p>
            <p className="text-sm text-muted-foreground mt-2">
              أنشئ مهمتك الأولى لتظهر هنا
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center justify-between text-foreground text-lg">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-primary" />
            مهامي المُنشأة ({tasks.length})
          </div>
          <Button onClick={loadMyTasks} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {tasks.map(task => {
          const progressPercent = getProgressPercent(task.current_participants, task.required_participants);
          const isCompleted = isTaskCompleted(task);
          const isCancelling = cancellingTasks.has(task.id);
          const refundAmount = calculateRefund(task);
          
          return (
            <div 
              key={task.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{task.title}</h3>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
                    {task.reward_per_person} TON
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>القناة: {getChannelName(task.channel_or_post_link)}</p>
                  <p>الحالة: {task.status === 'active' ? 'نشطة' : 'مكتملة'}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>التقدم</span>
                    <span>{task.current_participants}/{task.required_participants}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-1">
                  <div className="text-xs text-muted-foreground">
                    <span>الميزانية: {task.total_budget} TON</span>
                  </div>
                  
                  {!isCompleted && task.status === 'active' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          disabled={isCancelling}
                          className="text-xs px-3 py-1.5 h-auto"
                        >
                          {isCancelling ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                              جاري الإلغاء...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              إلغاء
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد إلغاء المهمة</AlertDialogTitle>
                          <AlertDialogDescription className="text-right">
                            هل أنت متأكد من إلغاء هذه المهمة؟
                            <br />
                            <br />
                            <strong>ملاحظة مهمة:</strong>
                            <br />
                            • ستخسر 50% من المبلغ المتبقي كرسوم إلغاء
                            <br />
                            • المبلغ المدفوع للمشاركين لن يُسترد
                            <br />
                            • ستحصل على {refundAmount.toFixed(2)} TON فقط
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleCancelTask(task)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            تأكيد الإلغاء
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {isCompleted && (
                    <Badge variant="default" className="text-xs px-2 py-1">
                      مكتملة ✓
                    </Badge>
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