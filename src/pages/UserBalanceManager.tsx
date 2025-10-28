import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Minus } from "lucide-react";

const UserBalanceManager = () => {
  const [telegramId, setTelegramId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateBalance = async (action: 'add' | 'subtract' | 'set') => {
    if (!telegramId || !amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Find user by telegram_id
      const { data: userData, error: userError } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id', parseInt(telegramId))
        .single();

      if (userError || !userData) {
        toast({
          title: "خطأ",
          description: "المستخدم غير موجود",
          variant: "destructive",
        });
        return;
      }

      // Calculate new balance
      const currentBalance = userData.coins || 0;
      let newBalance;
      let amountToSend;
      
      if (action === 'set') {
        newBalance = numericAmount;
        amountToSend = numericAmount;
      } else {
        const finalAmount = action === 'add' ? numericAmount : -numericAmount;
        newBalance = currentBalance + finalAmount;
        amountToSend = Math.abs(finalAmount);
      }

      if (newBalance < 0 && action !== 'set') {
        toast({
          title: "خطأ",
          description: "لا يمكن أن يكون الرصيد سالباً",
          variant: "destructive",
        });
        return;
      }

      // Update user balance using secure balance update
      const { error: updateError } = await supabase.functions.invoke('secure-balance-update', {
        body: {
          telegram_id: userData.telegram_id,
          balance_type: 'coins',
          amount: amountToSend,
          operation: action,
          source: 'admin_manual_adjustment',
          metadata: {
            admin_reason: reason || 'تعديل يدوي من لوحة التحكم',
            previous_balance: currentBalance
          }
        }
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "تم بنجاح",
        description: `تم ${action === 'add' ? 'إضافة' : action === 'subtract' ? 'خصم' : 'تعيين'} ${action === 'set' ? 'الرصيد إلى' : ''} ${numericAmount} نقطة ${action === 'add' ? 'إلى' : action === 'subtract' ? 'من' : ''} رصيد المستخدم. الرصيد الجديد: ${newBalance}`,
      });

      // Reset form
      setTelegramId("");
      setAmount("");
      setReason("");

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

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">إدارة رصيد المستخدم</CardTitle>
          <CardDescription className="text-center">
            إضافة، خصم، أو تعيين النقاط لرصيد المستخدم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegramId">معرف التليجرام</Label>
            <Input
              id="telegramId"
              type="number"
              placeholder="أدخل معرف التليجرام"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">عدد النقاط</Label>
            <Input
              id="amount"
              type="number"
              step="0.1"
              placeholder="أدخل عدد النقاط"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">السبب (اختياري)</Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب التعديل..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdateBalance('add')}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              إضافة نقاط
            </Button>

            <Button
              onClick={() => handleUpdateBalance('subtract')}
              disabled={loading}
              className="flex-1"
              variant="destructive"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Minus className="mr-2 h-4 w-4" />
              )}
              خصم نقاط
            </Button>
          </div>

          <Button
            onClick={() => handleUpdateBalance('set')}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            تعيين الرصيد
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserBalanceManager;