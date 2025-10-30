import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';

const QuickAddTon = () => {
  const [autoExecuted, setAutoExecuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const targetUserId = 6195301672;
  const tonAmount = 1;

  const handleAddTon = async () => {
    setLoading(true);
    setResult('');
    setSuccess(false);

    try {
      console.log(`🚀 تنفيذ العملية: إضافة ${tonAmount} TON للمستخدم ${targetUserId}`);

      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: targetUserId,
          ton_balance: tonAmount,
          action: 'add_ton'
        }
      });

      console.log('📊 نتيجة الـ function:', { data, error });

      if (error) {
        console.error('❌ خطأ في الـ function:', error);
        toast({
          title: '❌ فشل',
          description: `فشل في إضافة TON: ${error.message}`,
          variant: 'destructive'
        });
        setResult(`❌ خطأ: ${JSON.stringify(error, null, 2)}`);
        setSuccess(false);
      } else {
        console.log('✅ نجح:', data);
        toast({
          title: '🎉 نجح العملية!',
          description: `تم إضافة ${tonAmount} TON للمستخدم ${targetUserId} بنجاح`,
        });
        setResult(`✅ نجح!\n\n${JSON.stringify(data, null, 2)}`);
        setSuccess(true);
      }
    } catch (err) {
      console.error('💥 خطأ غير متوقع:', err);
      toast({
        title: '💥 خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
      setResult(`💥 خطأ غير متوقع: ${err}`);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // تنفيذ تلقائي عند تحميل الصفحة (مرة واحدة)
  useEffect(() => {
    if (!autoExecuted) {
      setAutoExecuted(true);
      // تأخير بسيط للتأكد من تحميل التطبيق
      setTimeout(() => {
        handleAddTon();
      }, 1000);
    }
  }, [autoExecuted]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              تنفيذ سريع - إضافة TON
              {success && <CheckCircle className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg"><strong>👤 المستخدم:</strong> {targetUserId}</p>
              <p className="text-lg"><strong>💰 المبلغ:</strong> {tonAmount} TON</p>
              <p className="text-lg"><strong>⚡ الحالة:</strong> 
                {loading ? ' جاري التنفيذ...' : success ? ' تم بنجاح!' : ' في الانتظار'}
              </p>
            </div>
            
            <Button 
              onClick={handleAddTon} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  🔄 جاري إضافة TON...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ✅ تم بنجاح - إضافة مرة أخرى؟
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  ⚡ إضافة 1 TON للمستخدم
                </>
              )}
            </Button>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        🎉 نجح العملية
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        ❌ فشل العملية
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                    {result}
                  </pre>
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>ملاحظة:</strong> هذه الصفحة تنفذ العملية تلقائياً عند التحميل</p>
              <p>🔍 تحقق من الكونسول (F12) لمزيد من التفاصيل</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickAddTon;