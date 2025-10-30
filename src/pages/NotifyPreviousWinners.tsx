import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Bell, Users, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const NotifyPreviousWinners = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleNotifyPreviousWinners = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      console.log('Calling notify-previous-winners function...');
      
      const { data, error } = await supabase.functions.invoke('notify-previous-winners');

      if (error) {
        console.error('Error calling function:', error);
        throw error;
      }

      console.log('Function response:', data);
      setResult(data);

      toast({
        title: "✅ تم الإرسال بنجاح",
        description: `تم إرسال رسائل للفائزين السابقين. نجح: ${data.successful_notifications}, فشل: ${data.failed_notifications}`,
      });

    } catch (error: any) {
      console.error('Error notifying previous winners:', error);
      toast({
        title: "❌ خطأ في الإرسال",
        description: error.message || "حدث خطأ أثناء إرسال الرسائل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">
          إشعار الفائزين السابقين
        </h1>
        <p className="text-muted-foreground text-center">
          إرسال رسائل محدثة لجميع الفائزين السابقين مع معلومات القناة ومنشئ المسابقة
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              إرسال الإشعارات
            </CardTitle>
            <CardDescription>
              سيتم إرسال رسالة لكل فائز سابق تحتوي على معلومات محدثة عن المسابقة التي فاز بها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ما سيتم إرساله:
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• اسم المسابقة ووصفها</li>
                  <li>• الجائزة ومركز الفوز</li>
                  <li>• اسم القناة ويوزر صاحب المسابقة</li>
                  <li>• تاريخ الفوز</li>
                </ul>
              </div>

              <Button 
                onClick={handleNotifyPreviousWinners}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    إرسال الإشعارات للفائزين السابقين
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                نتائج الإرسال
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.total_processed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    إجمالي المعالجة
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.successful_notifications || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    نجح الإرسال
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.failed_notifications || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    فشل الإرسال
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "مكتمل" : "خطأ"}
                  </Badge>
                </div>
              </div>
              
              {result.message && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{result.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تحذير مهم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 text-sm">
              هذه العملية ستُرسل رسائل لجميع الفائزين السابقين. تأكد من أن البوت يعمل بشكل صحيح قبل المتابعة.
              العملية قد تستغرق وقتاً إذا كان هناك عدد كبير من الفائزين.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotifyPreviousWinners;