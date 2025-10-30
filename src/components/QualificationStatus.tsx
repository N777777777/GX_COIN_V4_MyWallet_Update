import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Target, Trophy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";

export function QualificationStatus({ isEnglish = false }: { isEnglish?: boolean }) {
  const { toast } = useToast();
  const { telegramUser, loading } = useTelegramData();
  const [isQualified, setIsQualified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [kuCoinTaskStatus, setKuCoinTaskStatus] = useState<'not_completed' | 'pending' | 'approved' | 'rejected' | 'completed'>('not_completed');
  
  const t = (arabic: string, english: string) => english; // Always use English

  useEffect(() => {
    if (telegramUser) {
      checkQualificationStatus();
    }
  }, [telegramUser]);

  useEffect(() => {
    
    // إعداد realtime للاستماع لتحديثات المهام المكتملة
    const channelCompleted = supabase
      .channel('qualification-completed-tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'completed_tasks'
        },
        (payload) => {
          const completedTask = payload.new as any;
          // التحقق من أن المهمة تخص المستخدم الحالي فقط
          if (completedTask.task_id === '6' && telegramUser && completedTask.telegram_user_id === telegramUser.id) {
            console.log('KuCoin task completed for current user:', completedTask);
            setKuCoinTaskStatus('completed');
            setIsQualified(true);
            toast({
              title: t("تهانينا!", "Congratulations!"),
              description: t("تم قبول مهمة KuCoin وأصبحت مؤهلاً!", "KuCoin task approved and you are now qualified!"),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelCompleted);
    };
  }, []);

  const checkQualificationStatus = async () => {
    if (!telegramUser || loading) {
      setIsLoading(false);
      return;
    }

    try {
      // التحقق من المهام المكتملة أولاً
      const { data: completedTask } = await supabase
        .from('completed_tasks')
        .select('*')
        .eq('telegram_user_id', telegramUser.id)
        .eq('task_id', '6') // معرف مهمة KuCoin
        .maybeSingle();

      if (completedTask) {
        console.log('KuCoin task found in completed_tasks:', completedTask);
        setKuCoinTaskStatus('completed');
        setIsQualified(true);
        setIsLoading(false);
        return;
      }

      // إذا لم توجد في المكتملة، تحقق من المعلقة
      const { data: pendingTask } = await supabase
        .from('pending_tasks')
        .select('*')
        .eq('telegram_user_id', telegramUser.id)
        .eq('task_id', '6') // معرف مهمة KuCoin
        .maybeSingle();

      if (pendingTask) {
        console.log('KuCoin task found in pending_tasks:', pendingTask);
        setKuCoinTaskStatus(pendingTask.status as any);
        setIsQualified(pendingTask.status === 'approved' || pendingTask.status === 'completed');
        setIsLoading(false);
        return;
      }

      // لا يوجد تأهيل
      console.log('No qualification found');
      setKuCoinTaskStatus('not_completed');
      setIsQualified(false);
    } catch (error) {
      console.error('Error checking qualification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Target className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return t('مؤهل ✓', 'Qualified ✓');
      case 'pending':
        return t('قيد المراجعة', 'Under Review');
      case 'rejected':
        return t('مرفوض - حاول مرة أخرى', 'Rejected - Try Again');
      default:
        return t('غير مؤهل', 'Not Qualified');
    }
  };

  const getStatusDescription = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return t('تهانينا! لقد أكملت مهمة KuCoin بنجاح وأصبحت مؤهلاً للاستفادة من جميع مزايا التطبيق.', 'Congratulations! You have successfully completed the KuCoin task and are now qualified to benefit from all app features.');
      case 'pending':
        return t('تم إرسال تقديمك لمهمة KuCoin وهو قيد المراجعة. سيتم إشعارك بالنتيجة قريباً.', 'Your KuCoin task submission has been sent and is under review. You will be notified of the result soon.');
      case 'rejected':
        return t('تم رفض تقديمك لمهمة KuCoin. يرجى مراجعة التعليمات والمحاولة مرة أخرى.', 'Your KuCoin task submission was rejected. Please review the instructions and try again.');
      default:
        return t('لتصبح مؤهلاً، يجب إكمال مهمة KuCoin أولاً. اذهب إلى تبويب المهام وأكمل مهمة KuCoin.', 'To become qualified, you must complete the KuCoin task first. Go to the Tasks tab and complete the KuCoin task.');
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("جاري التحقق من حالة التأهل...", "Checking qualification status...")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Enhanced Status Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-card via-background to-secondary/20 border-2 border-primary/30 shadow-2xl animate-fade-in floating-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5"></div>
        <CardHeader className="relative z-10 pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-foreground text-xl">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Trophy className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent font-bold">
              {t("حالة التأهل", "Qualification Status")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          {/* Main Status Display */}
          <div className="text-center p-8 bg-gradient-to-br from-background/50 to-secondary/30 rounded-2xl border border-primary/20">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${
                kuCoinTaskStatus === 'completed' || kuCoinTaskStatus === 'approved' 
                  ? 'bg-green-500/20 shadow-green-500/30' 
                  : kuCoinTaskStatus === 'pending' 
                    ? 'bg-yellow-500/20 shadow-yellow-500/30' 
                    : kuCoinTaskStatus === 'rejected' 
                      ? 'bg-red-500/20 shadow-red-500/30' 
                      : 'bg-gray-500/20 shadow-gray-500/30'
              } shadow-lg animate-scale-in`}>
                {getStatusIcon()}
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-4 ${getStatusColor()} animate-fade-in`}>
              {getStatusText()}
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              {getStatusDescription()}
            </p>
          </div>

          {/* Enhanced Task Details */}
          <div className="bg-gradient-to-br from-background/80 to-secondary/20 rounded-2xl p-6 space-y-4 border border-primary/10">
            <h4 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {t("تفاصيل المهمة", "Task Details")}
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-primary/10">
                <span className="text-muted-foreground font-medium">{t("المهمة المطلوبة:", "Required Task:")}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
                  KuCoin Campaign
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-primary/10">
                <span className="text-muted-foreground font-medium">{t("المكافأة:", "Reward:")}</span>
                <span className="text-foreground font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t("10 نقاط", "10 points")}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-primary/10">
                <span className="text-muted-foreground font-medium">{t("الحالة:", "Status:")}</span>
                <span className={`font-bold text-lg ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Action Button */}
          <div className="pt-4">
            <Button 
              onClick={checkQualificationStatus}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              variant="default"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              {t("تحديث الحالة", "Update Status")}
            </Button>
          </div>
        </CardContent>
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-30"></div>
      </Card>

      {/* Enhanced Qualification Benefits */}
      {isQualified && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-2 border-green-300 shadow-2xl animate-fade-in dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-900/30 dark:border-green-700">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10"></div>
          <CardHeader className="relative z-10 text-center pb-4">
            <CardTitle className="text-green-600 text-2xl font-bold flex items-center justify-center gap-3">
              <div className="animate-bounce">🎉</div>
              <span>{t("مزايا التأهل", "Qualification Benefits")}</span>
              <div className="animate-bounce">🎉</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-green-700 dark:text-green-300 font-medium text-base">
                  {t("إمكانية الوصول لجميع المزايا", "Access to all features")}
                </span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-green-700 dark:text-green-300 font-medium text-base">
                  {t("مكافآت إضافية", "Additional rewards")}
                </span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-green-700 dark:text-green-300 font-medium text-base">
                  {t("أولوية في الأحداث", "Priority in events")}
                </span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400/20 to-emerald-600/20 rounded-2xl blur opacity-30"></div>
        </Card>
      )}

      {/* Motivational Card for Non-Qualified Users */}
      {!isQualified && kuCoinTaskStatus === 'not_completed' && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-2 border-primary/20 shadow-xl animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5"></div>
          <CardContent className="relative z-10 text-center p-8">
            <div className="mb-6">
              <Target className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-foreground mb-3">
                {t("ابدأ رحلة التأهل!", "Start Your Qualification Journey!")}
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                {t("أكمل مهمة KuCoin للحصول على التأهيل والاستفادة من جميع المزايا الحصرية", "Complete the KuCoin task to get qualified and enjoy all exclusive benefits")}
              </p>
            </div>
            <Button 
              onClick={() => window.location.hash = '#tasks'}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {t("اذهب إلى المهام", "Go to Tasks")}
            </Button>
          </CardContent>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur opacity-50"></div>
        </Card>
      )}
    </div>
  );
}