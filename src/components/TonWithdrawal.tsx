import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Coins, 
  ArrowDown, 
  History,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { TonConnectButton } from '@tonconnect/ui-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTonAddress } from '@tonconnect/ui-react';
import { useTelegramData } from "@/hooks/useTelegramData";

interface PendingWithdrawal {
  id: string;
  amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface CompletedWithdrawal {
  id: string;
  amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
  completed_at: string;
  transaction_hash?: string;
}

export default function TonWithdrawal() {
  const { toast } = useToast();
  const userFriendlyAddress = useTonAddress();
  const { telegramUser } = useTelegramData();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [completedWithdrawals, setCompletedWithdrawals] = useState<CompletedWithdrawal[]>([]);
  const [tonBalance, setTonBalance] = useState(0);

  // جلب بيانات المستخدم ورصيد TON
  useEffect(() => {
    if (telegramUser) {
      fetchUserBalance();
      fetchWithdrawalHistory();
    }
  }, [telegramUser]);

  const fetchUserBalance = async () => {
    if (!telegramUser) return;
    
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('ton_balance')
        .eq('id', telegramUser.id)
        .single();

      if (error) throw error;
      setTonBalance(data?.ton_balance || 0);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      setTonBalance(0);
    }
  };

  const fetchWithdrawalHistory = async () => {
    if (!telegramUser) return;
    
    try {
      // جلب الطلبات المعلقة
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_ton_withdrawals')
        .select('*')
        .eq('telegram_user_id', telegramUser.id)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingWithdrawals(pendingData || []);

      // جلب الطلبات المكتملة
      const { data: completedData, error: completedError } = await supabase
        .from('completed_ton_withdrawals')
        .select('*')
        .eq('telegram_user_id', telegramUser.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (completedError) throw completedError;
      setCompletedWithdrawals(completedData || []);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
    }
  };

  const handleWithdrawal = async () => {
    if (!userFriendlyAddress) {
      toast({
        title: "خطأ",
        description: "يجب ربط المحفظة أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount > tonBalance) {
      toast({
        title: "خطأ",
        description: "الرصيد غير كافي",
        variant: "destructive",
      });
      return;
    }

    if (amount < 0.1) {
      toast({
        title: "خطأ",
        description: "الحد الأدنى للسحب هو 0.1 TON",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // خصم المبلغ من الرصيد مؤقتاً
      const { error: balanceError } = await supabase
        .from('telegram_users')
        .update({
          ton_balance: tonBalance - amount
        })
        .eq('id', telegramUser?.id);

      if (balanceError) throw balanceError;

      // إنشاء طلب سحب معلق للمراجعة
      const { error: withdrawalError } = await supabase
        .from('pending_ton_withdrawals')
        .insert({
          telegram_user_id: telegramUser?.id,
          wallet_address: userFriendlyAddress,
          amount: amount,
          status: 'pending'
        });

      if (withdrawalError) {
        // إرجاع الرصيد في حالة فشل إنشاء الطلب
        await supabase
          .from('telegram_users')
          .update({
            ton_balance: tonBalance
          })
          .eq('id', telegramUser?.id);
        throw withdrawalError;
      }

      toast({
        title: "تم إرسال طلب السحب",
        description: `تم خصم ${amount} TON من رصيدك. سيتم المراجعة والإرسال خلال 24 ساعة`,
        duration: 7000,
      });

      setWithdrawalAmount("");
      fetchUserBalance();
      fetchWithdrawalHistory();
    } catch (error) {
      console.error('Manual withdrawal error:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء طلب السحب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case 'completed':
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3 mr-1" />مكتمل</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3 mr-1" />فشل</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userFriendlyAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            سحب TON
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 border-2 border-dashed border-border rounded-lg">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">يجب ربط المحفظة أولاً لسحب TON</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* رصيد TON وسحب */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              سحب TON
            </div>
            <TonConnectButton />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الرصيد الحالي */}
          <div className="p-4 rounded-lg border bg-muted">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">رصيدك الحالي</p>
              <p className="text-2xl font-bold">
                {tonBalance.toFixed(2)} TON
              </p>
            </div>
          </div>

          {/* نموذج السحب */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">مبلغ السحب (TON)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                min="0.1"
                max={tonBalance}
                step="0.01"
                className="mt-1"
              />
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" onClick={() => setWithdrawalAmount((tonBalance * 0.25).toFixed(2))}>25%</Button>
                <Button variant="secondary" size="sm" onClick={() => setWithdrawalAmount((tonBalance * 0.5).toFixed(2))}>50%</Button>
                <Button variant="secondary" size="sm" onClick={() => setWithdrawalAmount((tonBalance * 0.75).toFixed(2))}>75%</Button>
                <Button variant="outline" size="sm" onClick={() => setWithdrawalAmount(tonBalance.toFixed(2))}>الحد الأقصى</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                الحد الأدنى: 0.1 TON | المتاح: {tonBalance.toFixed(4)} TON
              </p>
            </div>

            <div className="pt-1">
              <Slider
                value={[Math.min(100, Math.max(0, tonBalance ? Math.round((parseFloat(withdrawalAmount || "0") / tonBalance) * 100) : 0))]}
                onValueChange={(v) => {
                  const pct = (v?.[0] ?? 0) / 100;
                  const newAmount = (tonBalance * pct);
                  setWithdrawalAmount(newAmount.toFixed(4));
                }}
                max={100}
                step={1}
                className="mt-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span><span>100%</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">عنوان المحفظة</label>
              <Input
                value={userFriendlyAddress}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            <Button 
              onClick={handleWithdrawal}
              disabled={isLoading || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
              className="w-full"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              {isLoading ? "جاري الإرسال..." : "طلب السحب"}
            </Button>
          </div>

          {/* ملاحظات */}
          <div className="p-3 border rounded-lg bg-muted">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">مراجعة يدوية:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>السحب يتم بالمراجعة اليدوية من الإدارة</li>
                  <li>يتم خصم المبلغ من رصيدك عند الطلب</li>
                  <li>وقت المراجعة: خلال 24 ساعة</li>
                  <li>سيتم إرسال TON لمحفظتك بعد الموافقة</li>
                  <li>الحد الأدنى للسحب 0.1 TON</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* طلبات السحب المعلقة */}
      {pendingWithdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              طلبات السحب المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">{withdrawal.amount} TON</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(withdrawal.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(withdrawal.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* طلبات السحب المكتملة */}
      {completedWithdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              تاريخ السحوبات المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{withdrawal.amount} TON</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(withdrawal.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(withdrawal.status)}
                    {withdrawal.completed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        اكتمل: {formatDate(withdrawal.completed_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}