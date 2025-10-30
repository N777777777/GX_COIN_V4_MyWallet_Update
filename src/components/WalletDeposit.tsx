import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Wallet, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";

export const WalletDeposit = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();

  const isConnected = tonConnectUI.connected;

  const handleConnect = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "خطأ في الاتصال",
        description: "فشل في ربط المحفظة",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
      toast({
        title: "تم قطع الاتصال",
        description: "تم قطع اتصال المحفظة بنجاح",
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "مبلغ غير صحيح",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "محفظة غير متصلة",
        description: "يرجى ربط المحفظة أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!telegramUser?.id) {
      toast({
        title: "خطأ في المستخدم",
        description: "لم يتم التعرف على المستخدم",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // حساب قيمة العملة بالنانو تون (1 TON = 1,000,000,000 nanoTON)
      const nanoAmount = (parseFloat(amount) * 1_000_000_000).toString();
      
      // عنوان المحفظة المستقبلة الخاص بك للإيداعات
      const recipientAddress = "UQC4lt5vMjeAVhUIrg0JQqqnd0yuDJeyV_5AZTNx9yl7mRkz";

      // التحقق من أن العنوان المستقبل مختلف عن محفظة المستخدم
      const userWalletAddress = tonConnectUI.account?.address;
      if (userWalletAddress && userWalletAddress === recipientAddress) {
        toast({
          title: "خطأ في العنوان",
          description: "لا يمكن إرسال TON لنفس المحفظة",
          variant: "destructive",
        });
        return;
      }
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // صالح لمدة 10 دقائق
        messages: [
          {
            address: recipientAddress,
            amount: nanoAmount
          }
        ]
      };

      console.log('Sending transaction:', transaction);
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transaction result:', result);
      
      if (result) {
        console.log('Transaction successful, saving as pending deposit...');
        
        // حفظ الإيداع مباشرة كقيد المراجعة
        toast({
          title: "تم إرسال الإيداع",
          description: "جاري حفظ الإيداع للمراجعة التلقائية...",
          duration: 3000,
        });

        try {
          const { error: pendingError } = await supabase
            .from('pending_ton_deposits')
            .insert({
              telegram_user_id: telegramUser.id,
              transaction_hash: result.boc,
              wallet_address: userWalletAddress || '',
              amount: parseFloat(amount),
              status: 'pending_verification'
            });

          if (pendingError) {
            console.error('Error saving pending deposit:', pendingError);
            throw pendingError;
          }

          console.log('Deposit saved successfully as pending');
          toast({
            title: "✅ تم حفظ الإيداع",
            description: `سيتم التحقق من إيداع ${amount} TON وإضافته للرصيد خلال 24 ساعة`,
            duration: 7000,
          });

        } catch (error) {
          console.error('Error saving deposit:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Detailed error message:', errorMessage);
          
          toast({
            title: "خطأ في حفظ الإيداع",
            description: `فشل في حفظ طلب الإيداع: ${errorMessage}`,
            variant: "destructive",
          });
        }
        
        setAmount('');
      }
    } catch (error) {
      console.error('Error sending transaction:', error);
      
      let errorMessage = "حدث خطأ أثناء معالجة المعاملة";
      
      if (error instanceof Error) {
        console.error('Detailed error:', error);
        if (error.message.includes("Transaction was not sent")) {
          errorMessage = "تم إلغاء المعاملة من قبل المستخدم أو رفضها من المحفظة";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "رصيد غير كافي في المحفظة";
        } else if (error.message.includes("invalid address")) {
          errorMessage = "عنوان المحفظة غير صحيح";
        }
      }
      
      toast({
        title: "فشل في الإيداع",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          إيداع TON
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          اربط محفظتك وقم بالإيداع مباشرة
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* حالة الاتصال */}
        <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">محفظة متصلة</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm">محفظة غير متصلة</span>
              </>
            )}
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "متصل" : "غير متصل"}
          </Badge>
        </div>

        {/* أزرار الاتصال */}
        {!isConnected ? (
          <Button onClick={handleConnect} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Wallet className="w-4 h-4 mr-2" />
            ربط المحفظة
          </Button>
        ) : (
          <>
            {/* حقل المبلغ */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المبلغ (TON)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-lg"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground text-center">
                1 TON = 1 TON رصيد
              </p>
            </div>

            {/* أزرار العمل */}
            <div className="space-y-2">
              <Button 
                onClick={handleDeposit} 
                disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري المعالجة...
                  </div>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    إيداع {amount || '0'} TON
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleDisconnect} 
                variant="outline" 
                className="w-full"
              >
                قطع اتصال المحفظة
              </Button>
            </div>
          </>
        )}

        {/* معلومات النظام التلقائي */}
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <h4 className="text-sm font-medium mb-2 text-blue-600">🔄 نظام المراجعة التلقائية:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 📝 حفظ فوري في السجل</li>
            <li>• ⏰ تحقق تلقائي خلال 24 ساعة</li>
            <li>• ✅ إضافة الرصيد عند التأكيد</li>
            <li>• 💎 سعر الصرف: 1 TON = 1 TON رصيد</li>
            <li>• 🆓 بدون رسوم إيداع</li>
            <li>• 🔒 نظام أمان متقدم</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};