import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ArcKeyPaymentProps {
  telegramId?: number;
}

export function ArcKeyPayment({ telegramId }: ArcKeyPaymentProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const createPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "مبلغ غير صحيح",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive"
      });
      return;
    }

    if (!telegramId) {
      toast({
        title: "خطأ في التعريف",
        description: "معرف التليجرام غير متوفر",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-arcpay-payment', {
        body: {
          amount: parseFloat(amount),
          telegram_user_id: telegramId,
          telegram_id: telegramId,
          description: `شراء ${amount} TON - G Coin`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.payment_url) {
        setPaymentUrl(data.payment_url);
        setPaymentId(data.payment_id);
        setPaymentStatus('pending');
        toast({
          title: "🚀 رابط الدفع جاهز",
          description: "ادفع عبر @ArcPayBot الآن",
          variant: "default"
        });
      } else {
        throw new Error(data?.error || 'فشل في إنشاء رابط الدفع');
      }
    } catch (error: any) {
      console.error('Payment creation error:', error);
      toast({
        title: "خطأ في إنشاء الدفع",
        description: error.message || "حدث خطأ أثناء إنشاء رابط الدفع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // فحص حالة الدفع كل 30 ثانية
  useEffect(() => {
    if (!paymentId) return;

    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('arckey-callback', {
          body: { payment_id: paymentId, action: 'check_status' }
        });

        if (data?.status === 'completed') {
          setPaymentStatus('completed');
          toast({
            title: "✅ تم الدفع بنجاح",
            description: "تم إضافة TON إلى رصيدك",
            variant: "default"
          });
        } else if (data?.status === 'failed') {
          setPaymentStatus('failed');
          toast({
            title: "❌ فشل الدفع",
            description: "حاول مرة أخرى",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 30000);
    return () => clearInterval(interval);
  }, [paymentId, toast]);

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <CreditCard className="w-5 h-5" />
          دفع عبر @ArcPayBot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!paymentUrl ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">مبلغ الدفع (TON)</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="أدخل المبلغ (مثال: 1.5)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/50 p-2 rounded">
              💡 سيتم الدفع عبر @ArcPayBot على تليجرام
            </div>
            <Button
              onClick={createPayment}
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            >
              {loading ? "جاري إنشاء الدفع..." : "🚀 إنشاء فاتورة ArcPay"}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            {paymentStatus === 'completed' ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">تم الدفع بنجاح!</div>
                  <div className="text-sm text-green-600 dark:text-green-400">تم إضافة {amount} TON إلى رصيدك</div>
                </div>
              </div>
            ) : paymentStatus === 'failed' ? (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <div>
                  <div className="font-medium text-red-700 dark:text-red-300">فشل الدفع</div>
                  <div className="text-sm text-red-600 dark:text-red-400">يرجى المحاولة مرة أخرى</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-6 h-6 text-yellow-500" />
                <div>
                  <div className="font-medium text-yellow-700 dark:text-yellow-300">في انتظار الدفع</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">انقر على الرابط أدناه للدفع عبر @ArcPayBot</div>
                </div>
              </div>
            )}
            
            {paymentStatus !== 'completed' && (
              <Button
                onClick={() => window.open(paymentUrl, '_blank')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                افتح @ArcPayBot للدفع
              </Button>
            )}
            
            {paymentStatus !== 'completed' && (
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentUrl("");
                  setPaymentId("");
                  setPaymentStatus("");
                  setAmount("");
                }}
                className="w-full"
              >
                إنشاء فاتورة جديدة
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}