import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";

export default function AddKucoinTask() {
  const [telegramId, setTelegramId] = useState("");
  const [uid, setUid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telegramId.trim() || !uid.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال ID التليجرام و UID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // البحث عن المستخدم بـ telegram_id
      const { data: user, error: userError } = await supabase
        .from('telegram_users')
        .select('id, telegram_id, first_name, coins')
        .eq('telegram_id', parseInt(telegramId))
        .single();

      if (userError || !user) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المستخدم بهذا ID",
          variant: "destructive",
        });
        return;
      }

      // التحقق من وجود المهمة مسبقاً
      const { data: existingTask, error: existingError } = await supabase
        .from('completed_tasks')
        .select('id')
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
          uid: uid.trim(),
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
      const { error: updateError } = await supabase
        .from('telegram_users')
        .update({ 
          coins: (user.coins || 0) + 10,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user coins:', updateError);
        toast({
          title: "تحذير",
          description: "تم إضافة المهمة لكن فشل في إضافة النقاط",
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم بنجاح",
          description: `تم إضافة مهمة KUCOIN للمستخدم ${user.first_name || user.telegram_id} وإضافة 10 نقاط`,
        });
      }

      // إعادة تعيين الحقول
      setTelegramId("");
      setUid("");

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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              إضافة مهمة KUCOIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegramId">ID التليجرام</Label>
                <Input
                  id="telegramId"
                  type="number"
                  placeholder="أدخل ID التليجرام"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uid">UID</Label>
                <Input
                  id="uid"
                  placeholder="أدخل UID الخاص بالمهمة"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  'إضافة المهمة'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">ملاحظات:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• سيتم إضافة 10 نقاط للمستخدم</li>
                <li>• سيتم التحقق من وجود المهمة مسبقاً</li>
                <li>• المهمة ستظهر كمكتملة فوراً</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}