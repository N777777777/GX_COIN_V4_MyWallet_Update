import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Lock, Users, Clock, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface QualificationTask {
  id: string;
  title: string;
  description: string;
  requirement: string;
  reward: string;
  status: 'completed' | 'available' | 'locked';
  progress?: number;
  maxProgress?: number;
}
export function QualificationTasks() {
  const {
    toast
  } = useToast();
  const [tasks, setTasks] = useState<QualificationTask[]>([{
    id: "referral-5",
    title: "Invite 5 Friends",
    description: "Invite 5 friends to join G COIN and get 20 points",
    requirement: "5 active referrals",
    reward: "20 points",
    status: 'available',
    progress: 0,
    maxProgress: 5
  }, {
    id: "task-2",
    title: "Hidden Task #1",
    description: "New task coming soon - 20 points",
    requirement: "Coming Soon",
    reward: "20 points",
    status: 'locked'
  }, {
    id: "task-3",
    title: "Hidden Task #2",
    description: "New task coming soon - 20 points",
    requirement: "Coming Soon",
    reward: "20 points",
    status: 'locked'
  }]);
  const [qualificationPoints, setQualificationPoints] = useState(0);
  const maxPoints = 60; // 3 مهام × 20 نقطة

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkReferralProgress();
    
    // تحديث التقدم كل 5 ثواني
    const interval = setInterval(() => {
      checkReferralProgress();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  const checkReferralProgress = async () => {
    const telegramId = localStorage.getItem('gcoin_telegram_id');
    if (!telegramId) {
      setLoading(false);
      return;
    }
    try {
      // الحصول على عدد الإحالات من جدول referrals (نفس الطريقة في صفحة الإحالات)
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_telegram_id', parseInt(telegramId));

      if (!error && referrals) {
        const referralCount = referrals.length;
        
        console.log('Referral count for qualification:', referralCount);
        
        setTasks(prev => prev.map(task => {
          if (task.id === 'referral-5') {
            return {
              ...task,
              progress: Math.min(referralCount, 5),
              status: referralCount >= 5 ? 'completed' : 'available'
            };
          }
          return task;
        }));

        // إذا وصل لـ 5 إحالات، امنحه 20 نقطة
        if (referralCount >= 5 && !localStorage.getItem(`task_referral_5_${telegramId}`)) {
          localStorage.setItem(`task_referral_5_${telegramId}`, 'completed');
          const newPoints = 20;
          setQualificationPoints(newPoints);
          localStorage.setItem(`qualification_points_${telegramId}`, newPoints.toString());
          
          toast({
            title: "🎉 مبروك!",
            description: "لقد أكملت مهمة دعوة 5 أصدقاء وحصلت على 20 نقطة!",
            variant: "default"
          });
          
          if (newPoints >= maxPoints) {
            await qualifyUser(parseInt(telegramId));
          }
        } else if (referralCount >= 5) {
          // إذا كان المستخدم قد حصل على النقاط مسبقاً، اعرضها فقط
          const savedPoints = localStorage.getItem(`qualification_points_${telegramId}`);
          if (savedPoints) {
            setQualificationPoints(parseInt(savedPoints));
          }
        }
      }
    } catch (error) {
      console.error('Error checking referral progress:', error);
    } finally {
      setLoading(false);
    }
  };
  const qualifyUser = async (telegramId: number) => {
    try {
      const {
        error
      } = await supabase.rpc('add_manual_qualified_user', {
        user_telegram_id: telegramId,
        reason: 'Completing the invite 5 friends task'
      });
      if (!error) {
        toast({
          title: "🎉 Congratulations!",
          description: "You are now qualified by completing the invite 5 friends task!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error qualifying user:', error);
    }
  };
  const getTaskIcon = (task: QualificationTask) => {
    if (task.status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (task.status === 'locked') {
      return <Lock className="w-6 h-6 text-muted-foreground" />;
    }
    if (task.id === 'referral-5') {
      return <Users className="w-6 h-6 text-primary" />;
    }
    return <Clock className="w-6 h-6 text-muted-foreground" />;
  };
  const getTaskButton = (task: QualificationTask) => {
    if (task.status === 'completed') {
      return <Badge variant="default" className="bg-green-500 text-white">
          Completed ✓
        </Badge>;
    }
    if (task.status === 'locked') {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">
          COMING SOON
        </Badge>;
    }
    if (task.id === 'referral-5') {
      return;
    }
    return null;
  };
  if (loading) {
    return <div className="space-y-4">
        {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>)}
      </div>;
  }
  return <div className="space-y-6 p-4">
      {/* عداد نقاط التأهيل المحسن */}
      <div className="text-center mb-8">
        {qualificationPoints >= maxPoints ? <div className="relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-8 py-6 rounded-3xl text-xl font-bold shadow-2xl animate-scale-in">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8 animate-pulse" />
              <span>Successfully Qualified ✓</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-3xl blur opacity-30 animate-pulse"></div>
          </div> : <div className="relative bg-gradient-to-br from-card via-background to-secondary/20 rounded-3xl p-8 border-2 border-primary/30 shadow-2xl backdrop-blur-sm animate-fade-in floating-card">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Qualification Counter
                </h3>
              </div>
              <div className="mb-4">
                <div className="text-5xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2 animate-scale-in">
                  {qualificationPoints}/{maxPoints}
                </div>
                <p className="text-lg text-muted-foreground font-medium">qualification points</p>
              </div>
              
              
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur opacity-50"></div>
          </div>}
      </div>

      {/* عنوان المهام المحسن */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-3">
          Qualification Tasks
        </h2>
        
      </div>

      {/* المهام المحسنة */}
      <div className="space-y-4">
        {tasks.map((task, index) => <Card key={task.id} className={`transition-all duration-500 hover:scale-[1.02] animate-fade-in border-2 overflow-hidden ${task.status === 'locked' ? 'bg-gradient-to-br from-muted/30 to-secondary/20 border-muted/50 opacity-60' : 'bg-gradient-to-br from-card via-background to-secondary/10 border-primary/20 hover:border-primary/40 shadow-lg hover:shadow-xl'}`} style={{
        animationDelay: `${index * 0.1}s`
      }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0 relative">
                  <div className={`p-3 rounded-2xl ${task.status === 'completed' ? 'bg-green-500/20 shadow-green-500/30' : task.status === 'locked' ? 'bg-muted shadow-muted/30' : 'bg-primary/10 shadow-primary/30'} shadow-lg`}>
                    {getTaskIcon(task)}
                  </div>
                  {task.status === 'completed' && <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>}
                </div>
                
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-1">{task.title}</h3>
                    
                  </div>
                  
                  {task.progress !== undefined && task.maxProgress && <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={task.progress >= task.maxProgress ? "text-green-500 font-bold" : "text-primary"}>
                          {task.progress}/{task.maxProgress}
                        </span>
                      </div>
                      <div className="relative w-full bg-secondary/40 rounded-full h-3 overflow-hidden border border-primary/20">
                        <div 
                          className={`h-3 rounded-full transition-all duration-700 ease-out relative ${
                            task.progress >= task.maxProgress 
                              ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                              : "bg-gradient-to-r from-primary to-accent"
                          }`}
                          style={{
                            width: `${Math.min((task.progress / task.maxProgress * 100), 100)}%`
                          }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                        </div>
                      </div>
                      {task.progress === 0 && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Share your referral link to start earning points
                        </p>
                      )}
                    </div>}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold">
                        {task.reward}
                      </Badge>
                    </div>
                    <div className="flex-shrink-0">
                      {getTaskButton(task)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* رسالة تحفيزية */}
      
    </div>;
}