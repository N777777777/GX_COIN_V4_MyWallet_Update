import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Plus, Coins } from 'lucide-react';

const TonBalanceScript = () => {
  const [loading, setLoading] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [tonAmount, setTonAmount] = useState('1');
  const [result, setResult] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleAddTon = async () => {
    if (!telegramId || !tonAmount) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال معرف التليجرام ومبلغ التون',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setResult('');
    setSuccess(false);

    try {
      console.log(`إضافة ${tonAmount} TON للمستخدم ${telegramId}`);

      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: parseInt(telegramId),
          ton_balance: parseFloat(tonAmount),
          action: 'add_ton'
        }
      });

      console.log('نتيجة الـ function:', { data, error });

      if (error) {
        console.error('خطأ في الـ function:', error);
        toast({
          title: 'فشل',
          description: `فشل في إضافة TON: ${error.message}`,
          variant: 'destructive'
        });
        setResult(`خطأ: ${error.message}`);
        setSuccess(false);
      } else {
        console.log('نجح:', data);
        toast({
          title: 'نجح العملية!',
          description: `تم إضافة ${tonAmount} TON للمستخدم ${telegramId} بنجاح`,
        });
        setResult(JSON.stringify(data, null, 2));
        setSuccess(true);
        // إعادة تعيين النموذج للاستخدام السريع
        setTelegramId('');
        setTonAmount('1');
      }
    } catch (err) {
      console.error('خطأ غير متوقع:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
      setResult(`خطأ غير متوقع: ${err}`);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const quickAdd = (userId: string, amount: string) => {
    setTelegramId(userId);
    setTonAmount(amount);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-6 h-6" />
              سكريبت تزويد رصيد التون
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* النموذج الرئيسي */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telegramId">معرف التليجرام</Label>
                <Input
                  id="telegramId"
                  type="number"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="6195301672"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tonAmount">مبلغ التون</Label>
                <Input
                  id="tonAmount"
                  type="number"
                  step="0.1"
                  value={tonAmount}
                  onChange={(e) => setTonAmount(e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  onClick={handleAddTon} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      إضافة TON
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* أزرار سريعة */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">إضافة سريعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => quickAdd('6195301672', '1')}
                  className="text-sm"
                >
                  إضافة 1 TON للمستخدم الأول
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => quickAdd('6195301672', '5')}
                  className="text-sm"
                >
                  إضافة 5 TON للمستخدم الأول
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => quickAdd('6195301672', '10')}
                  className="text-sm"
                >
                  إضافة 10 TON للمستخدم الأول
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => quickAdd('', '1')}
                  className="text-sm"
                >
                  إعداد 1 TON
                </Button>
              </div>
            </div>

            {/* النتيجة */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        تم بنجاح
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        فشل العملية
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-64">
                    {result}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TonBalanceScript;