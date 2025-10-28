import { useState } from "react";
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useToast } from "@/hooks/use-toast";
import { useClickSound } from "@/hooks/useClickSound";

const CreateLuckyDraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const { playSound } = useClickSound();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    channelUsername: "",
    imageUrl: "",
    maxParticipants: "",
    winnerCount: "1",
    prizeDescription: "",
    endDate: "",
    requireChannelSubscription: false,
    mandatoryChannelUsername: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [channelStatus, setChannelStatus] = useState<{
    isSearching: boolean;
    isConnected: boolean;
    channelName: string;
  }>({
    isSearching: false,
    isConnected: false,
    channelName: "",
  });

  const createDrawMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!telegramUser) throw new Error("يجب تسجيل الدخول أولاً");

      // إنشاء فاتورة النجوم
      const createFee = 10;
      
      if ((window as any).Telegram?.WebApp) {
        try {
          // إنشاء فاتورة النجوم
          const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('create-star-invoice', {
            body: { 
              amount: createFee,
              description: 'دفع رسوم إنشاء سحب الحظ',
              userId: telegramUser.id
            }
          });

          if (invoiceError) throw new Error('فشل في إنشاء فاتورة الدفع');

          // فتح فاتورة الدفع
          const result = await new Promise((resolve, reject) => {
            (window as any).Telegram.WebApp.openInvoice(
              invoiceData.invoice_link,
              (status: string) => {
                if (status === 'paid') {
                  resolve(true);
                } else {
                  reject(new Error('تم إلغاء الدفع'));
                }
              }
            );
          });
        } catch (error) {
          throw new Error('فشل في دفع رسوم إنشاء السحب');
        }
      } else {
        throw new Error('يجب استخدام التطبيق من داخل تليجرام');
      }

      // Create the lucky draw
      const { data: draw, error: drawError } = await supabase
        .from("lucky_draws")
        .insert({
          creator_id: telegramUser.id,
          title: data.title,
          description: data.description,
          channel_username: data.channelUsername,
          image_url: data.imageUrl || null,
          max_participants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
          winner_count: parseInt(data.winnerCount),
          prize_description: data.prizeDescription,
          ends_at: data.endDate ? new Date(data.endDate).toISOString() : null,
        })
        .select()
        .single();

      if (drawError) throw drawError;
      return draw;
    },
    onSuccess: async (draw) => {
      // لا نرسل السحب للقناة تلقائياً - المستخدمون سيدخلون عبر البوت
      toast({
        title: "تم إنشاء السحب بنجاح!",
        description: "تم إنشاء السحب بنجاح، يمكن للمستخدمين المشاركة الآن",
      });
      navigate(`/lucky-draws/${draw.id}`);
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء السحب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "عنوان السحب مطلوب";
    }

    if (!formData.channelUsername.trim()) {
      newErrors.channelUsername = "اسم القناة مطلوب";
    } else if (!channelStatus.isConnected) {
      newErrors.channelUsername = "يجب ربط القناة أولاً";
    }

    if (formData.maxParticipants && parseInt(formData.maxParticipants) < 1) {
      newErrors.maxParticipants = "عدد المشاركين يجب أن يكون أكبر من صفر";
    }

    if (parseInt(formData.winnerCount) < 1) {
      newErrors.winnerCount = "عدد الفائزين يجب أن يكون أكبر من صفر";
    }

    if (!formData.endDate.trim()) {
      newErrors.endDate = "تاريخ انتهاء السحب مطلوب";
    } else {
      const endDate = new Date(formData.endDate);
      const now = new Date();
      if (endDate <= now) {
        newErrors.endDate = "تاريخ انتهاء السحب يجب أن يكون في المستقبل";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createDrawMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    
    // إذا كان المجال هو اسم القناة، قم بإعادة تعيين حالة القناة
    if (field === "channelUsername") {
      setChannelStatus({ isSearching: false, isConnected: false, channelName: "" });
    }
  };

  const checkChannelConnection = async (channelUsername: string) => {
    if (!channelUsername.trim()) return;

    setChannelStatus({ isSearching: true, isConnected: false, channelName: "" });

    try {
      const { data, error } = await supabase.functions.invoke('check-bot-admin', {
        body: { channel_link: channelUsername }
      });

      if (error) throw error;

      if (data.success) {
        setChannelStatus({
          isSearching: false,
          isConnected: true,
          channelName: data.channel_name || channelUsername,
        });
        toast({
          title: "تم الربط بنجاح!",
          description: `تم ربط القناة ${data.channel_name || channelUsername}`,
        });
      } else {
        setChannelStatus({ isSearching: false, isConnected: false, channelName: "" });
        toast({
          title: "فشل في الربط",
          description: data.message || "تأكد من أن البوت أدمن في القناة",
          variant: "destructive",
        });
      }
    } catch (error) {
      setChannelStatus({ isSearching: false, isConnected: false, channelName: "" });
      toast({
        title: "خطأ في الاتصال",
        description: "حدث خطأ أثناء فحص القناة",
        variant: "destructive",
      });
    }
  };

  const disconnectChannel = () => {
    setChannelStatus({ isSearching: false, isConnected: false, channelName: "" });
    setFormData(prev => ({ ...prev, channelUsername: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            playSound();
            navigate("/lucky-draws");
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إنشاء سحب حظ جديد</h1>
            <p className="text-sm text-muted-foreground">رسوم إنشاء السحب: 10 نجوم تليجرام</p>
          </div>
        </div>


        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 1 ? <CheckCircle className="h-4 w-4" /> : "1"}
            </div>
            <span className="text-sm font-medium">معلومات السحب</span>
          </div>
          <div className="flex-1 h-px bg-border"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 2 ? <CheckCircle className="h-4 w-4" /> : "2"}
            </div>
            <span className="text-sm font-medium">تأكيد ونشر</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات السحب</CardTitle>
                <CardDescription>
                  املأ المعلومات الأساسية لسحب الحظ
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان السحب *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="مثال: سحب على iPhone 15 Pro"
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="وصف مفصل عن السحب والجائزة..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelUsername">اسم القناة *</Label>
                  {!channelStatus.isConnected ? (
                    <div className="flex gap-2">
                      <Input
                        id="channelUsername"
                        value={formData.channelUsername}
                        onChange={(e) => handleInputChange("channelUsername", e.target.value)}
                        placeholder="channel_name"
                        className={errors.channelUsername ? "border-destructive" : ""}
                        disabled={channelStatus.isSearching}
                      />
                      <Button
                        type="button"
                        onClick={() => checkChannelConnection(formData.channelUsername)}
                        disabled={!formData.channelUsername.trim() || channelStatus.isSearching}
                        className="px-6"
                      >
                        {channelStatus.isSearching ? "جاري البحث..." : "ربط"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="flex-1 text-green-800 font-medium">
                        تم الربط: {channelStatus.channelName}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={disconnectChannel}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        إلغاء الربط
                      </Button>
                    </div>
                  )}
                  {errors.channelUsername && <p className="text-sm text-destructive">{errors.channelUsername}</p>}
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                    <Input
                      id="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={(e) => handleInputChange("maxParticipants", e.target.value)}
                      placeholder="غير محدود"
                      type="number"
                      min="1"
                      className={errors.maxParticipants ? "border-destructive" : ""}
                    />
                    {errors.maxParticipants && <p className="text-sm text-destructive">{errors.maxParticipants}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="winnerCount">عدد الفائزين *</Label>
                    <Input
                      id="winnerCount"
                      value={formData.winnerCount}
                      onChange={(e) => handleInputChange("winnerCount", e.target.value)}
                      type="number"
                      min="1"
                      className={errors.winnerCount ? "border-destructive" : ""}
                    />
                    {errors.winnerCount && <p className="text-sm text-destructive">{errors.winnerCount}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prizeDescription">ما هي الجائزة</Label>
                  <Textarea
                    id="prizeDescription"
                    value={formData.prizeDescription}
                    onChange={(e) => handleInputChange("prizeDescription", e.target.value)}
                    placeholder="وصف مفصل للجائزة..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">تاريخ انتهاء السحب *</Label>
                  <Input
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    type="datetime-local"
                    className={errors.endDate ? "border-destructive" : ""}
                  />
                  {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
                  <p className="text-xs text-muted-foreground">
                    يجب تحديد تاريخ ووقت انتهاء السحب
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (validateForm()) {
                      setStep(2);
                    }
                  }}
                  className="w-full"
                >
                  التالي
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>تأكيد ونشر السحب</CardTitle>
                <CardDescription>
                  راجع المعلومات وقم بتأكيد إنشاء السحب
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold">ملخص السحب:</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>العنوان:</strong> {formData.title}</p>
                    {formData.description && <p><strong>الوصف:</strong> {formData.description}</p>}
                    <p><strong>القناة:</strong> {formData.channelUsername}</p>
                    <p><strong>عدد الفائزين:</strong> {formData.winnerCount}</p>
                    {formData.maxParticipants && <p><strong>الحد الأقصى للمشاركين:</strong> {formData.maxParticipants}</p>}
                    {formData.prizeDescription && <p><strong>الجائزة:</strong> {formData.prizeDescription}</p>}
                    {formData.endDate && (
                      <p><strong>ينتهي في:</strong> {new Date(formData.endDate).toLocaleDateString('ar-SA')}</p>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    تأكد من أن البوت أدمن في قناتك لإنشاء السحب بنجاح.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    السابق
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDrawMutation.isPending}
                    className="flex-1"
                  >
                    {createDrawMutation.isPending ? "جاري الإنشاء..." : "إنشاء السحب"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateLuckyDraw;