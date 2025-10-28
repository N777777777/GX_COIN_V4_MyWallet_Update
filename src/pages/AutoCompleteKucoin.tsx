import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, User, Coins } from "lucide-react";

export default function AutoCompleteKucoin() {
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const { toast } = useToast();

  const handleAutoComplete = async () => {
    if (!userId.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال ID المستخدم",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setUserInfo(null);

    try {
      // البحث عن المستخدم بـ telegram_id
      const { data: user, error: userError } = await supabase
        .from('telegram_users')
        .select('id, telegram_id, first_name, last_name, username, coins')
        .eq('telegram_id', parseInt(userId))
        .single();

      if (userError || !user) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المستخدم بهذا ID",
          variant: "destructive",
        });
        return;
      }

      setUserInfo(user);

      // التحقق من وجود المهمة مسبقاً
      const { data: existingTask } = await supabase
        .from('completed_tasks')
        .select('id, completed_at')
        .eq('telegram_user_id', user.id)
        .eq('task_id', '6')
        .single();

      if (existingTask) {
        toast({
          title: "تحذير",
          description: "المستخدم أكمل هذه المهمة مسبقاً",
          variant: "destructive",
        });
        return;
      }

      // إدراج المهمة في completed_tasks
      const { error: insertError } = await supabase
        .from('completed_tasks')
        .insert({
          telegram_user_id: user.id,
          task_id: '6',
          task_title: 'KUCOIN',
          task_type: 'platform',
          reward_amount: 10,
          uid: `AUTO_${user.telegram_id}_${Date.now()}`,
          campaign_link: 'https://t.me/G_COIN_V3/9185',
          completed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting task:', insertError);
        toast({
          title: "خطأ",
          description: "فشل في إضافة المهمة",
          variant: "destructive",
        });
        return;
      }

      // إضافة 10 نقاط للمستخدم
      const { data: updatedUser, error: updateError } = await supabase
        .from('telegram_users')
        .update({ 
          coins: (user.coins || 0) + 10,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('coins')
        .single();

      if (updateError) {
        console.error('Error updating user coins:', updateError);
        toast({
          title: "تحذير",
          description: "تم إضافة المهمة لكن فشل في إضافة النقاط",
          variant: "destructive",
        });
      } else {
        // تحديث معلومات المستخدم المعروضة
        setUserInfo({...user, coins: updatedUser.coins});
        
        toast({
          title: "تم بنجاح! ✅",
          description: `تم إكمال مهمة KUCOIN للمستخدم ${user.first_name || user.username || user.telegram_id} وإضافة 10 نقاط`,
        });
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUserId("");
    setUserInfo(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              إكمال مهمة KUCOIN تلقائياً
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">ID المستخدم (Telegram ID)</Label>
                <Input
                  id="userId"
                  type="number"
                  placeholder="أدخل ID المستخدم"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAutoComplete}
                  className="flex-1" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      إكمال المهمة
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>

            {/* عرض معلومات المستخدم */}
            {userInfo && (
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      معلومات المستخدم
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>الاسم:</span>
                      <span className="font-medium">
                        {userInfo.first_name} {userInfo.last_name || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>اسم المستخدم:</span>
                      <span className="font-medium">
                        {userInfo.username || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Telegram ID:</span>
                      <span className="font-medium">{userInfo.telegram_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>النقاط الحالية:</span>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{userInfo.coins || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* معلومات إضافية */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">كيفية الاستخدام:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• أدخل ID التليجرام للمستخدم</li>
                <li>• اضغط "إكمال المهمة"</li>
                <li>• سيتم إضافة 10 نقاط تلقائياً</li>
                <li>• المهمة ستظهر كمكتملة فوراً</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ تحذير:
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                هذا السكريبت مخصص للإدارة فقط. تأكد من أن المستخدم يستحق إكمال المهمة قبل التشغيل.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}