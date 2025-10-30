import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function ResetAllBalances() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();

  const handleReset = async () => {
    if (confirmText !== "RESET ALL") {
      toast({
        title: "خطأ في التأكيد",
        description: "يجب كتابة RESET ALL للتأكيد",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('⚠️ تحذير خطير: هذا الإجراء سيحذف جميع أرصدة جميع المستخدمين بشكل نهائي! هل أنت متأكد تماماً؟')) {
      return;
    }

    if (!confirm('⚠️ تأكيد نهائي: لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('reset-all-balances');

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "تمت العملية بنجاح ✅",
          description: `تم إعادة تعيين أرصدة ${data.users_affected} مستخدم إلى الصفر`,
        });
      } else {
        toast({
          title: "فشلت العملية ❌",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setConfirmText("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              إعادة تعيين جميع الأرصدة إلى الصفر
            </CardTitle>
            <CardDescription>
              عملية خطيرة لا يمكن التراجع عنها!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ تحذير شديد الخطورة:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>سيتم حذف جميع أرصدة جميع المستخدمين</li>
                  <li>لا يمكن التراجع عن هذا الإجراء</li>
                  <li>سيتم إعادة تعيين: Coins, TON, PEPE, G-Coin, Alpha Coins</li>
                  <li>هذا الإجراء فوري ونهائي</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                للتأكيد، اكتب: <span className="text-destructive font-bold">RESET ALL</span>
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="اكتب RESET ALL للتأكيد"
                className="font-mono"
              />
            </div>

            <Button 
              onClick={handleReset} 
              disabled={loading || confirmText !== "RESET ALL"}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إعادة التعيين...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  إعادة تعيين جميع الأرصدة إلى الصفر
                </>
              )}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.message}</p>
                    {result.users_affected !== undefined && (
                      <p>عدد المستخدمين المتأثرين: {result.users_affected}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      الوقت: {new Date(result.timestamp).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
