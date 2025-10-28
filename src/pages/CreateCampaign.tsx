import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Upload, X, CheckCircle, ImagePlus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramData } from '@/hooks/useTelegramData';
import { useClickSound } from '@/hooks/useClickSound';

interface CreateCampaignProps {
  isEnglish?: boolean;
}

const CreateCampaign = ({ isEnglish = false }: CreateCampaignProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const { playSound } = useClickSound();
  
  const paymentType = 'ton'; // إزالة دعم PEPE - TON فقط
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // State management
  const [campaignName, setCampaignName] = useState('');
  const [distributionAmount, setDistributionAmount] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [channelUsername, setChannelUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [userBalance, setUserBalance] = useState({ pepe: 0, ton: 0 });

  // Load user balance
  useEffect(() => {
    const loadUserBalance = async () => {
      if (!telegramUser?.telegram_id) return;
      
      try {
        const { data, error } = await supabase
          .from('telegram_users')
          .select('bal_x7k9m, ton_balance')
          .eq('telegram_id', telegramUser.telegram_id)
          .single();

        if (error) throw error;
        if (data) {
          setUserBalance({
            pepe: data.bal_x7k9m || 0, // pepe_balance (obfuscated)
            ton: data.ton_balance || 0
          });
        }
      } catch (error) {
        console.error('Error loading user balance:', error);
      }
    };

    loadUserBalance();
  }, [telegramUser]);

  // Get minimum required amount and user balance - TON only
  const getMinimumAmount = () => {
    return 10;
  };

  const getUserBalance = () => {
    return userBalance.ton;
  };

  const getCurrencySymbol = () => {
    return 'TON';
  };

  // Image handling
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('خطأ', 'Error'),
          description: t('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'Image size must be less than 5MB'),
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCampaign = async () => {
    const minimumAmount = getMinimumAmount();
    const currentBalance = getUserBalance();
    const amount = parseFloat(distributionAmount);

    // Validation
    if (!campaignName.trim()) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى إدخال اسم العملة', 'Please enter coin name'),
        variant: 'destructive',
      });
      return;
    }

    if (!distributionAmount || amount <= 0) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى إدخال كمية التوزيع المجاني الصحيحة', 'Please enter valid free distribution amount'),
        variant: 'destructive',
      });
      return;
    }

    if (amount < minimumAmount) {
      toast({
        title: t('خطأ', 'Error'),
        description: t(
          `الحد الأدنى للتوزيع هو ${minimumAmount.toLocaleString()} ${getCurrencySymbol()}`,
          `Minimum distribution amount is ${minimumAmount.toLocaleString()} ${getCurrencySymbol()}`
        ),
        variant: 'destructive',
      });
      return;
    }

    if (currentBalance < amount) {
      toast({
        title: t('خطأ', 'Error'),
        description: t(
          `رصيدك الحالي ${currentBalance.toLocaleString()} ${getCurrencySymbol()} غير كافي. تحتاج ${amount.toLocaleString()} ${getCurrencySymbol()}`,
          `Your current balance ${currentBalance.toLocaleString()} ${getCurrencySymbol()} is insufficient. You need ${amount.toLocaleString()} ${getCurrencySymbol()}`
        ),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedImage) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى اختيار صورة للكامبين', 'Please select an image for the campaign'),
        variant: 'destructive',
      });
      return;
    }

    if (!channelUsername.trim()) {
      toast({
        title: t('خطأ', 'Error'),
        description: t('يرجى إدخال اسم قناة الكامبين', 'Please enter campaign channel username'),
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmission = async () => {
    setIsCreating(true);
    setShowConfirmDialog(false);

    try {
      // رفع الصورة أولاً
      const fileExt = selectedImage!.name.split('.').pop();
      const fileName = `campaign-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, selectedImage!);

      if (uploadError) throw uploadError;

      const imageUrl = `https://yyjxkogzsqiekbawwhgf.supabase.co/storage/v1/object/public/campaign-images/${fileName}`;

      // إنشاء الكامبين في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('campaigns')
        .insert({
          campaign_name: campaignName,
          liquidity_amount: parseFloat(distributionAmount),
          payment_type: paymentType,
          campaign_image_url: imageUrl,
          channel_username: channelUsername.replace('@', ''),
          creator_id: telegramUser?.id || '00000000-0000-0000-0000-000000000000',
          creator_telegram_id: telegramUser?.telegram_id || 123456789,
          status: 'pending',
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 أيام من الآن
        });

      if (insertError) throw insertError;
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: t('خطأ', 'Error'),
        description: t('حدث خطأ أثناء إنشاء الكامبين', 'An error occurred while creating the campaign'),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              playSound();
              navigate(-1);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {t('إنشاء كامبين', 'Create Campaign')}
          </h1>
        </div>

        {/* Campaign Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('إنشاء كامبين جديد', 'Create New Campaign')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('توزع على شكل عملة خاصة للقناة', 'Distributed as channel-specific tokens')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="campaign-name" className="text-sm font-medium">
                  {t('اسم العملة', 'Coin Name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={t('ادخل اسم العملة', 'Enter coin name')}
                  className="w-full"
                />
              </div>

              {/* Distribution Amount */}
              <div className="space-y-2">
                <Label htmlFor="distribution" className="text-sm font-medium">
                  {t(`كمية التوزيع المجاني بالـ ${getCurrencySymbol()}`, `Free Distribution Amount in ${getCurrencySymbol()}`)} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="distribution"
                    type="number"
                    value={distributionAmount}
                    onChange={(e) => setDistributionAmount(e.target.value)}
                    placeholder={t('ادخل كمية التوزيع المجاني', 'Enter free distribution amount')}
                    className="w-full pr-20"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">
                      {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('الحد الأدنى:', 'Minimum:')}
                    </span>
                    <span className="font-medium">
                      {getMinimumAmount().toLocaleString()} {getCurrencySymbol()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('رصيدك الحالي:', 'Your balance:')}
                    </span>
                    <span className={`font-medium ${getUserBalance() >= getMinimumAmount() ? 'text-green-600' : 'text-red-600'}`}>
                      {getUserBalance().toLocaleString()} {getCurrencySymbol()}
                    </span>
                  </div>
                </div>
                {getUserBalance() < getMinimumAmount() && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs">
                      {t('رصيدك غير كافي لإنشاء كامبين', 'Your balance is insufficient to create a campaign')}
                    </span>
                  </div>
                )}
              </div>

              {/* Channel Username */}
              <div className="space-y-2">
                <Label htmlFor="channel" className="text-sm font-medium">
                  {t('قناة الكامبين', 'Campaign Channel')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="channel"
                  value={channelUsername}
                  onChange={(e) => setChannelUsername(e.target.value)}
                  placeholder={t('ادخل اسم القناة (مع أو بدون @)', 'Enter channel username (with or without @)')}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('يجب على المستخدمين الاشتراك في هذه القناة للمشاركة', 'Users must subscribe to this channel to participate')}
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image" className="text-sm font-medium">
                  {t('صورة الكامبين', 'Campaign Image')} <span className="text-red-500">*</span>
                </Label>
                
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Campaign preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="imageUpload"
                    />
                    <label 
                      htmlFor="imageUpload" 
                      className="flex flex-col items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      <ImagePlus className="h-12 w-12 mb-2 text-muted-foreground" />
                      <span className="text-sm text-center">
                        {t('اضغط لاختيار صورة', 'Click to select image')}
                      </span>
                      <span className="text-xs mt-1 text-muted-foreground">
                        {t('حد أقصى 5 ميجابايت', 'Max 5MB')}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleCreateCampaign}
                disabled={isCreating}
                className="w-full py-6 text-lg font-semibold"
              >
                {isCreating ? (
                  t('جاري النشر...', 'Publishing...')
                ) : (
                  t('نشر الكامبين', 'Publish Campaign')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">
                {t('تأكيد نشر الكامبين', 'Confirm Campaign Publication')}
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      {t('نظام توزيع عملة TON:', 'TON Distribution System:')}
                    </p>
                    <p>{t('• 70% سيتم توزيعها على أصحاب الإحالات', '• 70% will be distributed to referrers')}</p>
                    <p>{t('• 30% سيتم توزيعها على المشاركين من زر المشاركة', '• 30% will be distributed to direct participants')}</p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                {t('إلغاء', 'Cancel')}
              </Button>
              <Button 
                onClick={handleConfirmSubmission}
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? t('جاري الإرسال...', 'Submitting...') : t('تأكيد', 'Confirm')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                {t('تم تقديم الطلب بنجاح', 'Request Submitted Successfully')}
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('تم تقديم طلب إنشاء الكامبين بنجاح. سيكون كل شيء جاهز خلال 7 أيام بحد أقصى.', 
                        'Campaign creation request submitted successfully. Everything will be ready within a maximum of 7 days.')}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleSuccessClose} className="w-full">
              {t('عودة للرئيسية', 'Back to Home')}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CreateCampaign;