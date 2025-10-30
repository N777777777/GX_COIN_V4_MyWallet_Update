import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bot, 
  RefreshCw,
  Activity,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function QuickBotRestart() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartStatus, setRestartStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const restartBot = async () => {
    setIsRestarting(true);
    setRestartStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('restart-bot');
      
      if (error) {
        throw error;
      }

      if (data?.success) {
        setRestartStatus('success');
        toast({
          title: "✅ تم بنجاح!",
          description: "تم إعادة تشغيل البوت بنجاح",
        });
        
        // إظهار معلومات البوت
        console.log('Bot info:', data.bot_info);
        console.log('Webhook info:', data.webhook_info);
      } else {
        throw new Error(data?.error || 'فشل في إعادة تشغيل البوت');
      }
    } catch (error: any) {
      console.error('Restart error:', error);
      setRestartStatus('error');
      toast({
        title: "❌ خطأ",
        description: `فشل في إعادة تشغيل البوت: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRestarting(false);
    }
  };

  const getStatusIcon = () => {
    if (isRestarting) return <Loader2 className="w-6 h-6 animate-spin" />;
    if (restartStatus === 'success') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (restartStatus === 'error') return <AlertTriangle className="w-6 h-6 text-red-600" />;
    return <Bot className="w-6 h-6 text-blue-600" />;
  };

  const getStatusText = () => {
    if (isRestarting) return 'جاري إعادة التشغيل...';
    if (restartStatus === 'success') return 'البوت يعمل بنجاح!';
    if (restartStatus === 'error') return 'فشل في إعادة التشغيل';
    return 'البوت جاهز للإعادة تشغيل';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">إعادة تشغيل البوت</h1>
          <p className="text-muted-foreground">إصلاح مشاكل البوت وإعادة تشغيله</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              حالة البوت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                {getStatusIcon()}
                <p className="text-lg font-medium">{getStatusText()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={restartBot}
                disabled={isRestarting}
                className="w-full"
                size="lg"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري إعادة التشغيل...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    إعادة تشغيل البوت
                  </>
                )}
              </Button>

              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2">ما يحدث عند إعادة التشغيل:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• فحص توكن البوت</li>
                  <li>• حذف webhook القديم</li>
                  <li>• إعداد webhook جديد</li>
                  <li>• حذف الرسائل المعلقة</li>
                  <li>• تفعيل استقبال الرسائل</li>
                </ul>
              </div>

              {restartStatus === 'success' && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-800 dark:text-green-200">البوت يعمل الآن!</p>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    يمكنك الآن اختبار البوت بإرسال رسالة له
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}