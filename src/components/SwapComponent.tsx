import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRightLeft, Megaphone, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SwapComponentProps {
  telegramId?: number;
  tonBalance: number;
  pepeAdvertisingBalance: number;
  onSwap: (tonAmount: number, pepeAmount: number) => void;
}

export function SwapComponent({ telegramId, tonBalance, pepeAdvertisingBalance, onSwap }: SwapComponentProps) {
  const { toast } = useToast();
  const [inputAmount, setInputAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'ton-to-pepe' | 'pepe-to-ton'>('ton-to-pepe');
  
  // معدل التبديل: 1 TON = 300,000 PEPE
  const exchangeRate = 300000;
  
  const calculatePepeAmount = (ton: number) => {
    return ton * exchangeRate;
  };

  const calculateTonAmount = (pepe: number) => {
    return pepe / exchangeRate;
  };

  const getOutputAmount = () => {
    const amount = parseFloat(inputAmount) || 0;
    if (swapDirection === 'ton-to-pepe') {
      return calculatePepeAmount(amount);
    } else {
      return calculateTonAmount(amount);
    }
  };

  const getCurrentBalance = () => {
    return swapDirection === 'ton-to-pepe' ? tonBalance : pepeAdvertisingBalance;
  };

  const toggleSwapDirection = () => {
    setSwapDirection(prev => prev === 'ton-to-pepe' ? 'pepe-to-ton' : 'ton-to-pepe');
    setInputAmount('');
  };

  const handleSwap = async () => {
    const amount = parseFloat(inputAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "كمية غير صحيحة",
        description: `يرجى إدخال كمية صحيحة${swapDirection === 'ton-to-pepe' ? ' من TON' : ' من PEPE'}`,
        variant: "destructive"
      });
      return;
    }

    const currentBalance = getCurrentBalance();
    if (amount > currentBalance) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيدك${swapDirection === 'ton-to-pepe' ? ' من TON' : ' من PEPE'} غير كافي`,
        variant: "destructive"
      });
      return;
    }

    try {
      let result: { success: boolean; message?: string };
      
      if (swapDirection === 'ton-to-pepe') {
        const pepeAmount = calculatePepeAmount(amount);
        const { data, error } = await supabase.rpc('swap_ton_to_pepe', {
          user_telegram_id: telegramId,
          ton_amount: amount
        });
        
        if (error) throw error;
        result = data as { success: boolean; message?: string };
        
        if (result.success) {
          onSwap(amount, pepeAmount);
          toast({
            title: "تم التحويل بنجاح! 🎉",
            description: `تم تحويل ${amount} TON إلى ${pepeAmount.toLocaleString()} PEPE (رصيد إعلاني)`,
          });
        }
      } else {
        const tonAmount = calculateTonAmount(amount);
        const { data, error } = await supabase.rpc('swap_pepe_to_ton', {
          user_telegram_id: telegramId,
          pepe_amount: amount
        });
        
        if (error) throw error;
        result = data as { success: boolean; message?: string };
        
        if (result.success) {
          onSwap(-tonAmount, -amount); // Negative values to indicate direction
          toast({
            title: "تم التحويل بنجاح! 🎉",
            description: `تم تحويل ${amount.toLocaleString()} PEPE إلى ${tonAmount.toFixed(4)} TON`,
          });
        }
      }

      if (result.success) {
        setInputAmount('');
      } else {
        throw new Error(result.message || 'فشل التبديل');
      }
    } catch (error) {
      console.error('Swap error:', error);
      toast({
        title: "فشل التبديل",
        description: "حدث خطأ أثناء عملية التبديل",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <ArrowRightLeft className="w-6 h-6" />
          تبديل TON إلى رصيد إعلاني
        </CardTitle>
        <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
          تحويل TON إلى PEPE للاستخدام في الحملات ومهام الشركاء
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
  return (
    <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <ArrowRightLeft className="w-6 h-6" />
          تبديل العملات
        </CardTitle>
        <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
          {swapDirection === 'ton-to-pepe' 
            ? 'تحويل TON إلى PEPE للاستخدام في الحملات ومهام الشركاء'
            : 'تحويل PEPE إلى TON للاستخدام العام'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* بطاقة العملة الأولى */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">من</span>
            <span className="text-sm font-medium">
              الرصيد: {getCurrentBalance().toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {swapDirection === 'ton-to-pepe' ? '💎' : '🟠'}
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {swapDirection === 'ton-to-pepe' ? 'TON' : 'PEPE'}
              </div>
              <Input
                type="number"
                placeholder={`أدخل كمية ${swapDirection === 'ton-to-pepe' ? 'TON' : 'PEPE'}`}
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                min="0"
                step={swapDirection === 'ton-to-pepe' ? '0.0001' : '1'}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* زر التبديل */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSwapDirection}
            className="rounded-full"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* بطاقة العملة الثانية */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">إلى</span>
            <span className="text-sm font-medium">
              الرصيد: {swapDirection === 'ton-to-pepe' 
                ? pepeAdvertisingBalance.toLocaleString() 
                : tonBalance.toFixed(2)
              }
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {swapDirection === 'ton-to-pepe' ? '🟠' : '💎'}
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {swapDirection === 'ton-to-pepe' ? 'PEPE (رصيد إعلاني)' : 'TON'}
              </div>
              <div className="text-lg font-bold text-primary mt-1">
                {inputAmount && parseFloat(inputAmount) > 0 
                  ? getOutputAmount().toLocaleString()
                  : '0'
                }
              </div>
            </div>
          </div>
        </div>

        {/* معدل التبديل */}
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">معدل التبديل</p>
          <p className="font-bold">
            {swapDirection === 'ton-to-pepe' 
              ? '1 TON = 300,000 PEPE'
              : '300,000 PEPE = 1 TON'
            }
          </p>
        </div>

        {/* زر التبديل */}
        <Button
          onClick={handleSwap}
          disabled={!inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > getCurrentBalance()}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          {swapDirection === 'ton-to-pepe' 
            ? 'تحويل إلى رصيد إعلاني'
            : 'تحويل إلى TON'
          }
        </Button>
      </CardContent>
    </Card>
  );
      </CardContent>
    </Card>
  );
}