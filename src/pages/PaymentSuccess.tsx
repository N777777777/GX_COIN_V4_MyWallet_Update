import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // إعادة تحديث صفحة المحفظة بعد 3 ثوانٍ
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-green-600 dark:text-green-400">
            تم الدفع بنجاح! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">المبلغ المدفوع</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {amount || 'غير محدد'} TON
            </p>
          </div>
          
          {paymentId && (
            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
              معرف الدفع: {paymentId}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              تم إضافة المبلغ إلى رصيدك بنجاح
            </p>
            <p className="text-xs text-muted-foreground">
              سيتم إعادة توجيهك إلى الصفحة الرئيسية خلال 5 ثوانٍ
            </p>
          </div>

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة إلى المحفظة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;