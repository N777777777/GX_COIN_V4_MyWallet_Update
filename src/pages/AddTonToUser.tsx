import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AddTonToUser = () => {
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
      console.log(`إضافة ${tonAmount} TON للمستخدم ${targetUserId}`);

      const { data, error } = await supabase.functions.invoke('add-balance', {
        body: {
          telegram_id: targetUserId,
          ton_balance: tonAmount,
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
          description: `تم إضافة ${tonAmount} TON للمستخدم ${targetUserId} بنجاح`,
        });
        setResult(JSON.stringify(data, null, 2));
        setSuccess(true);
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              إضافة TON للمستخدم
              {success && <CheckCircle className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>المستخدم:</strong> {targetUserId}</p>
              <p><strong>المبلغ:</strong> {tonAmount} TON</p>
              <p><strong>العملية:</strong> إضافة رصيد</p>
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
                  جاري إضافة TON...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  تم بنجاح - إضافة مرة أخرى؟
                </>
              ) : (
                'إضافة 1 TON للمستخدم'
              )}
            </Button>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        نجح العملية
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

export default AddTonToUser;