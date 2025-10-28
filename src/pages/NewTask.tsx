import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Link as LinkIcon, Coins } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewTask() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [subscribers, setSubscribers] = useState<string>('500');
  
  const isEnglish = localStorage.getItem('language') === 'en';
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // حساب التكلفة
  const calculateCost = (subs: string) => {
    const subsNum = parseInt(subs);
    return (subsNum / 500) * 0.5;
  };

  const calculateReward = (subs: string) => {
    const subsNum = parseInt(subs);
    return subsNum * 0.0005;
  };

  const tonCost = calculateCost(subscribers);
  const rewardPerUser = calculateReward(subscribers);

  const handleSubmit = async () => {
    if (!taskTitle || !channelUrl) {
      toast({
        title: t("معلومات ناقصة", "Missing Information"),
        description: t("يرجى ملء جميع الحقول المطلوبة", "Please fill all required fields"),
        variant: "destructive"
      });
      return;
    }

    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      toast({
        title: t("خطأ في المصادقة", "Authentication Error"),
        description: t("لم يتم العثور على معرف التليجرام", "No Telegram ID found"),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // التحقق من رصيد TON للمستخدم
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('ton_balance')
        .eq('telegram_id', parseInt(storedTelegramId))
        .single();

      if (!userData || userData.ton_balance < tonCost) {
        toast({
          title: t("رصيد غير كافي", "Insufficient Balance"),
          description: t(`تحتاج إلى ${tonCost} TON لإنشاء هذه المهمة`, `You need ${tonCost} TON to create this task`),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // إنشاء المهمة
      const { data, error } = await supabase.functions.invoke('create-partner-task', {
        body: {
          telegram_id: parseInt(storedTelegramId),
          task_title: taskTitle,
          task_description: t(`اشترك في القناة واحصل على ${rewardPerUser} عملة`, `Subscribe to the channel and get ${rewardPerUser} coins`),
          reward_amount: rewardPerUser,
          task_url: channelUrl,
          partner_name: taskTitle,
          max_participants: parseInt(subscribers),
          ton_cost: tonCost
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message || 'فشل في إنشاء المهمة');
      }

      toast({
        title: t("تم إنشاء المهمة! 🎉", "Task Created! 🎉"),
        description: data?.message || t("تم إنشاء المهمة ونشرها بنجاح", "Task created and published successfully")
      });

      // العودة إلى صفحة المهام
      navigate(-1);
    } catch (error: any) {
      console.error('Error creating partner task:', error);
      toast({
        title: t("خطأ في الإنشاء", "Creation Error"),
        description: error.message || t("فشل في إنشاء المهمة", "Failed to create task"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("رجوع", "Back")}
        </Button>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-primary" />
              {t("مهمة جديدة", "New Task")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* اسم المهمة */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("اسم المهمة", "Task Name")}
              </Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={t("اكتب اسم المهمة", "Enter task name")}
                className="bg-background"
              />
            </div>

            {/* رابط القناة */}
            <div className="space-y-2">
              <Label htmlFor="channelUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                {t("رابط القناة", "Channel Link")}
              </Label>
              <Input
                id="channelUrl"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://t.me/your_channel"
                className="bg-background"
                dir="ltr"
              />
            </div>

            {/* عدد المشتركين */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("عدد المشتركين", "Number of Subscribers")}
              </Label>
              <Select value={subscribers} onValueChange={setSubscribers}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500 {t("مشترك", "subscribers")}</SelectItem>
                  <SelectItem value="1000">1000 {t("مشترك", "subscribers")}</SelectItem>
                  <SelectItem value="5000">5000 {t("مشترك", "subscribers")}</SelectItem>
                  <SelectItem value="10000">10000 {t("مشترك", "subscribers")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* معلومات التكلفة والمكافأة */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("التكلفة الإجمالية:", "Total Cost:")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-lg font-bold">{tonCost} TON</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("المكافأة لكل مشترك:", "Reward per subscriber:")}
                  </span>
                  <span className="text-lg font-bold">{rewardPerUser} {t("عملة", "coins")}</span>
                </div>
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground text-center">
                    {t("كل 500 مشترك = 0.5 TON", "Every 500 subscribers = 0.5 TON")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* زر الإنشاء */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !taskTitle || !channelUrl}
              className="w-full"
              size="lg"
            >
              {loading ? t("جاري الإنشاء...", "Creating...") : t("إنشاء المهمة", "Create Task")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
