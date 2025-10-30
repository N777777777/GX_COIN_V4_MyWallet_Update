import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  ShieldOff, 
  Search, 
  Loader2,
  Users,
  Ban,
  CheckCircle,
  Percent,
  Plus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  status: string | null;
  coins: number;
  ton_balance: number;
  created_at: string;
  last_active: string | null;
  gcoin_referral_commission_rate?: number;
  commission_rates?: {
    pepe_commission_rate: number;
    alpha_commission_rate: number;
    gcoin_v4_commission_rate: number;
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [commissionUser, setCommissionUser] = useState<User | null>(null);
  const [commissionRates, setCommissionRates] = useState({
    pepe: 0.60,
    alpha: 0.06,
    gcoin_v4: 0.10
  });
  const [showGCoinCommissionDialog, setShowGCoinCommissionDialog] = useState(false);
  const [gcoinCommissionUser, setGCoinCommissionUser] = useState<User | null>(null);
  const [gcoinCommissionRate, setGCoinCommissionRate] = useState(0.1);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('telegram_users')
        .select('id, telegram_id, username, first_name, status, coins, ton_balance, bal_g4v7y, gcoin_referral_commission_rate, created_at, last_active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Load commission rates for each user
      const usersWithCommission = await Promise.all(
        ((data || []) as any[]).map(async (user: any) => {
          if (!user.username) {
            return {
              ...user,
              commission_rates: undefined
            };
          }
          
          const { data: commission } = await supabase
            .from('manager_referral_commission_rates')
            .select('pepe_commission_rate, alpha_commission_rate, gcoin_v4_commission_rate')
            .eq('manager_telegram_username', user.username)
            .eq('is_active', true)
            .single();
          
          return {
            ...user,
            commission_rates: commission || undefined
          };
        })
      );
      
      setUsers(usersWithCommission as User[]);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockStatus = async (user: User) => {
    setActionLoading(true);
    try {
      const isBanned = user.status === 'banned';
      const newStatus = isBanned ? 'active' : 'banned';
      
      const { error } = await supabase
        .from('telegram_users')
        .update({ status: newStatus } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: isBanned ? "تم إلغاء الحظر" : "تم حظر المستخدم",
        description: `${user.first_name || user.username || 'المستخدم'} تم ${isBanned ? 'إلغاء حظره' : 'حظره'} بنجاح`,
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
      setShowDialog(false);
      setSelectedUser(null);
    }
  };

  const handleBlockAction = (user: User) => {
    setSelectedUser(user);
    setShowDialog(true);
  };

  const handleCommissionEdit = (user: User) => {
    setCommissionUser(user);
    setCommissionRates({
      pepe: user.commission_rates?.pepe_commission_rate || 0.60,
      alpha: user.commission_rates?.alpha_commission_rate || 0.06,
      gcoin_v4: user.commission_rates?.gcoin_v4_commission_rate || 0.10
    });
    setShowCommissionDialog(true);
  };

  const handleGCoinCommissionEdit = (user: User) => {
    setGCoinCommissionUser(user);
    setGCoinCommissionRate(user.gcoin_referral_commission_rate || 0.1);
    setShowGCoinCommissionDialog(true);
  };

  const saveGCoinCommissionRate = async () => {
    if (!gcoinCommissionUser) return;
    
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_user_referral_commission', {
        user_telegram_id: gcoinCommissionUser.telegram_id,
        commission_rate: gcoinCommissionRate
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      
      if (result && result.success) {
        toast({
          title: "تم التحديث",
          description: result.message
        });
        setShowGCoinCommissionDialog(false);
        await loadUsers();
      } else {
        throw new Error(result?.message || "فشل التحديث");
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const addGCoin = async (user: User) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('telegram_users')
        .update({ 
          bal_g4v7y: (user as any).bal_g4v7y ? (user as any).bal_g4v7y + 0.1 : 0.1 
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "تمت الإضافة",
        description: "تم إضافة 0.1 G COIN بنجاح"
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const saveCommissionRates = async () => {
    if (!commissionUser || !commissionUser.username) {
      toast({
        title: "خطأ",
        description: "المستخدم يجب أن يمتلك username للحصول على عمولات",
        variant: "destructive"
      });
      return;
    }
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('manager_referral_commission_rates')
        .upsert({
          manager_telegram_username: commissionUser.username,
          pepe_commission_rate: commissionRates.pepe,
          alpha_commission_rate: commissionRates.alpha,
          gcoin_v4_commission_rate: commissionRates.gcoin_v4,
          is_active: true
        }, {
          onConflict: 'manager_telegram_username'
        });

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث نسب العمولة بنجاح"
      });

      setShowCommissionDialog(false);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.telegram_id.toString().includes(query)
    );
  });

  const stats = {
    total: users.length,
    blocked: users.filter(u => u.status === 'banned').length,
    active: users.filter(u => u.status !== 'banned').length
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              إدارة المستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">إجمالي المستخدمين</span>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.total}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">نشط</span>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.active}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">محظور</span>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.blocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ابحث بالاسم، اسم المستخدم، أو Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>Telegram ID</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>العملات</TableHead>
                      <TableHead>TON</TableHead>
                      <TableHead>عمولة إحالة G COIN</TableHead>
                      <TableHead>العمولات</TableHead>
                      <TableHead>آخر نشاط</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.first_name || 'غير متوفر'}</p>
                            <p className="text-sm text-muted-foreground">@{user.username || 'بدون اسم مستخدم'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.telegram_id.toString()}</TableCell>
                        <TableCell>
                          {user.status === 'banned' ? (
                            <Badge variant="destructive" className="gap-1">
                              <Ban className="w-3 h-3" />
                              محظور
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1 bg-green-500">
                              <CheckCircle className="w-3 h-3" />
                              نشط
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.coins?.toLocaleString() || 0}</TableCell>
                        <TableCell>{user.ton_balance?.toFixed(2) || 0}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGCoinCommissionEdit(user)}
                            className="text-xs"
                          >
                            {((user.gcoin_referral_commission_rate || 0.1) * 100).toFixed(0)}%
                          </Button>
                        </TableCell>
                        <TableCell>
                          {user.commission_rates ? (
                            <div className="text-xs space-y-1">
                              <div>PEPE: {(user.commission_rates.pepe_commission_rate * 100).toFixed(0)}%</div>
                              <div>Alpha: {(user.commission_rates.alpha_commission_rate * 100).toFixed(0)}%</div>
                              <div>G COIN: {(user.commission_rates.gcoin_v4_commission_rate * 100).toFixed(0)}%</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.last_active 
                            ? new Date(user.last_active).toLocaleDateString('ar-EG')
                            : 'غير متوفر'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addGCoin(user)}
                              disabled={actionLoading}
                              className="bg-green-500/10 hover:bg-green-500/20"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              +0.1 G COIN
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCommissionEdit(user)}
                              disabled={actionLoading}
                            >
                              <Percent className="w-4 h-4 mr-1" />
                              العمولة
                            </Button>
                            <Button
                              size="sm"
                              variant={user.status === 'banned' ? "default" : "destructive"}
                              onClick={() => handleBlockAction(user)}
                              disabled={actionLoading}
                            >
                              {user.status === 'banned' ? (
                                <>
                                  <ShieldOff className="w-4 h-4 mr-1" />
                                  إلغاء الحظر
                                </>
                              ) : (
                                <>
                                  <Shield className="w-4 h-4 mr-1" />
                                  حظر
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد نتائج
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.status === 'banned' ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من {selectedUser?.status === 'banned' ? 'إلغاء حظر' : 'حظر'} المستخدم{' '}
              <strong>{selectedUser?.first_name || selectedUser?.username}</strong>؟
              {selectedUser?.status !== 'banned' && (
                <p className="mt-2 text-destructive">
                  المستخدم المحظور لن يتمكن من الوصول إلى النظام.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && toggleBlockStatus(selectedUser)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'تأكيد'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commission Edit Dialog */}
      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              تعديل نسب العمولة
            </DialogTitle>
            <DialogDescription>
              تعديل نسب العمولة للمستخدم{' '}
              <strong>{commissionUser?.first_name || commissionUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pepe">عمولة PEPE (%)</Label>
              <Input
                id="pepe"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={commissionRates.pepe}
                onChange={(e) => setCommissionRates({
                  ...commissionRates,
                  pepe: parseFloat(e.target.value) || 0
                })}
                placeholder="0.60"
              />
              <p className="text-xs text-muted-foreground">
                القيمة الحالية: {(commissionRates.pepe * 100).toFixed(0)}%
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alpha">عمولة Alpha (%)</Label>
              <Input
                id="alpha"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={commissionRates.alpha}
                onChange={(e) => setCommissionRates({
                  ...commissionRates,
                  alpha: parseFloat(e.target.value) || 0
                })}
                placeholder="0.06"
              />
              <p className="text-xs text-muted-foreground">
                القيمة الحالية: {(commissionRates.alpha * 100).toFixed(0)}%
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gcoin">عمولة G COIN V4 (%)</Label>
              <Input
                id="gcoin"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={commissionRates.gcoin_v4}
                onChange={(e) => setCommissionRates({
                  ...commissionRates,
                  gcoin_v4: parseFloat(e.target.value) || 0
                })}
                placeholder="0.10"
              />
              <p className="text-xs text-muted-foreground">
                القيمة الحالية: {(commissionRates.gcoin_v4 * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCommissionDialog(false)}
              disabled={actionLoading}
            >
              إلغاء
            </Button>
            <Button onClick={saveCommissionRates} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* G COIN Referral Commission Dialog */}
      <Dialog open={showGCoinCommissionDialog} onOpenChange={setShowGCoinCommissionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              تعديل عمولة إحالة G COIN
            </DialogTitle>
            <DialogDescription>
              تعديل نسبة عمولة إحالة G COIN للمستخدم{' '}
              <strong>{gcoinCommissionUser?.first_name || gcoinCommissionUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gcoin_referral">نسبة عمولة إحالة G COIN</Label>
              <Input
                id="gcoin_referral"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={gcoinCommissionRate}
                onChange={(e) => setGCoinCommissionRate(parseFloat(e.target.value) || 0)}
                placeholder="0.1"
              />
              <p className="text-xs text-muted-foreground">
                القيمة الحالية: {(gcoinCommissionRate * 100).toFixed(0)}% (القيمة بين 0 و 10)
              </p>
              <p className="text-xs text-muted-foreground">
                مثال: 0.1 = 10%، 0.5 = 50%، 1 = 100%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGCoinCommissionDialog(false)}
              disabled={actionLoading}
            >
              إلغاء
            </Button>
            <Button onClick={saveGCoinCommissionRate} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
