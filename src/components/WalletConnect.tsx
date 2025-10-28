import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ArcKeyPayment } from "./ArcKeyPayment";

interface WalletConnectProps {
  telegramId?: number;
}

export function WalletConnect({ telegramId }: WalletConnectProps) {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateTonAddress = (address: string) => {
    // التحقق من صحة عنوان محفظة TON
    const tonAddressRegex = /^[0-9A-Za-z+/=_-]{48}$/;
    return tonAddressRegex.test(address);
  };

  const connectWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "عنوان مطلوب",
        description: "يرجى إدخال عنوان محفظة TON",
        variant: "destructive"
      });
      return;
    }

    if (!validateTonAddress(walletAddress)) {
      toast({
        title: "عنوان غير صحيح",
        description: "يرجى إدخال عنوان محفظة TON صحيح",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // محاكاة ربط المحفظة
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // حفظ العنوان محلياً
      if (telegramId) {
        localStorage.setItem(`wallet_address_${telegramId}`, walletAddress);
      }
      
      setIsConnected(true);
      toast({
        title: "تم الربط بنجاح!",
        description: "تم ربط محفظة TON بحسابك بنجاح",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "خطأ في الربط",
        description: "حدث خطأ أثناء ربط المحفظة. حاول مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setIsConnected(false);
    if (telegramId) {
      localStorage.removeItem(`wallet_address_${telegramId}`);
    }
    toast({
      title: "تم قطع الاتصال",
      description: "تم قطع الاتصال مع محفظة TON",
      variant: "default"
    });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "تم النسخ",
      description: "تم نسخ عنوان المحفظة",
      variant: "default"
    });
  };

  return (
    <div className="space-y-4">
      <ArcKeyPayment telegramId={telegramId} />
      
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Wallet className="w-5 h-5" />
            ربط محفظة TON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="wallet-address">عنوان محفظة TON</Label>
                <Input
                  id="wallet-address"
                  placeholder="UQCJcFMsboRt_kcDkYN6cOStSyPJnFDl3otYBeU8_KTjjANh"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  أدخل عنوان محفظة TON الخاصة بك لربطها بحسابك
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setWalletAddress("UQCJcFMsboRt_kcDkYN6cOStSyPJnFDl3otYBeU8_KTjjANh")}
                  className="w-full text-xs"
                >
                  استخدام العنوان الافتراضي
                </Button>
              </div>

              <Button
                onClick={connectWallet}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? "جاري الربط..." : "ربط المحفظة"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  محفظة مربوطة بنجاح
                </span>
              </div>

              <div className="space-y-2">
                <Label>عنوان المحفظة المربوطة</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <span className="font-mono text-xs truncate flex-1">
                    {walletAddress}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAddress}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* أزرار الإيداع والسحب */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => window.location.href = '/airdrop'}
                >
                  إيداع
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => window.location.href = '/swap'}
                >
                  سحب
                </Button>
              </div>

              <Button
                onClick={disconnectWallet}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                قطع الاتصال
              </Button>
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  معلومات مهمة:
                </p>
                <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                  <li>• تأكد من صحة عنوان المحفظة قبل الربط</li>
                  <li>• لا تشارك المفاتيح الخاصة مع أحد</li>
                  <li>• يمكنك تغيير المحفظة في أي وقت</li>
                  <li>• ستحتاج المحفظة لاستلام المدفوعات</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}