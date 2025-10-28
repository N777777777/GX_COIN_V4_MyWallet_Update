import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { restartBot } from "@/utils/restartBot";

export default function QuickBotRestart() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartStatus, setRestartStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  const handleRestartBot = async () => {
    setIsRestarting(true);
    setRestartStatus('idle');
    setStatusMessage('');

    try {
      const result = await restartBot();
      
      if (result.success) {
        setRestartStatus('success');
        setStatusMessage('تم إعادة تشغيل البوت بنجاح');
        toast({
          title: "نجح!",
          description: "تم إعادة تشغيل البوت بنجاح",
          variant: "default",
        });
      } else {
        throw new Error(result.error || 'فشل في إعادة تشغيل البوت');
      }
    } catch (error: any) {
      setRestartStatus('error');
      setStatusMessage(error.message);
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-6 w-6" />
            إعادة تشغيل البوت
          </CardTitle>
          <CardDescription>
            إعادة تشغيل البوت وإعداد الـ webhook من جديد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>هذه الأداة تقوم بـ:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>حذف الـ webhook القديم</li>
              <li>إعداد webhook جديد</li>
              <li>حذف الرسائل المعلقة</li>
              <li>فحص حالة البوت</li>
            </ul>
          </div>

          <Button 
            onClick={handleRestartBot} 
            disabled={isRestarting}
            className="w-full"
            size="lg"
          >
            {isRestarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري إعادة التشغيل...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                إعادة تشغيل البوت
              </>
            )}
          </Button>

          {restartStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">نجح!</p>
                <p className="text-green-700 text-sm">{statusMessage}</p>
              </div>
            </div>
          )}

          {restartStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">خطأ!</p>
                <p className="text-red-700 text-sm">{statusMessage}</p>
              </div>
            </div>
          )}

          {restartStatus === 'success' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                ✅ تم إلغاء وضع الصيانة وإعادة تشغيل البوت بنجاح!
                <br />
                يمكنك الآن اختبار البوت بإرسال رسالة له
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}