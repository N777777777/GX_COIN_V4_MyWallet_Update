import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  ExternalLink, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  MessageSquare,
  Loader2,
  Users,
  Clock,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UIDSubmission {
  id: string;
  task_id: string;
  task_title: string;
  uid: string;
  campaign_link: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  telegram_user_id: string | null;
}

export function TelegramBotAdmin() {
  const [botToken, setBotToken] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'setting' | 'success' | 'error'>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [submissions, setSubmissions] = useState<UIDSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('uid_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading submissions:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل الطلبات",
          variant: "destructive",
        });
        return;
      }

      setSubmissions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      // البحث عن التقديم للحصول على معلوماته
      const submission = submissions.find(sub => sub.id === id);
      if (!submission) return;

      const { error } = await supabase
        .from('uid_submissions')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating submission:', error);
        toast({
          title: "خطأ",
          description: "فشل في تحديث الحالة",
          variant: "destructive",
        });
        return;
      }

      // إذا تم قبول المهمة، إضافة النقاط للمستخدم باستخدام النظام الآمن
      if (status === 'approved' && submission.telegram_user_id) {
        // تحديد النقاط حسب نوع المهمة
        const rewardPoints = submission.task_id === '6' ? 2500 : 1000; // مهمة KUCOIN تعطي 2500 نقطة
        
        // احصل على telegram_id
        const { data: userData, error: fetchError } = await supabase
          .from('telegram_users')
          .select('telegram_id')
          .eq('id', submission.telegram_user_id)
          .single();

        if (!fetchError && userData) {
          const { error: rewardError } = await supabase.functions.invoke('secure-balance-update', {
            body: {
              telegram_id: userData.telegram_id,
              balance_type: 'coins',
              amount: rewardPoints,
              operation: 'add',
              source: 'task_approval',
              metadata: {
                task_id: submission.task_id,
                submission_id: id
              }
            }
          });

          if (rewardError) {
            console.error('Error adding reward:', rewardError);
            toast({
              title: "تحذير",
              description: "تم قبول المهمة ولكن فشل في إضافة النقاط",
              variant: "destructive",
            });
          }
        }
      }

      // تحديث الحالة محلياً
      setSubmissions(prev => prev.map(sub =>
        sub.id === id 
          ? { 
              ...sub, 
              status, 
              reviewed_at: new Date().toISOString(),
              reviewer_notes: notes || null 
            }
          : sub
      ));

      toast({
        title: "تم التحديث",
        description: `تم ${status === 'approved' ? 'قبول' : 'رفض'} الطلب${status === 'approved' ? ' وإضافة النقاط' : ''}`,
      });

      // مسح الملاحظات
      setReviewNotes(prev => ({ ...prev, [id]: '' }));

    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />مقبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSetupWebhook = async () => {
    if (!botToken.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال توكن البوت أولاً",
        variant: "destructive",
      });
      return;
    }

    setWebhookStatus('setting');
    
    try {
      // هنا ستحتاج لحفظ التوكن في Supabase Secrets أولاً
      const response = await fetch('/functions/v1/setup-telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setWebhookStatus('success');
        setIsConnected(true);
        toast({
          title: "تم بنجاح!",
          description: "تم ربط البوت بتليجرام بنجاح",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setWebhookStatus('error');
      toast({
        title: "خطأ في الربط",
        description: "فشل في ربط البوت بتليجرام",
        variant: "destructive",
      });
    }
  };

  const openBotFatherLink = () => {
    window.open('https://t.me/BotFather', '_blank');
  };

  const openBotLink = () => {
    window.open('https://t.me/GCoinV2Bot', '_blank');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bot-setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bot-setup">إعداد البوت</TabsTrigger>
          <TabsTrigger value="submissions">مراجعة الطلبات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bot-setup">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bot className="w-5 h-5 text-primary" />
                إدارة بوت تليجرام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Bot Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">GCoinV2Bot</h3>
                    <p className="text-sm text-muted-foreground">
                      {isConnected ? 'متصل ويعمل' : 'غير متصل'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        متصل
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        غير متصل
                      </>
                    )}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={openBotLink}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    فتح البوت
                  </Button>
                </div>
              </div>

              {/* Setup Section */}
              {!isConnected && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bot-token">توكن البوت</Label>
                    <Input
                      id="bot-token"
                      type="password"
                      placeholder="أدخل توكن البوت من BotFather"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      disabled={webhookStatus === 'setting'}
                    />
                    <p className="text-sm text-muted-foreground">
                      احصل على التوكن من @BotFather في تليجرام
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={openBotFatherLink}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      فتح BotFather
                    </Button>
                    <Button 
                      onClick={handleSetupWebhook}
                      disabled={webhookStatus === 'setting' || !botToken.trim()}
                      className="flex-1"
                    >
                      {webhookStatus === 'setting' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          جاري الربط...
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          ربط البوت
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground">خطوات ربط البوت:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>اذهب إلى @BotFather في تليجرام</li>
                  <li>أرسل الأمر /newbot لإنشاء بوت جديد</li>
                  <li>اتبع التعليمات واختر اسم ومعرف للبوت</li>
                  <li>احصل على التوكن وانسخه</li>
                  <li>الصق التوكن أعلاه واضغط "ربط البوت"</li>
                </ol>
              </div>

              {/* Bot Features */}
              {isConnected && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold text-foreground">وظائف البوت:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>استقبال وتتبع UID المرسلة من المستخدمين</li>
                    <li>عرض الرصيد والمهام</li>
                    <li>إدارة الإحالات والمكافآت</li>
                    <li>إشعارات تلقائية للمستخدمين</li>
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-primary" />
                مراجعة طلبات المهام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center p-8">جاري التحميل...</div>
              ) : submissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
              ) : (
                submissions.map(submission => (
                  <div 
                    key={submission.id}
                    className="p-4 rounded-lg bg-background/50 border border-border space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{submission.task_title}</h3>
                        <p className="text-sm text-muted-foreground">
                          تاريخ التقديم: {new Date(submission.submitted_at).toLocaleDateString('ar')}
                        </p>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">UID المقدم:</label>
                        <p className="text-sm bg-muted p-2 rounded mt-1 font-mono">{submission.uid}</p>
                      </div>
                      
                      {submission.campaign_link && (
                        <div>
                          <label className="text-sm font-medium text-foreground">رابط الحملة:</label>
                          <a 
                            href={submission.campaign_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                          >
                            فتح الرابط <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {submission.reviewer_notes && (
                      <div>
                        <label className="text-sm font-medium text-foreground">ملاحظات المراجع:</label>
                        <p className="text-sm bg-muted p-2 rounded mt-1">{submission.reviewer_notes}</p>
                      </div>
                    )}

                    {submission.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-foreground">ملاحظات (اختيارية):</label>
                          <Textarea
                            value={reviewNotes[submission.id] || ''}
                            onChange={(e) => setReviewNotes(prev => ({ 
                              ...prev, 
                              [submission.id]: e.target.value 
                            }))}
                            placeholder="أضف ملاحظات..."
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateSubmissionStatus(
                              submission.id, 
                              'approved', 
                              reviewNotes[submission.id]
                            )}
                            className="gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            قبول
                          </Button>
                          
                          <Button
                            variant="destructive"
                            onClick={() => updateSubmissionStatus(
                              submission.id, 
                              'rejected', 
                              reviewNotes[submission.id]
                            )}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}