import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramData } from '@/hooks/useTelegramData';

export const TonWalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const wallet = useTonWallet();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();

  // حفظ عنوان المحفظة في قاعدة البيانات عند الاتصال
  useEffect(() => {
    const saveWalletAddress = async () => {
      if (userFriendlyAddress && telegramUser?.id) {
        try {
          const { error } = await supabase
            .from('telegram_users')
            .update({ addr_t9w2x: userFriendlyAddress }) // ton_wallet_address (obfuscated)
            .eq('telegram_id', Number(telegramUser.id));

          if (error) {
            console.error('Error saving wallet address:', error);
          } else {
            console.log('✅ Wallet address saved:', userFriendlyAddress);
          }
        } catch (err) {
          console.error('Exception saving wallet:', err);
        }
      }
    };

    saveWalletAddress();
  }, [userFriendlyAddress, telegramUser]);

  const handleConnect = async () => {
    try {
      console.log('🔗 Opening TON Connect modal...');
      
      // فتح نافذة الربط مع معالجة الأخطاء
      const connectPromise = tonConnectUI.openModal();
      
      // إضافة timeout للتعامل مع حالات التعليق
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 60000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
    } catch (error: any) {
      console.error('❌ Error connecting wallet:', error);
      
      const isTimeout = error.message === 'Connection timeout';
      
      toast({
        title: isTimeout ? "انتهت مهلة الاتصال" : "خطأ في الاتصال",
        description: isTimeout 
          ? "استغرق الاتصال وقتاً طويلاً. تأكد من اتصالك بالإنترنت وحاول مرة أخرى"
          : "حدث خطأ أثناء ربط المحفظة. تأكد من تثبيت محفظة TON (مثل Tonkeeper أو MyTonWallet)",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
      
      // حذف عنوان المحفظة من قاعدة البيانات
      if (telegramUser?.id) {
        await supabase
          .from('telegram_users')
          .update({ addr_t9w2x: null }) // ton_wallet_address (obfuscated)
          .eq('telegram_id', Number(telegramUser.id));
      }

      toast({
        title: "تم قطع الاتصال",
        description: "تم قطع الاتصال بمحفظة TON بنجاح",
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const copyAddress = () => {
    if (userFriendlyAddress) {
      navigator.clipboard.writeText(userFriendlyAddress);
      setCopied(true);
      toast({
        title: "تم النسخ",
        description: "تم نسخ عنوان المحفظة",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!wallet) {
    return null;
  }

  return (
    <Card className="glass-card border-primary/30">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <img 
                src="/bot-logo.png" 
                alt="G COIN" 
                className="w-6 h-6 rounded-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">محفظة متصلة</span>
              </div>
              <span className="text-xs text-muted-foreground">G COIN V4</span>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">عنوان المحفظة</p>
                <span className="text-xs font-mono truncate block text-foreground">
                  {userFriendlyAddress?.slice(0, 12)}...{userFriendlyAddress?.slice(-8)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
            size="sm"
          >
            قطع الاتصال
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
