import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PepeWithdrawalDialogProps {
  telegramId?: number;
  pepeBalance: number;
  onWithdrawalSuccess: () => void;
}

export function PepeWithdrawalDialog({ telegramId, pepeBalance, onWithdrawalSuccess }: PepeWithdrawalDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [binanceId, setBinanceId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!telegramId) return;

    const withdrawalAmount = parseFloat(amount);
    
    if (!withdrawalAmount || withdrawalAmount < 1) {
      toast({
        title: "خطأ في الكمية",
        description: "يجب أن تكون الكمية 1 PEPE على الأقل",
        variant: "destructive"
      });
      return;
    }

    if (withdrawalAmount > pepeBalance) {
      toast({
        title: "رصيد غير كافي",
        description: "الكمية المطلوبة أكبر من رصيدك الحالي",
        variant: "destructive"
      });
      return;
    }

    if (!binanceId.trim()) {
      toast({
        title: "مطلوب ايدي بينانس",
        description: "يرجى إدخال ايدي بينانس الخاص بك",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // الحصول على معلومات المستخدم
      const { data: userData, error: userError } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (userError || !userData) {
        throw new Error('فشل في العثور على بيانات المستخدم');
      }

      // إرسال طلب السحب
      const { error } = await supabase
        .from('pepe_withdrawal_requests')
        .insert({
          telegram_user_id: userData.id,
          telegram_id: telegramId,
          pepe_amount: withdrawalAmount,
          binance_id: binanceId.trim(),
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      // تحديث الرصيد في localStorage
      const newBalance = pepeBalance - withdrawalAmount;
      localStorage.setItem(`pepe_balance_${telegramId}`, newBalance.toString());

      toast({
        title: "تم إرسال الطلب بنجاح! ✅",
        description: `طلب سحب ${withdrawalAmount} PEPE إلى ${binanceId} قيد المراجعة`,
        variant: "default"
      });

      setOpen(false);
      setAmount("");
      setBinanceId("");
      onWithdrawalSuccess();

    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال طلب السحب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pepeBalance < 1}
          className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          سحب إلى ايدي بينانس
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Coins className="w-5 h-5" />
            سحب رصيد PEPE القابل للسحب
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            يمكنك سحب رصيد PEPE العادي فقط - الرصيد الإعلاني غير قابل للسحب
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-950/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">رصيدك القابل للسحب</p>
            <p className="text-2xl font-bold text-green-600">{pepeBalance.toLocaleString()} PEPE</p>
            <p className="text-xs text-green-600/70">رصيد عادي قابل للسحب</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">الكمية المراد سحبها</Label>
            <Input
              id="amount"
              type="number"
              placeholder="أدخل الكمية (الحد الأدنى: 1)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={pepeBalance}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="binanceId">ايدي بينانس</Label>
            <Input
              id="binanceId"
              type="text"
              placeholder="أدخل ايدي بينانس الخاص بك"
              value={binanceId}
              onChange={(e) => setBinanceId(e.target.value)}
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/50 rounded-lg p-3 text-sm">
            <p className="text-yellow-700 dark:text-yellow-300">
              ⚠️ تأكد من صحة ايدي بينانس، لن يمكن تعديله بعد الإرسال
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}