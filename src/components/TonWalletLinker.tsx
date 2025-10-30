import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, AlertCircle, Copy, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTonConnectUI } from '@tonconnect/ui-react';
interface Challenge {
  id: string;
  nonce: string;
  message: string;
}
interface TonWalletLinkerProps {
  telegramId?: number;
  onWalletLinked?: (address: string) => void;
}
export function TonWalletLinker({
  telegramId,
  onWalletLinked
}: TonWalletLinkerProps) {
  const {
    toast
  } = useToast();
  const [tonConnectUI] = useTonConnectUI();
  const [isLinked, setIsLinked] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  // التحقق من وجود محفظة مربوطة مسبقاً
  useEffect(() => {
    const savedAddress = localStorage.getItem(`gcoin_linked_wallet_${telegramId}`);
    if (savedAddress) {
      setLinkedAddress(savedAddress);
      setIsLinked(true);
    }
  }, [telegramId]);

  // إنشاء تحدي جديد
  const createChallenge = async (): Promise<Challenge | null> => {
    try {
      // محاكاة إنشاء تحدي (في التطبيق الحقيقي، هذا سيكون API call)
      const nonce = Math.random().toString(36).substring(2, 15);
      const challengeId = Math.random().toString(36).substring(2, 15);
      const message = `Link G COIN V4 wallet\nNonce: ${nonce}\nProject: G COIN V4`;
      return {
        id: challengeId,
        nonce,
        message
      };
    } catch (error) {
      console.error('Error creating challenge:', error);
      return null;
    }
  };

  // التحقق من التوقيع
  const verifySignature = async (challengeId: string, address: string, signature: string, publicKey: string): Promise<boolean> => {
    try {
      // محاكاة التحقق من التوقيع (في التطبيق الحقيقي، هذا سيكون API call)
      console.log('Verifying signature for:', {
        challengeId,
        address,
        signature: signature.substring(0, 20) + '...',
        publicKey: publicKey.substring(0, 20) + '...'
      });

      // محاكاة نجاح التحقق
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  };

  // ربط المحفظة
  const linkWallet = async () => {
    setIsLinking(true);
    try {
      // 1. إنشاء تحدي
      const newChallenge = await createChallenge();
      if (!newChallenge) {
        throw new Error('فشل في إنشاء التحدي');
      }
      setChallenge(newChallenge);

      // 2. ربط المحفظة عبر TonConnect
      await tonConnectUI.openModal();

      // انتظار حتى يتم الاتصال
      const checkConnection = async () => {
        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 30000);
          const interval = setInterval(async () => {
            if (tonConnectUI.wallet) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve(tonConnectUI.account?.address || '');
            }
          }, 500);
        });
      };
      const walletAddress = await checkConnection();
      if (!walletAddress) {
        throw new Error('فشل في الحصول على عنوان المحفظة');
      }

      // 3. طلب توقيع الرسالة (محاكاة)
      // في التطبيق الحقيقي، ستحتاج لاستخدام TonConnect proof أو ton_sign
      console.log('Simulating signature request for message:', newChallenge.message);

      // محاكاة عملية التوقيع
      await new Promise(resolve => setTimeout(resolve, 2000));

      // محاكاة استخلاص بيانات التوقيع
      const mockSignature = btoa(Math.random().toString());
      const mockPublicKey = btoa(Math.random().toString());

      // 4. التحقق من التوقيع
      const isValid = await verifySignature(newChallenge.id, walletAddress, mockSignature, mockPublicKey);
      if (!isValid) {
        throw new Error('فشل في التحقق من التوقيع');
      }

      // 5. حفظ المحفظة المربوطة
      setLinkedAddress(walletAddress);
      setIsLinked(true);
      localStorage.setItem(`gcoin_linked_wallet_${telegramId}`, walletAddress);

      // استدعاء callback إذا كان موجود
      onWalletLinked?.(walletAddress);
      toast({
        title: 'تم ربط المحفظة بنجاح! ✅',
        description: `تم ربط محفظة TON: ${walletAddress.substring(0, 10)}...`,
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Wallet linking error:', error);
      toast({
        title: 'فشل في ربط المحفظة',
        description: error.message || 'حدث خطأ أثناء ربط المحفظة',
        variant: 'destructive'
      });
    } finally {
      setIsLinking(false);
      setChallenge(null);
    }
  };

  // إلغاء ربط المحفظة
  const unlinkWallet = () => {
    setIsLinked(false);
    setLinkedAddress('');
    localStorage.removeItem(`gcoin_linked_wallet_${telegramId}`);
    tonConnectUI.disconnect();
    toast({
      title: 'تم إلغاء الربط',
      description: 'تم إلغاء ربط محفظة TON',
      variant: 'default'
    });
  };

  // نسخ العنوان
  const copyAddress = () => {
    navigator.clipboard.writeText(linkedAddress);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ عنوان المحفظة',
      variant: 'default'
    });
  };
  return <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        <CardTitle className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/g-coin-logo.jpg" alt="G COIN V4" className="w-8 h-8 rounded-full" />
            <span className="text-yellow-700 dark:text-yellow-400">G COIN V4</span>
          </div>
          
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {/* معلومات المشروع */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">ربط محفظة TON</h3>
          
          
        </div>

        {!isLinked ? <div className="space-y-4">
            <Button onClick={linkWallet} disabled={isLinking} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white" size="lg">
              {isLinking ? <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  جاري الربط...
                </> : <>
                  <Wallet className="w-4 h-4 mr-2" />
                  ربط المحفظة
                </>}
            </Button>
          </div> : <div className="space-y-4">
            {/* حالة النجاح */}
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                محفظتك مربوطة بنجاح!
              </span>
            </div>

            {/* عنوان المحفظة */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">عنوان محفظتك المربوطة:</div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <code className="text-xs font-mono flex-1 truncate">
                  {linkedAddress}
                </code>
                <Button size="sm" variant="ghost" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => window.open('/airdrop', '_self')}>
                إيداع
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => window.open('/swap', '_self')}>
                سحب
              </Button>
            </div>

            <Button onClick={unlinkWallet} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
              إلغاء الربط
            </Button>
          </div>}

        {/* معلومات الأمان */}
        
      </CardContent>
    </Card>;
}