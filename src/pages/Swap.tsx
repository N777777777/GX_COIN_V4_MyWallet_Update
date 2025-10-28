import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRightLeft, ArrowLeft, TrendingUp, Megaphone, DollarSign, Activity, Zap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramData } from '@/hooks/useTelegramData';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TonWalletButton } from '@/components/TonWalletButton';
export default function Swap() {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    goBack
  } = useBackNavigation();
  const {
    telegramUser
  } = useTelegramData();
  const telegramId = Number(telegramUser?.id);
  const [tonAmount, setTonAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'ton-to-pepe' | 'pepe-to-ton'>('ton-to-pepe');

  // جلب أسعار TON و PEPE من CoinGecko كل 30 ثانية
  const {
    ton: tonPriceData,
    pepe: pepePriceData,
    loading: pricesLoading
  } = useCryptoPrices(30000);

  // حساب معدل التبديل الديناميكي بناءً على الأسعار الفعلية
  const calculateDynamicExchangeRate = () => {
    if (tonPriceData.price > 0 && pepePriceData.price > 0) {
      return tonPriceData.price / pepePriceData.price;
    }
    return 300000; // معدل احتياطي في حالة عدم توفر الأسعار
  };
  const exchangeRate = calculateDynamicExchangeRate();

  // جلب بيانات المستخدم
  const {
    data: userData,
    refetch
  } = useQuery({
    queryKey: ['user', telegramId],
    queryFn: async () => {
      if (!telegramId) return null;
      const {
        data
      } = await supabase.from('telegram_users').select('ton_balance, bal_x7k9m').eq('telegram_id', telegramId).single();
      return data;
    },
    enabled: !!telegramId,
    refetchInterval: 30000 // تحديث كل 30 ثانية
  });
  const calculatePepeAmount = (ton: number) => {
    return ton * exchangeRate;
  };
  const handleSwap = async () => {
    const amount = parseFloat(tonAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "كمية غير صحيحة",
        description: "يرجى إدخال كمية صحيحة من TON",
        variant: "destructive"
      });
      return;
    }
    if (amount > (userData?.ton_balance || 0)) { // ton_balance not obfuscated
      toast({
        title: "رصيد غير كافي",
        description: "رصيدك من TON غير كافي",
        variant: "destructive"
      });
      return;
    }
    const pepeAmount = calculatePepeAmount(amount);
    try {
      // استدعاء فانكشن التبديل
      const {
        data,
        error
      } = await supabase.rpc('swap_ton_to_pepe', {
        user_telegram_id: telegramId,
        ton_amount: amount
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        message?: string;
      };
      if (result.success) {
        setTonAmount('');
        refetch(); // إعادة تحميل البيانات

        toast({
          title: "تم التحويل بنجاح! 🎉",
          description: `تم تحويل ${amount} TON إلى ${pepeAmount.toLocaleString()} PEPE (رصيد إعلاني)`
        });
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
  return <div className="min-h-screen bg-background p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-muted/20 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="max-w-md mx-auto space-y-6 relative z-10">
        {/* Back Button */}
        <Button variant="ghost" onClick={goBack} className="mb-4 p-2 hover:bg-muted rounded-full glow-effect">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 glass-card glow-effect relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur opacity-50" />
            <ArrowRightLeft className="w-10 h-10 text-primary-foreground relative z-10" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">تبديل العملات</h1>
          
        </div>

        {/* Live Price Cards */}
        

        {/* Exchange Rate Card */}
        

        {/* TON Wallet Connection */}
        <div className="mb-4">
          <TonWalletButton />
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="glass-card border-primary/30 shimmer-effect cursor-pointer hover:border-primary transition-all"
            onClick={() => setSwapDirection('ton-to-pepe')}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <p className="text-sm text-primary font-medium">رصيد TON</p>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {(userData?.ton_balance || 0).toFixed(4)} {/* ton_balance not obfuscated */}
              </p>
              <p className="text-xs text-muted-foreground">
                ~${((userData?.ton_balance || 0) * tonPriceData.price).toFixed(2)} {/* ton_balance not obfuscated */}
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="glass-card border-warning/30 shimmer-effect cursor-pointer hover:border-warning transition-all"
            onClick={() => setSwapDirection('pepe-to-ton')}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Megaphone className="w-3 h-3 text-warning" />
                <p className="text-sm text-warning font-medium">رصيد PEPE</p>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {(userData?.bal_x7k9m || 0).toLocaleString()} {/* pepe_balance obfuscated */}
              </p>
              <p className="text-xs text-muted-foreground">PEPE</p>
            </CardContent>
          </Card>
        </div>

        {/* Swap Form */}
        <Card className="glass-card border-success/30 neon-border pulse-glow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-success">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary-foreground" />
              </div>
              {swapDirection === 'ton-to-pepe' ? 'تبديل TON إلى PEPE' : 'تبديل PEPE إلى TON'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* إدخال الكمية */}
            <div className="space-y-4">
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder={swapDirection === 'ton-to-pepe' ? 'أدخل كمية TON' : 'أدخل كمية PEPE'} 
                  value={tonAmount} 
                  onChange={e => setTonAmount(e.target.value)} 
                  min="0" 
                  step={swapDirection === 'ton-to-pepe' ? '0.0001' : '1'} 
                  className="text-lg h-14 pr-12 glass-card border-primary/30 focus:border-primary/60 focus:shadow-lg focus:shadow-primary/20" 
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  
                </div>
              </div>
              
              {tonAmount && parseFloat(tonAmount) > 0 && <div className="p-4 rounded-lg glass-card border-warning/30 bg-warning/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ستحصل على:</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-warning">
                        {swapDirection === 'ton-to-pepe' 
                          ? `${calculatePepeAmount(parseFloat(tonAmount)).toLocaleString()} PEPE`
                          : `${(parseFloat(tonAmount) / exchangeRate).toFixed(4)} TON`
                        }
                      </div>
                      
                    </div>
                  </div>
                </div>}
            </div>

            {/* زر التبديل */}
            <Button 
              onClick={handleSwap} 
              disabled={
                !tonAmount || 
                parseFloat(tonAmount) <= 0 || 
                (swapDirection === 'ton-to-pepe' 
                  ? parseFloat(tonAmount) > (userData?.ton_balance || 0)
                  : parseFloat(tonAmount) > (userData?.bal_x7k9m || 0) // pepe_balance obfuscated
                )
              } 
              className="w-full h-14 text-lg font-bold mobile-button glow-effect disabled:opacity-50 disabled:cursor-not-allowed" 
              size="lg"
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-6 h-6" />
                <span>
                  {swapDirection === 'ton-to-pepe' 
                    ? 'تحويل إلى رصيد PEPE' 
                    : 'تحويل إلى رصيد TON'
                  }
                </span>
                <Zap className="w-5 h-5" />
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        
      </div>
    </div>;
}