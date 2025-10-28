import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Copy, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTelegramWebApp } from "../hooks/useTelegramWebApp";

const MyWallet = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { toast } = useToast();
  const { webApp } = useTelegramWebApp();

  const handleConnectWallet = () => {
    // TonConnectUI will handle the connection process
    tonConnectUI.openModal();
  };

  const handleCopyAddress = () => {
    if (wallet && wallet.account.address) {
      // The address is usually in a raw format (e.g., 0:...)
      // We'll use the raw address for simplicity, but a user-friendly format might be better
      navigator.clipboard.writeText(wallet.account.address);
      toast({
        title: "تم النسخ بنجاح",
        description: "تم نسخ عنوان محفظتك إلى الحافظة.",
      });
      
      // إرسال اهتزاز خفيف عبر Telegram Mini App
      webApp?.HapticFeedback.impactOccurred('light');
    }
  };

  // تنسيق العنوان لعرضه بشكل مختصر
  const formatAddress = (address: string) => {
    if (!address) return "";
    // عرض أول 4 أحرف وآخر 4 أحرف
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-5 h-5" /> محفظتي
          </CardTitle>
          <CardDescription>
            إدارة وربط محفظة TON الخاصة بك (محفظة Telegram).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallet ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                المحفظة المتصلة:
              </p>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="font-mono text-sm sm:text-base">
                  {formatAddress(wallet.account.address)}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCopyAddress}
                  title="نسخ العنوان بالكامل"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                ✅ تم ربط المحفظة بنجاح.
              </p>
              
              <Button 
                variant="destructive" 
                onClick={() => tonConnectUI.disconnect()}
                className="w-full"
              >
                قطع الاتصال
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                لم يتم ربط أي محفظة. يرجى ربط محفظة TON الخاصة بك.
              </p>
              <Button onClick={handleConnectWallet} className="w-full">
                <Wallet className="w-4 h-4 mr-2" /> ربط محفظة Telegram
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {wallet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">عنوان المحفظة بالكامل</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all font-mono text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              {wallet.account.address}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyWallet;

