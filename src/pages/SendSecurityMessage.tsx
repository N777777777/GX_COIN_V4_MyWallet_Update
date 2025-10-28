import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  MessageCircle, 
  Send,
  Users,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SendSecurityMessage() {
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const sendMessage = async () => {
    setIsSending(true);
    setSendStatus('idle');
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-mass-message');
      
      if (error) {
        throw error;
      }

      if (data?.success) {
        setSendStatus('success');
        setResults(data.results);
        toast({
          title: "✅ تم الإرسال بنجاح!",
          description: `تم إرسال الرسالة إلى ${data.results.success_count} مستخدم`,
        });
      } else {
        throw new Error(data?.error || 'فشل في إرسال الرسالة');
      }
    } catch (error: any) {
      console.error('Send error:', error);
      setSendStatus('error');
      toast({
        title: "❌ خطأ",
        description: `فشل في إرسال الرسالة: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = () => {
    if (isSending) return <Loader2 className="w-6 h-6 animate-spin" />;
    if (sendStatus === 'success') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (sendStatus === 'error') return <AlertTriangle className="w-6 h-6 text-red-600" />;
    return <MessageCircle className="w-6 h-6 text-blue-600" />;
  };

  const getStatusText = () => {
    if (isSending) return 'جاري إرسال الرسالة...';
    if (sendStatus === 'success') return 'تم الإرسال بنجاح!';
    if (sendStatus === 'error') return 'فشل في الإرسال';
    return 'جاهز لإرسال رسالة الأمان';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">إرسال رسالة الأمان</h1>
          <p className="text-muted-foreground">إرسال رسالة أمان للجميع بأن البوت آمن الآن</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              رسالة جماعية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                {getStatusIcon()}
                <p className="text-lg font-medium">{getStatusText()}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">نص الرسالة:</h4>
              <div className="text-sm text-muted-foreground bg-white dark:bg-gray-800 p-3 rounded border">
                🔒 تحديث أمني مهم 🔒<br/><br/>
                لقد كان البوت مخترق ولكن تم إصلاح المشكلة الآن.<br/><br/>
                ✅ يمكنكم الآن العمل بأمان تام!<br/><br/>
                🔧 ما تم إصلاحه:<br/>
                • إغلاق جميع الثغرات الأمنية<br/>
                • تحديث نظام الحماية<br/>
                • استعادة الوظائف بشكل آمن<br/><br/>
                📱 يمكنكم الآن استخدام البوت بثقة كاملة.<br/><br/>
                شكراً لصبركم وثقتكم 🙏
              </div>
            </div>

            <Button 
              onClick={sendMessage}
              disabled={isSending}
              className="w-full"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  إرسال رسالة الأمان للجميع
                </>
              )}
            </Button>

            {results && sendStatus === 'success' && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-800 dark:text-green-200">تم الإرسال بنجاح!</p>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p>• إجمالي المستخدمين: {results.total_users}</p>
                  <p>• تم الإرسال بنجاح: {results.success_count}</p>
                  <p>• فشل الإرسال: {results.fail_count}</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="font-medium text-yellow-800 dark:text-yellow-200">تنبيه مهم</p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                هذه الرسالة ستصل لجميع المستخدمين ({results?.total_users || 1534}+ مستخدم). تأكد من أن البوت يعمل بشكل صحيح قبل الإرسال.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}