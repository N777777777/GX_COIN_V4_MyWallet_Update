import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Coins, Calendar, Settings } from "lucide-react";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Task Management State
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    type: "platform",
    requirements: "",
    reward: 10
  });

  // User Balance State
  const [balanceData, setBalanceData] = useState({
    telegramId: "",
    amount: "",
    type: "coins" as "coins" | "ton",
    action: "add" as "add" | "set" | "subtract"
  });

  // User Qualification State
  const [qualificationData, setQualificationData] = useState({
    telegramId: "",
    action: "qualify" as "qualify" | "disqualify",
    reason: ""
  });

  // Airdrop Timing State
  const [airdropData, setAirdropData] = useState({
    startDate: "",
    endDate: "",
    description: ""
  });

  const handleCreateTask = async () => {
    if (!taskData.title || !taskData.description) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('default_tasks')
        .insert({
          task_id: `custom_${Date.now()}`,
          title: taskData.title,
          description: taskData.description,
          task_type: taskData.type,
          requirements: taskData.requirements ? JSON.parse(taskData.requirements) : null,
          reward_amount: taskData.reward
        });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء المهمة بنجاح",
      });

      setTaskData({
        title: "",
        description: "",
        type: "platform",
        requirements: "",
        reward: 10
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المهمة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserBalance = async () => {
    if (!balanceData.telegramId || !balanceData.amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: parseInt(balanceData.telegramId),
          [`${balanceData.type === 'coins' ? 'coins' : 'ton_balance'}`]: parseFloat(balanceData.amount),
          action: `${balanceData.action}_${balanceData.type}`
        }
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم ${balanceData.action === 'add' ? 'إضافة' : balanceData.action === 'subtract' ? 'خصم' : 'تعيين'} ${balanceData.amount} ${balanceData.type === 'coins' ? 'عملة' : 'TON'} للمستخدم`,
      });

      setBalanceData({
        telegramId: "",
        amount: "",
        type: "coins",
        action: "add"
      });
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الرصيد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserQualification = async () => {
    if (!qualificationData.telegramId) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال معرف التليجرام",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const functionName = qualificationData.action === 'qualify' 
        ? 'add_manual_qualified_user' 
        : 'remove_manual_qualified_user';

      const { data, error } = await supabase.rpc(functionName, {
        user_telegram_id: parseInt(qualificationData.telegramId),
        ...(qualificationData.action === 'qualify' && qualificationData.reason && {
          reason: qualificationData.reason
        })
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم ${qualificationData.action === 'qualify' ? 'تأهيل' : 'إلغاء تأهيل'} المستخدم بنجاح`,
      });

      setQualificationData({
        telegramId: "",
        action: "qualify",
        reason: ""
      });
    } catch (error) {
      console.error('Error updating qualification:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث التأهيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAirdropTiming = async () => {
    if (!airdropData.endDate) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ النهاية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // إنشاء إعلان في جدول default_tasks
      const { error } = await supabase
        .from('default_tasks')
        .insert({
          task_id: `airdrop_${Date.now()}`,
          title: "الانزال الجوي القادم",
          description: airdropData.description || "استعد للانزال الجوي القادم",
          task_type: "announcement",
          reward_amount: 0
        });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء إعلان الانزال الجوي بنجاح",
      });

      setAirdropData({
        startDate: "",
        endDate: "",
        description: ""
      });
    } catch (error) {
      console.error('Error creating airdrop announcement:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء إعلان الانزال الجوي",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          لوحة الأدمن
        </h1>
        <p className="text-muted-foreground">
          إدارة شاملة للنظام والمستخدمين
        </p>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            المهام
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            الأرصدة
          </TabsTrigger>
          <TabsTrigger value="qualification" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            التأهيل
          </TabsTrigger>
          <TabsTrigger value="airdrop" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            الانزال الجوي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                إنشاء مهمة جديدة
              </CardTitle>
              <CardDescription>
                إضافة مهام جديدة للمستخدمين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">عنوان المهمة</Label>
                <Input
                  id="taskTitle"
                  placeholder="اكتب عنوان المهمة..."
                  value={taskData.title}
                  onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskDescription">وصف المهمة</Label>
                <Textarea
                  id="taskDescription"
                  placeholder="اكتب وصف المهمة..."
                  value={taskData.description}
                  onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskType">نوع المهمة</Label>
                  <select
                    id="taskType"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={taskData.type}
                    onChange={(e) => setTaskData({...taskData, type: e.target.value})}
                  >
                    <option value="platform">منصة</option>
                    <option value="social">وسائل التواصل</option>
                    <option value="survey">استبيان</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taskReward">المكافأة (عملة)</Label>
                  <Input
                    id="taskReward"
                    type="number"
                    placeholder="10"
                    value={taskData.reward}
                    onChange={(e) => setTaskData({...taskData, reward: parseInt(e.target.value) || 10})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskRequirements">المتطلبات (JSON اختياري)</Label>
                <Textarea
                  id="taskRequirements"
                  placeholder='{"minimum_age": 18, "location": "any"}'
                  value={taskData.requirements}
                  onChange={(e) => setTaskData({...taskData, requirements: e.target.value})}
                  rows={2}
                />
              </div>

              <Button onClick={handleCreateTask} disabled={loading} className="w-full">
                {loading ? "جاري الإنشاء..." : "إنشاء المهمة"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                إدارة أرصدة المستخدمين
              </CardTitle>
              <CardDescription>
                إضافة أو تعديل أرصدة العملات و TON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="balanceTelegramId">معرف التليجرام</Label>
                <Input
                  id="balanceTelegramId"
                  type="number"
                  placeholder="123456789"
                  value={balanceData.telegramId}
                  onChange={(e) => setBalanceData({...balanceData, telegramId: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balanceAmount">المبلغ</Label>
                  <Input
                    id="balanceAmount"
                    type="number"
                    step="0.1"
                    placeholder="100"
                    value={balanceData.amount}
                    onChange={(e) => setBalanceData({...balanceData, amount: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balanceType">نوع الرصيد</Label>
                  <select
                    id="balanceType"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={balanceData.type}
                    onChange={(e) => setBalanceData({...balanceData, type: e.target.value as "coins" | "ton"})}
                  >
                    <option value="coins">عملات</option>
                    <option value="ton">TON</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balanceAction">العملية</Label>
                  <select
                    id="balanceAction"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    value={balanceData.action}
                    onChange={(e) => setBalanceData({...balanceData, action: e.target.value as "add" | "set" | "subtract"})}
                  >
                    <option value="add">إضافة</option>
                    <option value="subtract">خصم</option>
                    <option value="set">تعيين</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleUserBalance} disabled={loading} className="w-full">
                {loading ? "جاري التحديث..." : "تحديث الرصيد"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualification">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                إدارة تأهيل المستخدمين
              </CardTitle>
              <CardDescription>
                تأهيل أو إلغاء تأهيل المستخدمين يدوياً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualificationTelegramId">معرف التليجرام</Label>
                <Input
                  id="qualificationTelegramId"
                  type="number"
                  placeholder="123456789"
                  value={qualificationData.telegramId}
                  onChange={(e) => setQualificationData({...qualificationData, telegramId: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualificationAction">العملية</Label>
                <select
                  id="qualificationAction"
                  className="w-full p-2 border border-border rounded-md bg-background"
                  value={qualificationData.action}
                  onChange={(e) => setQualificationData({...qualificationData, action: e.target.value as "qualify" | "disqualify"})}
                >
                  <option value="qualify">تأهيل</option>
                  <option value="disqualify">إلغاء التأهيل</option>
                </select>
              </div>

              {qualificationData.action === 'qualify' && (
                <div className="space-y-2">
                  <Label htmlFor="qualificationReason">سبب التأهيل (اختياري)</Label>
                  <Input
                    id="qualificationReason"
                    placeholder="تأهيل يدوي من الإدارة"
                    value={qualificationData.reason}
                    onChange={(e) => setQualificationData({...qualificationData, reason: e.target.value})}
                  />
                </div>
              )}

              <Button onClick={handleUserQualification} disabled={loading} className="w-full">
                {loading ? "جاري التحديث..." : (qualificationData.action === 'qualify' ? "تأهيل المستخدم" : "إلغاء التأهيل")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="airdrop">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                إعدادات الانزال الجوي
              </CardTitle>
              <CardDescription>
                تحديد أوقات ومواعيد الانزال الجوي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="airdropEndDate">تاريخ الانزال الجوي</Label>
                <Input
                  id="airdropEndDate"
                  type="datetime-local"
                  value={airdropData.endDate}
                  onChange={(e) => setAirdropData({...airdropData, endDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="airdropDescription">وصف الانزال الجوي</Label>
                <Textarea
                  id="airdropDescription"
                  placeholder="تفاصيل حول الانزال الجوي..."
                  value={airdropData.description}
                  onChange={(e) => setAirdropData({...airdropData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <Button onClick={handleAirdropTiming} disabled={loading} className="w-full">
                {loading ? "جاري الإنشاء..." : "إنشاء إعلان الانزال الجوي"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;