import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTelegramData } from "@/hooks/useTelegramData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

interface PartnershipFormData {
  username: string;
  channel_link: string;
}

export const PartnershipRequestForm = ({ isEnglish = false }: { isEnglish?: boolean }) => {
  const { telegramUser } = useTelegramData();
  const telegramId = telegramUser?.telegram_id;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [partnershipStatus, setPartnershipStatus] = useState<any>(null);

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  const form = useForm<PartnershipFormData>({
    defaultValues: {
      username: "",
      channel_link: "",
    },
  });

  const loadPartnershipStatus = async () => {
    if (!telegramId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (!userData) {
        setIsLoading(false);
        return;
      }

      const { data: request } = await supabase
        .from('partnership_requests')
        .select('id, status, username, channel_link, created_at, rejection_reason')
        .eq('telegram_user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Simplified check without deep type inference
      let isManager = false;
      try {
        const response: any = await supabase
          .from('manager_referral_commission_rates')
          .select('id');
        
        if (response.data && response.data.length > 0) {
          const filtered = response.data.filter((item: any) => 
            item.manager_telegram_id === telegramId && item.is_active === true
          );
          isManager = filtered.length > 0;
        }
      } catch (e) {
        console.error('Error checking manager status:', e);
      }

      setPartnershipStatus({
        request,
        isPartner: isManager
      });
    } catch (error) {
      console.error('Error loading partnership status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartnershipStatus();
  }, [telegramId]);

  const onSubmit = async (data: PartnershipFormData) => {
    if (!telegramId) {
      toast({
        title: t("خطأ", "Error"),
        description: t("لم يتم العثور على معرف التليجرام", "Telegram ID not found"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: response, error } = await supabase.functions.invoke('send-partnership-invitation', {
        body: {
          telegram_id: telegramId,
          username: data.username,
          channel_link: data.channel_link,
        },
      });

      // Handle response errors (400 status with error message)
      if (response?.error) {
        toast({
          title: t("تنبيه", "Warning"),
          description: response.error,
          variant: "destructive",
        });
        // Reload status to show pending request if exists
        loadPartnershipStatus();
        return;
      }

      // Handle technical errors
      if (error) {
        toast({
          title: t("خطأ", "Error"),
          description: t("حدث خطأ أثناء إرسال الطلب", "An error occurred while submitting the request"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("تم الإرسال بنجاح", "Successfully Submitted"),
        description: t("تم إرسال طلب الشراكة! سيتم مراجعته قريباً", "Partnership request submitted! It will be reviewed soon"),
      });

      form.reset();
      loadPartnershipStatus();

    } catch (error) {
      console.error('Error submitting partnership request:', error);
      toast({
        title: t("خطأ", "Error"),
        description: t("حدث خطأ أثناء إرسال الطلب", "An error occurred while submitting the request"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Show partner referral link if approved
  if (partnershipStatus?.isPartner || partnershipStatus?.request?.status === 'approved') {
    const partnerReferralLink = `https://t.me/G3_COIN_V3_BOT?start=partner_${telegramId}`;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {t("أنت شريك معتمد", "You are an Approved Partner")}
          </CardTitle>
          <CardDescription>
            {t("مبروك! أنت الآن شريك معتمد بعمولات خاصة", "Congratulations! You are now an approved partner with special commissions")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/20 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">{t("نسب العمولة الخاصة بك:", "Your Commission Rates:")}</h3>
            <ul className="space-y-1 text-sm">
              <li>• {t("60% من عملات PEPE من إحالاتك", "60% of PEPE coins from your referrals")}</li>
              <li>• {t("6% من عملات ALPHA من إحالاتك", "6% of ALPHA coins from your referrals")}</li>
              <li>• {t("10% من عملات G COIN V4 من إحالاتك", "10% of G COIN V4 from your referrals")}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <FormLabel>{t("رابط الإحالة الخاص بالشراكة:", "Partnership Referral Link:")}</FormLabel>
            <div className="flex gap-2">
              <Input 
                value={partnerReferralLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(partnerReferralLink);
                  toast({
                    title: t("تم النسخ", "Copied"),
                    description: t("تم نسخ رابط الإحالة", "Referral link copied"),
                  });
                }}
              >
                {t("نسخ", "Copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("استخدم هذا الرابط للحصول على عمولات الشراكة الخاصة", "Use this link to earn your special partnership commissions")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show status if pending
  if (partnershipStatus?.request?.status === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            {t("طلب الشراكة قيد المراجعة", "Partnership Request Under Review")}
          </CardTitle>
          <CardDescription>
            {t("تم إرسال طلبك وهو الآن قيد المراجعة من قبل الإدارة", "Your request has been submitted and is now under review by management")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm"><strong>{t("اسم المستخدم:", "Username:")}</strong> {partnershipStatus.request.username}</p>
            <p className="text-sm"><strong>{t("رابط القناة:", "Channel Link:")}</strong> {partnershipStatus.request.channel_link}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("تاريخ التقديم:", "Submission Date:")} {new Date(partnershipStatus.request.created_at).toLocaleDateString(isEnglish ? 'en' : 'ar')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show rejection status if rejected
  if (partnershipStatus?.request?.status === 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            {t("تم رفض طلب الشراكة", "Partnership Request Rejected")}
          </CardTitle>
          <CardDescription>
            {t("نأسف، لم يتم قبول طلبك", "Sorry, your request was not accepted")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {partnershipStatus.request.rejection_reason && (
            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-sm"><strong>{t("السبب:", "Reason:")}</strong> {partnershipStatus.request.rejection_reason}</p>
            </div>
          )}
          <Button
            onClick={() => {
              loadPartnershipStatus();
              form.reset();
            }}
            variant="outline"
            className="w-full"
          >
            {t("تقديم طلب جديد", "Submit New Request")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show form for new request
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("تقديم طلب شراكة", "Submit Partnership Request")}</CardTitle>
        <CardDescription>
          {t("قدم طلبك لتصبح شريكاً معتمداً بعمولات خاصة (60% PEPE، 6% ALPHA، 10% G COIN V4)", 
             "Submit your request to become an approved partner with special commissions (60% PEPE, 6% ALPHA, 10% G COIN V4)")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              rules={{ required: t("اسم المستخدم مطلوب", "Username is required") }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("اسم المستخدم", "Username")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="@username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channel_link"
              rules={{ 
                required: t("رابط القناة مطلوب", "Channel link is required"),
                pattern: {
                  value: /^https?:\/\/(t\.me|telegram\.me)\/.+/,
                  message: t("يجب أن يكون رابط تليجرام صحيح", "Must be a valid Telegram link")
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("رابط القناة", "Channel Link")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://t.me/yourchannel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("جاري الإرسال...", "Submitting...")}
                </>
              ) : (
                t("تقديم الطلب", "Submit Request")
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
