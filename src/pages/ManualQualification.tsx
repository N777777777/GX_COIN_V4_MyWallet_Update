import { useState, useEffect } from "react";
import { ArrowLeft, UserPlus, UserX, Search, Users, Shield, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ManualQualifiedUser {
  id: string;
  telegram_id: number;
  first_name: string;
  username: string;
  qualification_reason: string;
  created_at: string;
  is_active: boolean;
}

interface AllQualifiedUser {
  telegram_id: number;
  first_name: string;
  username: string;
  qualification_type: string;
  qualification_date: string;
  qualification_reason: string;
}

export default function ManualQualification() {
  const [manualUsers, setManualUsers] = useState<ManualQualifiedUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllQualifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTelegramId, setSearchTelegramId] = useState("");
  const [qualificationReason, setQualificationReason] = useState("تأهيل يدوي من الإدارة");
  const [currentView, setCurrentView] = useState<'manual' | 'all'>('manual');
  const navigate = useNavigate();

  const fetchManualQualifiedUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_qualified_users_list') as any;

      if (error) {
        console.error('Error fetching manual qualified users:', error);
        return;
      }

      setManualUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAllQualifiedUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_qualified_users') as any;

      if (error) {
        console.error('Error fetching all qualified users:', error);
        return;
      }

      setAllUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchManualQualifiedUsers(),
      fetchAllQualifiedUsers()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddQualification = async () => {
    if (!searchTelegramId) {
      toast.error("يرجى إدخال معرف التليجرام");
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('add_manual_qualified_user', {
          user_telegram_id: parseInt(searchTelegramId),
          reason: qualificationReason
        }) as any;

      if (error) {
        console.error('Error adding qualification:', error);
        toast.error("حدث خطأ أثناء إضافة التأهيل");
        return;
      }

      if (data?.success) {
        toast.success(data.message);
        setSearchTelegramId("");
        setQualificationReason("تأهيل يدوي من الإدارة");
        setAddDialogOpen(false);
        fetchData();
      } else {
        toast.error(data?.message || "فشل في إضافة التأهيل");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ أثناء إضافة التأهيل");
    }
  };

  const handleRemoveQualification = async (telegramId: number) => {
    try {
      const { data, error } = await supabase
        .rpc('remove_manual_qualified_user', {
          user_telegram_id: telegramId
        }) as any;

      if (error) {
        console.error('Error removing qualification:', error);
        toast.error("حدث خطأ أثناء إزالة التأهيل");
        return;
      }

      if (data?.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data?.message || "فشل في إزالة التأهيل");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ أثناء إزالة التأهيل");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQualificationTypeBadge = (type: string) => {
    if (type === 'task_completion') {
      return <Badge variant="default" className="bg-green-100 text-green-800">إكمال مهمة</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">تأهيل يدوي</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">إدارة المؤهلين</h1>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={currentView === 'manual' ? 'default' : 'outline'}
            onClick={() => setCurrentView('manual')}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            المؤهلين يدوياً
          </Button>
          <Button
            variant={currentView === 'all' ? 'default' : 'outline'}
            onClick={() => setCurrentView('all')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            جميع المؤهلين
          </Button>
        </div>

        {/* Add Qualification Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              إضافة مؤهل يدوياً
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم مؤهل يدوياً</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="telegram-id">معرف التليجرام</Label>
                <Input
                  id="telegram-id"
                  placeholder="مثال: 123456789"
                  value={searchTelegramId}
                  onChange={(e) => setSearchTelegramId(e.target.value)}
                  type="number"
                />
              </div>
              <div>
                <Label htmlFor="reason">سبب التأهيل</Label>
                <Textarea
                  id="reason"
                  placeholder="تأهيل يدوي من الإدارة"
                  value={qualificationReason}
                  onChange={(e) => setQualificationReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQualification} className="flex-1">
                  إضافة التأهيل
                </Button>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentView === 'manual' ? (
              <>
                {/* Manual Qualified Users Stats */}
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="font-medium">إجمالي المؤهلين يدوياً</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {manualUsers.length}
                    </Badge>
                  </div>
                </Card>

                {manualUsers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">لا توجد مؤهلين يدوياً</h3>
                    <p className="text-muted-foreground mb-4">لم يتم إضافة أي مستخدمين مؤهلين يدوياً بعد</p>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      إضافة مؤهل يدوياً
                    </Button>
                  </Card>
                ) : (
                  manualUsers.map((user, index) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-lg px-3 py-2 min-w-[3rem] justify-center">
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-semibold text-base">
                              {user.first_name || user.username || `مستخدم ${user.telegram_id}`}
                            </div>
                            {user.username && (
                              <span className="text-xs text-muted-foreground">@{user.username}</span>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              السبب: {user.qualification_reason}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              تاريخ التأهيل: {formatDate(user.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            يدوي
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveQualification(user.telegram_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <>
                {/* All Qualified Users Stats */}
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-medium">إجمالي جميع المؤهلين</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {allUsers.length}
                    </Badge>
                  </div>
                </Card>

                {allUsers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">لا توجد مؤهلين</h3>
                    <p className="text-muted-foreground">لا يوجد مستخدمين مؤهلين حتى الآن</p>
                  </Card>
                ) : (
                  allUsers.map((user, index) => (
                    <Card key={`${user.telegram_id}-${user.qualification_type}`} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-lg px-3 py-2 min-w-[3rem] justify-center">
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-semibold text-base">
                              {user.first_name || user.username || `مستخدم ${user.telegram_id}`}
                            </div>
                            {user.username && (
                              <span className="text-xs text-muted-foreground">@{user.username}</span>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {user.qualification_reason}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              تاريخ التأهيل: {formatDate(user.qualification_date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getQualificationTypeBadge(user.qualification_type)}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Refresh Button */}
            <div className="text-center pt-6">
              <Button onClick={fetchData} variant="outline">
                تحديث البيانات
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}