import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign,
  Check,
  X,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Search,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TonWithdrawal {
  id: string;
  telegram_user_id: string;
  wallet_address: string;
  amount: number;
  status: string;
  transaction_hash?: string;
  created_at: string;
  completed_at?: string;
  isPending?: boolean;
}

interface TelegramUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
}

export default function WithdrawalAdmin() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<TonWithdrawal[]>([]);
  const [telegramUsers, setTelegramUsers] = useState<Record<string, TelegramUser>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<TonWithdrawal | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      // جلب الطلبات المعلقة
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_ton_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // جلب الطلبات المكتملة
      const { data: completedData, error: completedError } = await supabase
        .from('completed_ton_withdrawals')
        .select('*')
        .order('completed_at', { ascending: false });

      if (completedError) throw completedError;

      // دمج البيانات
      const allWithdrawals = [
        ...(pendingData || []).map(w => ({ ...w, isPending: true })),
        ...(completedData || []).map(w => ({ ...w, isPending: false }))
      ];

      setWithdrawals(allWithdrawals);
      
      // جلب بيانات المستخدمين
      const userIds = [...new Set(allWithdrawals.map(w => w.telegram_user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('telegram_users')
          .select('id, telegram_id, username, first_name')
          .in('id', userIds);
        
        if (usersData) {
          const usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, TelegramUser>);
          setTelegramUsers(usersMap);
        }
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب طلبات السحب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWithdrawalStatus = async (
    withdrawalId: string, 
    status: 'completed' | 'failed',
    txHash?: string
  ) => {
    setIsProcessing(true);
    try {
      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString()
      };

      if (txHash) {
        updateData.reviewer_notes = txHash; // سنستخدم reviewer_notes لحفظ transaction hash مؤقتاً
      }

      // تحديث في جدول الطلبات المعلقة - الـ trigger سيقوم بنقلها تلقائياً
      const { error } = await supabase
        .from('pending_ton_withdrawals')
        .update(updateData)
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: `تم ${status === 'completed' ? 'تأكيد' : 'رفض'} طلب السحب`,
      });

      fetchWithdrawals();
      setSelectedWithdrawal(null);
      setTransactionHash("");
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة السحب",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />قيد المراجعة</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-300"><Check className="w-3 h-3 mr-1" />مكتمل</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-300"><X className="w-3 h-3 mr-1" />مرفوض</Badge>;
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

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const user = telegramUsers[withdrawal.telegram_user_id];
    const matchesSearch = 
      withdrawal.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.amount.toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalAmount = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">طلبات معلقة</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المسحوب</p>
                <p className="text-2xl font-bold">{totalAmount.toFixed(9)} TON</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-2xl font-bold">{withdrawals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلاتر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>طلبات السحب</span>
            <Button onClick={fetchWithdrawals} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث بالعنوان أو اسم المستخدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="completed">مكتمل</option>
              <option value="failed">مرفوض</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات سحب</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{withdrawal.amount} TON</span>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>المستخدم: {telegramUsers[withdrawal.telegram_user_id]?.first_name || 'مجهول'} (@{telegramUsers[withdrawal.telegram_user_id]?.username || telegramUsers[withdrawal.telegram_user_id]?.telegram_id})</p>
                        <p>المحفظة: {withdrawal.wallet_address.slice(0, 8)}...{withdrawal.wallet_address.slice(-8)}</p>
                        <p>التاريخ: {formatDate(withdrawal.created_at)}</p>
                        {withdrawal.transaction_hash && (
                          <p>TX: {withdrawal.transaction_hash.slice(0, 8)}...{withdrawal.transaction_hash.slice(-8)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                            variant="outline"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            موافقة
                          </Button>
                          <Button
                            onClick={() => updateWithdrawalStatus(withdrawal.id, 'failed')}
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                          >
                            <X className="w-4 h-4 mr-2" />
                            رفض
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة تأكيد السحب */}
      {selectedWithdrawal && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
            <CardHeader>
              <CardTitle>تأكيد السحب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p><strong>المبلغ:</strong> {selectedWithdrawal.amount} TON</p>
                <p><strong>المستخدم:</strong> {telegramUsers[selectedWithdrawal.telegram_user_id]?.first_name}</p>
                <p><strong>المحفظة:</strong> {selectedWithdrawal.wallet_address}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم المعاملة (اختياري)</label>
                <Input
                  placeholder="ضع رقم المعاملة هنا..."
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => updateWithdrawalStatus(selectedWithdrawal.id, 'completed', transactionHash)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "جاري المعالجة..." : "تأكيد السحب"}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedWithdrawal(null);
                    setTransactionHash("");
                  }}
                  variant="outline"
                  disabled={isProcessing}
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  );
}