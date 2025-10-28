import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function QuickBotSetup() {
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
          description: "تم إعداد البوت بنجاح. اذهب لتليجرام وجرب /start",
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-20">
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-foreground">
              <Bot className="w-6 h-6 text-primary" />
              إعداد البوت السريع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                اضغط لربط البوت بالتطبيق
              </p>
            </div>

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
                  <Bot className="w-4 h-4 mr-2" />
                  إعداد البوت الآن
                </>
              )}
            </Button>

            {webhookStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 dark:text-green-200 text-sm">
                  تم! اذهب لتليجرام وأرسل /start
                </p>
              </div>
            )}

            {webhookStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 dark:text-red-200 text-sm">
                  حدث خطأ، حاول مرة أخرى
                </p>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}