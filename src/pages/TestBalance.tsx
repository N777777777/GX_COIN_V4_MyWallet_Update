import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TestBalance = () => {
  const [telegramId, setTelegramId] = useState('');
  const [coins, setCoins] = useState('');
  const [tonBalance, setTonBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const { toast } = useToast();

  const handleAddCoins = async () => {
    if (!telegramId || !coins) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال معرف التليجرام وعدد النقاط',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Calling add-balance function with:', {
        telegram_id: parseInt(telegramId),
        coins: parseFloat(coins),
        action: 'add_coins'
      });

      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: parseInt(telegramId),
          coins: parseFloat(coins),
          action: 'add_coins'
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        toast({
          title: 'خطأ',
          description: `فشل في إضافة النقاط: ${error.message}`,
          variant: 'destructive'
        });
        setResult(`خطأ: ${error.message}`);
      } else {
        console.log('Success:', data);
        toast({
          title: 'نجح',
          description: 'تم إضافة النقاط بنجاح'
        });
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
      setResult(`خطأ غير متوقع: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTon = async () => {
    if (!telegramId || !tonBalance) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال معرف التليجرام ومبلغ TON',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Calling add-balance function with:', {
        telegram_id: parseInt(telegramId),
        ton_balance: parseFloat(tonBalance),
        action: 'add_ton'
      });

      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: parseInt(telegramId),
          ton_balance: parseFloat(tonBalance),
          action: 'add_ton'
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        toast({
          title: 'خطأ',
          description: `فشل في إضافة TON: ${error.message}`,
          variant: 'destructive'
        });
        setResult(`خطأ: ${error.message}`);
      } else {
        console.log('Success:', data);
        toast({
          title: 'نجح',
          description: 'تم إضافة TON بنجاح'
        });
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
      setResult(`خطأ غير متوقع: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>اختبار إضافة الرصيد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">معرف التليجرام:</label>
              <Input
                type="number"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="123456789"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">عدد النقاط:</label>
              <Input
                type="number"
                value={coins}
                onChange={(e) => setCoins(e.target.value)}
                placeholder="100"
              />
              <Button 
                onClick={handleAddCoins} 
                disabled={loading}
                className="mt-2 w-full"
              >
                {loading ? 'جاري الإضافة...' : 'إضافة نقاط'}
              </Button>
            </div>
            
            <div>
              <label className="text-sm font-medium">مبلغ TON:</label>
              <Input
                type="number"
                step="0.01"
                value={tonBalance}
                onChange={(e) => setTonBalance(e.target.value)}
                placeholder="0.5"
              />
              <Button 
                onClick={handleAddTon} 
                disabled={loading}
                className="mt-2 w-full"
                variant="secondary"
              >
                {loading ? 'جاري الإضافة...' : 'إضافة TON'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>النتيجة:</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                {result}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestBalance;