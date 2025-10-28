import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bot, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function BotSetup() {
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const setupWebhook = async () => {
    setIsSettingWebhook(true);
    setWebhookStatus('idle');

    try {
      console.log('Setting up webhook...');
      
      const { data, error } = await supabase.functions.invoke('setup-telegram-webhook');
      
      if (error) {
        console.error('Error calling function:', error);
        throw error;
      }

      console.log('Webhook setup response:', data);

      if (data?.success) {
        setWebhookStatus('success');
        toast({
          title: "✅ تم بنجاح!",
          description: "تم إعداد البوت بنجاح. جرب إرسال /start الآن",
        });
      } else {
        throw new Error(data?.error || 'فشل في إعداد الـ webhook');
      }
    } catch (error) {
      console.error('Setup webhook error:', error);
      setWebhookStatus('error');
      toast({
        title: "❌ خطأ",
        description: `فشل في إعداد البوت: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">إعداد بوت تليجرام</h1>
          <p className="text-muted-foreground">اضغط على الزر أدناه لربط البوت بالتطبيق</p>
        </div>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bot className="w-5 h-5 text-primary" />
              حالة البوت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Bot Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Telegram Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    {webhookStatus === 'success' ? 'متصل ويعمل' : 'يحتاج إعداد'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {webhookStatus === 'success' && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">متصل</span>
                  </div>
                )}
                {webhookStatus === 'error' && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">خطأ</span>
                  </div>
                )}
              </div>
            </div>

            {/* Setup Button */}
            <div className="text-center space-y-4">
              <Button 
                onClick={setupWebhook}
                disabled={isSettingWebhook}
                size="lg"
                className="w-full"
              >
                {isSettingWebhook ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الإعداد...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    إعداد البوت
                  </>
                )}
              </Button>

              {webhookStatus === 'success' && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ✅ تم إعداد البوت بنجاح! الآن يمكنك الذهاب لتليجرام وإرسال /start
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold text-foreground">التعليمات:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>اضغط على "إعداد البوت" أعلاه</li>
                <li>انتظر حتى يظهر "تم بنجاح"</li>
                <li>اذهب لبوتك في تليجرام</li>
                <li>اكتب /start</li>
                <li>ستحصل على رسالة ترحيب مع زر لفتح التطبيق</li>
              </ol>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}