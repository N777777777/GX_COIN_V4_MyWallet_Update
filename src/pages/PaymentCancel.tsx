import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-red-600 dark:text-red-400">
            تم إلغاء الدفع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="p-4 bg-red-50 dark:bg-red-950/50 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              لم يتم إكمال عملية الدفع
            </p>
          </div>
          
          {paymentId && (
            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
              معرف الدفع الملغي: {paymentId}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              يمكنك المحاولة مرة أخرى في أي وقت
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              محاولة الدفع مرة أخرى
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة إلى المحفظة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;