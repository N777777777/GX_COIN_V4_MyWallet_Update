import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Database, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RestoreBalances() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleRestore = async () => {
    if (!confirm('هل أنت متأكد من استعادة الأرصدة من النسخة الاحتياطية؟ سيتم استبدال الأرصدة الحالية.')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('restore-user-balances');

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "تمت الاستعادة بنجاح ✅",
          description: `تم استعادة أرصدة ${data.users_restored} مستخدم`,
        });
      } else {
        toast({
          title: "فشلت الاستعادة ❌",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              استعادة أرصدة المستخدمين
            </CardTitle>
            <CardDescription>
              استعادة الأرصدة من النسخة الاحتياطية الأخيرة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>تحذير:</strong> هذا الإجراء سيستبدل جميع الأرصدة الحالية بالأرصدة المحفوظة في النسخة الاحتياطية.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleRestore} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الاستعادة...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  استعادة الأرصدة
                </>
              )}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.message}</p>
                    {result.users_restored !== undefined && (
                      <p>المستخدمين المستعادين: {result.users_restored}</p>
                    )}
                    {result.errors > 0 && (
                      <p className="text-red-500">أخطاء: {result.errors}</p>
                    )}
                    {result.error_details && result.error_details.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">عرض الأخطاء</summary>
                        <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                          {JSON.stringify(result.error_details, null, 2)}
                        </pre>
                      </details>
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
