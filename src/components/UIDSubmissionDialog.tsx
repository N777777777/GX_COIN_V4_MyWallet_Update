import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExternalLink, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UIDSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (uid: string) => void;
  taskTitle: string;
  campaignLink: string;
  telegramBotUsername?: string;
}

export function UIDSubmissionDialog({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  campaignLink,
  telegramBotUsername = "GCoinV2Bot"
}: UIDSubmissionDialogProps) {
  const [uid, setUid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!uid.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال UID الخاص بك",
        variant: "destructive",
      });
      return;
    }

    // للمهام الأخرى غير KUCOIN - إرسال مباشر
    if (taskTitle !== "KUCOIN") {
      setIsSubmitting(true);
      onSubmit(uid);
      setIsSubmitting(false);
      onClose();
      
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك والتحقق منه",
      });
      return;
    }

    // لمهمة KUCOIN - عرض التأكيد أولاً
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // تأكيد الإرسال لمهمة KUCOIN
    setIsSubmitting(true);
    onSubmit(uid);
    setIsSubmitting(false);
    setShowConfirmation(false);
    onClose();
    
    toast({
      title: "تم إرسال الطلب",
      description: "سيتم مراجعة طلبك والتحقق منه",
    });
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setUid("");
    onClose();
  };
  
  const openTelegramBot = () => {
    const message = `مهمة: ${taskTitle}\nUID: ${uid.trim()}`;
    const encodedMessage = encodeURIComponent(message);
    const telegramUrl = `https://t.me/${telegramBotUsername}?start=${encodedMessage}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? "تأكيد إرسال الطلب" : `تقديم UID - ${taskTitle}`}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation 
              ? `هل أنت متأكد من إرسال UID: ${uid} لمهمة ${taskTitle}؟`
              : "قم بزيارة الكامبين وأدخل UID الخاص بك للتحقق من مشاركتك"
            }
          </DialogDescription>
        </DialogHeader>
        
        {!showConfirmation && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(campaignLink, '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                زيارة الكامبين
              </Button>
              
              {/* زر إضافي لمهمة KUCOIN */}
              {taskTitle === "KUCOIN" && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open("https://t.me/G_COIN_V3/577", '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit the campaign
                </Button>
              )}
            </div>

            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">لتقديم UID الخاص بك</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  يرجى زيارة الموقع التالي لتقديم UID بشكل صحيح:
                </p>
                <Button 
                  onClick={() => window.open('https://gg-coin-bot-t49x.vercel.app/', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  افتح موقع التقديم
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {showConfirmation ? (
            <>
              <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isSubmitting}>
                رجوع
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'تأكيد الإرسال'
                )}
              </Button>
            </>
          ) : (
             <>
               <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                 إغلاق
               </Button>
             </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
