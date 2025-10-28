import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bot, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  MessageSquare,
  Settings,
  Activity,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BotStatus {
  webhook: 'checking' | 'active' | 'inactive' | 'error';
  token: 'checking' | 'valid' | 'invalid' | 'missing' | 'error';
  connection: 'checking' | 'connected' | 'disconnected' | 'error';
}

export default function BotDiagnostic() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    webhook: 'checking',
    token: 'checking',
    connection: 'checking'
  });
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('مرحبا! هذه رسالة اختبار من البوت 🤖');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [lastLogs, setLastLogs] = useState<string[]>([]);
  const { toast } = useToast();

  // فحص حالة البوت عند تحميل الصفحة
  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    setBotStatus({
      webhook: 'checking',
      token: 'checking', 
      connection: 'checking'
    });

    try {
      // 1. فحص التوكن
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('check-bot-token');
      
      if (tokenError) {
        setBotStatus(prev => ({ ...prev, token: 'error' }));
      } else if (tokenData?.valid) {
        setBotStatus(prev => ({ ...prev, token: 'valid' }));
      } else {
        setBotStatus(prev => ({ ...prev, token: 'invalid' }));
      }

      // 2. فحص الـ webhook
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('check-webhook-status');
      
      if (webhookError) {
        setBotStatus(prev => ({ ...prev, webhook: 'error' }));
      } else if (webhookData?.active) {
        setBotStatus(prev => ({ ...prev, webhook: 'active' }));
      } else {
        setBotStatus(prev => ({ ...prev, webhook: 'inactive' }));
      }

      // 3. فحص الاتصال
      const { data: connectionData, error: connectionError } = await supabase.functions.invoke('test-bot-connection');
      
      if (connectionError) {
        setBotStatus(prev => ({ ...prev, connection: 'error' }));
      } else if (connectionData?.connected) {
        setBotStatus(prev => ({ ...prev, connection: 'connected' }));
      } else {
        setBotStatus(prev => ({ ...prev, connection: 'disconnected' }));
      }

      // 4. جلب آخر السجلات
      await fetchLogs();

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast({
        title: "❌ خطأ في التشخيص",
        description: "حدث خطأ أثناء فحص حالة البوت",
        variant: "destructive",
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const setupWebhook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-telegram-webhook');
      
      if (error) throw error;

      if (data?.success) {
        setBotStatus(prev => ({ ...prev, webhook: 'active' }));
        toast({
          title: "✅ تم بنجاح!",
          description: "تم إعداد الـ webhook بنجاح",
        });
        await runDiagnostic();
      } else {
        throw new Error(data?.error || 'فشل في إعداد الـ webhook');
      }
    } catch (error) {
      toast({
        title: "❌ خطأ",
        description: `فشل في إعداد الـ webhook: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const sendTestMessage = async () => {
    if (!testChatId.trim()) {
      toast({
        title: "❌ خطأ",
        description: "يرجى إدخال Chat ID",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-message', {
        body: {
          chatId: parseInt(testChatId),
          message: testMessage
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "✅ تم الإرسال!",
          description: "تم إرسال الرسالة الاختبارية بنجاح",
        });
      } else {
        throw new Error(data?.error || 'فشل في إرسال الرسالة');
      }
    } catch (error) {
      toast({
        title: "❌ خطأ",
        description: `فشل في إرسال الرسالة: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-bot-logs');
      if (data?.logs) {
        setLastLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const getStatusBadge = (status: string, label: string) => {
    const variants = {
      checking: { variant: 'secondary' as const, icon: Loader2, className: 'animate-spin' },
      active: { variant: 'default' as const, icon: CheckCircle, className: 'text-green-600' },
      valid: { variant: 'default' as const, icon: CheckCircle, className: 'text-green-600' },
      connected: { variant: 'default' as const, icon: CheckCircle, className: 'text-green-600' },
      inactive: { variant: 'destructive' as const, icon: XCircle, className: '' },
      invalid: { variant: 'destructive' as const, icon: XCircle, className: '' },
      disconnected: { variant: 'destructive' as const, icon: XCircle, className: '' },
      error: { variant: 'destructive' as const, icon: AlertCircle, className: '' },
      missing: { variant: 'destructive' as const, icon: AlertCircle, className: '' },
    };

    const config = variants[status] || variants.error;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-2">
        <IconComponent className={`w-3 h-3 ${config.className}`} />
        {label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">تشخيص البوت</h1>
          <p className="text-muted-foreground">فحص شامل لحالة البوت وإصلاح المشاكل</p>
        </div>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">الحالة</TabsTrigger>
            <TabsTrigger value="test">اختبار</TabsTrigger>
            <TabsTrigger value="logs">السجلات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  حالة البوت
                </CardTitle>
                <Button 
                  onClick={runDiagnostic}
                  disabled={isRunningDiagnostic}
                  variant="outline"
                  size="sm"
                >
                  {isRunningDiagnostic ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  إعادة فحص
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Bot className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium">توكن البوت</h3>
                        <p className="text-sm text-muted-foreground">صحة التوكن</p>
                      </div>
                    </div>
                    {getStatusBadge(botStatus.token, 
                      botStatus.token === 'valid' ? 'صحيح' :
                      botStatus.token === 'invalid' ? 'خاطئ' :
                      botStatus.token === 'missing' ? 'مفقود' : 'فحص...'
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Zap className="w-8 h-8 text-orange-600" />
                      <div>
                        <h3 className="font-medium">Webhook</h3>
                        <p className="text-sm text-muted-foreground">حالة الاستقبال</p>
                      </div>
                    </div>
                    {getStatusBadge(botStatus.webhook,
                      botStatus.webhook === 'active' ? 'نشط' :
                      botStatus.webhook === 'inactive' ? 'غير نشط' :
                      botStatus.webhook === 'error' ? 'خطأ' : 'فحص...'
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-medium">الاتصال</h3>
                        <p className="text-sm text-muted-foreground">حالة التواصل</p>
                      </div>
                    </div>
                    {getStatusBadge(botStatus.connection,
                      botStatus.connection === 'connected' ? 'متصل' :
                      botStatus.connection === 'disconnected' ? 'منقطع' :
                      botStatus.connection === 'error' ? 'خطأ' : 'فحص...'
                    )}
                  </div>
                </div>

                {(botStatus.webhook === 'inactive' || botStatus.webhook === 'error') && (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">يحتاج إعداد Webhook</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">البوت يحتاج إعداد webhook للعمل بشكل صحيح</p>
                      </div>
                      <Button onClick={setupWebhook} size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        إعداد الآن
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  اختبار إرسال رسالة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chatId">Chat ID (معرف المحادثة)</Label>
                  <Input
                    id="chatId"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    placeholder="مثال: 123456789"
                    type="number"
                  />
                  <p className="text-sm text-muted-foreground">
                    يمكنك الحصول على Chat ID من @userinfobot في تليجرام
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">الرسالة</Label>
                  <Input
                    id="message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="اكتب رسالة الاختبار هنا..."
                  />
                </div>

                <Button 
                  onClick={sendTestMessage}
                  disabled={isSendingTest || !testChatId.trim()}
                  className="w-full"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      إرسال رسالة اختبار
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>آخر السجلات</CardTitle>
                <Button onClick={fetchLogs} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                  {lastLogs.length > 0 ? (
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {lastLogs.join('\n')}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      لا توجد سجلات متاحة
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات متقدمة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={setupWebhook} variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    إعداد Webhook
                  </Button>
                  
                  <Button 
                    onClick={() => window.open('https://supabase.com/dashboard/project/yyjxkogzsqiekbawwhgf/functions/telegram-bot/logs', '_blank')}
                    variant="outline"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    عرض سجلات Supabase
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">معلومات البوت</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>الاسم: G3_COIN_V3_BOT</p>
                    <p>URL التطبيق: https://yyjxkogzsqiekbawwhgf.supabase.co</p>
                    <p>Webhook URL: https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/telegram-bot</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}