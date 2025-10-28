import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Users, AlertCircle, Image } from "lucide-react";
interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (taskData: any) => void;
  pepeBalance: number;
  pepeAdvertisingBalance?: number;
  isEnglish?: boolean;
}
export function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  pepeBalance,
  pepeAdvertisingBalance = 0,
  isEnglish = false
}: CreateTaskDialogProps) {
  const {
    toast
  } = useToast();
  const [channelUrl, setChannelUrl] = useState('');
  const [targetMembers, setTargetMembers] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast({
          title: t("نوع ملف غير مدعوم", "Unsupported file type"),
          description: t("يرجى اختيار صورة فقط", "Please select an image only"),
          variant: "destructive"
        });
        return;
      }

      // التحقق من حجم الملف (5MB كحد أقصى)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("حجم ملف كبير", "File size too large"),
          description: t("يجب أن يكون حجم الصورة أقل من 5MB", "Image size must be less than 5MB"),
          variant: "destructive"
        });
        return;
      }
      setSelectedImage(file);
      toast({
        title: t("تم اختيار الصورة", "Image selected"),
        description: t("تم اختيار الصورة بنجاح", "Image selected successfully")
      });
    }
  };
  const memberOptions = [{
    value: '500',
    label: '500',
    cost: 150000
  }, {
    value: '1000',
    label: '1000',
    cost: 300000
  }, {
    value: '5000',
    label: '5000',
    cost: 1500000
  }, {
    value: '10000',
    label: '10000',
    cost: 3000000
  }];
  const selectedOption = memberOptions.find(opt => opt.value === targetMembers);
  const totalCost = selectedOption?.cost || 0;
  const handleSubmit = async () => {
    if (!channelUrl || !targetMembers) {
      toast({
        title: t("معلومات ناقصة", "Missing Information"),
        description: t("يرجى ملء جميع الحقول", "Please fill all fields"),
        variant: "destructive"
      });
      return;
    }
    if (pepeAdvertisingBalance < totalCost) {
      toast({
        title: t("رصيد غير كافي", "Insufficient Balance"),
        description: t(`تحتاج إلى ${totalCost.toLocaleString()} PEPE لإنشاء هذه المهمة`, `You need ${totalCost.toLocaleString()} PEPE to create this task`),
        variant: "destructive"
      });
      return;
    }
    if (!channelUrl.includes('t.me/')) {
      toast({
        title: t("رابط غير صحيح", "Invalid Link"),
        description: t("يرجى إدخال رابط قناة تليجرام صحيح", "Please enter a valid Telegram channel link"),
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
      if (!storedTelegramId) {
        throw new Error('No telegram ID found');
      }

      // تحضير بيانات الصورة إذا كانت موجودة
      let imageData = null;
      if (selectedImage) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // إزالة prefix
          };
          reader.readAsDataURL(selectedImage);
        });
      }

      // استدعاء edge function لإنشاء المهمة
      const { data, error } = await supabase.functions.invoke('create-user-task', {
        body: {
          channel_url: channelUrl,
          target_members: parseInt(targetMembers),
          creator_telegram_id: parseInt(storedTelegramId),
          image_data: imageData
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.message || 'فشل في إنشاء المهمة');
      }

      // إنشاء كائن المهمة للواجهة
      const newTask = {
        id: data.task_id,
        channel_name: channelUrl.split('/').pop() || 'Unknown Channel',
        target_members: parseInt(targetMembers)
      };

      onTaskCreated(newTask);

      // إعادة تعيين النموذج
      setChannelUrl('');
      setTargetMembers('');
      setSelectedImage(null);
      onOpenChange(false);
      
      toast({
        title: t("تم إنشاء المهمة! 🎉", "Task Created! 🎉"),
        description: data.message || t("تم إنشاء المهمة ونشرها بنجاح", "Task created and published successfully")
      });
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: t("خطأ في الإنشاء", "Creation Error"),
        description: error.message || t("فشل في إنشاء المهمة", "Failed to create task"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t("إنشاء مهمة جديدة", "Create New Task")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-url">
              {t("رابط القناة", "Channel URL")}
            </Label>
            <Input id="channel-url" placeholder="https://t.me/your_channel" value={channelUrl} onChange={e => setChannelUrl(e.target.value)} className="text-right" />
            <p className="text-xs text-muted-foreground">
              {t("يجب أن يكون البوت مشرف في القناة", "Bot must be admin in the channel")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("عدد الأعضاء المطلوب", "Target Members")}</Label>
            <Select value={targetMembers} onValueChange={setTargetMembers}>
              <SelectTrigger>
                <SelectValue placeholder={t("اختر عدد الأعضاء", "Select member count")} />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label} {t("عضو", "members")}</span>
                      <span className="mr-2 text-muted-foreground">
                        {option.cost.toLocaleString()} PEPE
                      </span>
                    </div>
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedOption && <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("التكلفة الإجمالية", "Total Cost")}:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{totalCost.toLocaleString()} PEPE</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>{t("المكافأة لكل عضو", "Reward per member")}:</span>
                  <span className="text-green-600">50 PEPE</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>{t("رصيدك الحالي", "Your Balance")}:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className={pepeAdvertisingBalance >= totalCost ? "text-green-600" : "text-red-500"}>
                      {pepeAdvertisingBalance.toLocaleString()} PEPE
                    </span>
                  </div>
                </div>

                {pepeAdvertisingBalance < totalCost && <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <p className="text-xs text-destructive">
                      {t("رصيد PEPE غير كافي لإنشاء هذه المهمة", "Insufficient PEPE balance to create this task")}
                    </p>
                  </div>}
              </CardContent>
            </Card>}

          {/* اختيار الصورة */}
          <div className="space-y-2">
            <Label>{t("صورة القناة (اختيارية)", "Channel Image (Optional)")}</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleImageSelect}
                className="flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                {selectedImage ? t("تغيير الصورة", "Change Image") : t("اختيار صورة", "Select Image")}
              </Button>
              {selectedImage && (
                <span className="text-sm text-muted-foreground">
                  {selectedImage.name}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || !channelUrl || !targetMembers || pepeAdvertisingBalance < totalCost}>
              {loading ? t("جاري الإنشاء...", "Creating...") : t("إنشاء المهمة", "Create Task")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}