import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Target, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Qualification() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const { toast } = useToast();
  const [isQualified, setIsQualified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [kuCoinTaskStatus, setKuCoinTaskStatus] = useState<'not_completed' | 'pending' | 'approved' | 'rejected' | 'completed'>('not_completed');

  useEffect(() => {
    checkQualificationStatus();
  }, []);

  const checkQualificationStatus = async () => {
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      setIsLoading(false);
      return;
    }

    try {
      // البحث عن المستخدم
      const { data: userData } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', parseInt(storedTelegramId))
        .single();

      if (userData) {
        // التحقق من حالة مهمة KuCoin
        const { data: kuCoinSubmission } = await supabase
          .from('uid_submissions')
          .select('status')
          .eq('telegram_user_id', userData.id)
          .eq('task_id', '6') // معرف مهمة KuCoin
          .single();

        if (kuCoinSubmission) {
          setKuCoinTaskStatus(kuCoinSubmission.status as any);
          setIsQualified(kuCoinSubmission.status === 'approved' || kuCoinSubmission.status === 'completed');
        }
      }
    } catch (error) {
      console.error('Error checking qualification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Target className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return 'مؤهل ✓';
      case 'pending':
        return 'قيد المراجعة';
      case 'rejected':
        return 'مرفوض - حاول مرة أخرى';
      default:
        return 'غير مؤهل';
    }
  };

  const getStatusDescription = () => {
    switch (kuCoinTaskStatus) {
      case 'approved':
      case 'completed':
        return 'تهانينا! لقد أكملت مهمة KuCoin بنجاح وأصبحت مؤهلاً للاستفادة من جميع مزايا التطبيق.';
      case 'pending':
        return 'تم إرسال تقديمك لمهمة KuCoin وهو قيد المراجعة. سيتم إشعارك بالنتيجة قريباً.';
      case 'rejected':
        return 'تم رفض تقديمك لمهمة KuCoin. يرجى مراجعة التعليمات والمحاولة مرة أخرى.';
      default:
        return 'لتصبح مؤهلاً، يجب إكمال مهمة KuCoin أولاً. اذهب إلى صفحة المهام وأكمل مهمة KuCoin.';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">جاري التحقق من حالة التأهل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">حالة التأهل</h1>
        </div>

        {/* Status Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-xl ${getStatusColor()}`}>
              {getStatusText()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white/80 text-center">
              {getStatusDescription()}
            </p>

            {/* Task Details */}
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">المهمة المطلوبة:</span>
                <Badge variant="outline" className="text-white border-white/30">
                  KuCoin Campaign
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">المكافأة:</span>
                <span className="text-white font-semibold">10 نقاط</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">الحالة:</span>
                <span className={`font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {kuCoinTaskStatus === 'not_completed' && (
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-white text-primary hover:bg-white/90"
                >
                  اذهب لإكمال المهمة
                </Button>
              )}
              
              {kuCoinTaskStatus === 'rejected' && (
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-white text-primary hover:bg-white/90"
                >
                  حاول مرة أخرى
                </Button>
              )}
              
              {(kuCoinTaskStatus === 'pending' || kuCoinTaskStatus === 'approved' || kuCoinTaskStatus === 'completed') && (
                <Button 
                  variant="outline" 
                  onClick={checkQualificationStatus}
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  تحديث الحالة
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Qualification Benefits */}
        {isQualified && (
          <Card className="bg-green-500/10 backdrop-blur-lg border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-400 text-center">
                🎉 مزايا التأهل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>إمكانية الوصول لجميع المزايا</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>مكافآت إضافية</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>أولوية في الأحداث</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}