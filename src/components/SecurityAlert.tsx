import { AlertTriangle, Shield, Ban } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SecurityAlertProps {
  securityFlags: string[];
  onRetry?: () => void;
}

const getSecurityMessage = (flags: string[]): { title: string; message: string; severity: 'warning' | 'error' } => {
  if (flags.includes('USER_BLOCKED')) {
    return {
      title: 'تم حظر الحساب',
      message: 'تم حظر حسابك لأسباب أمنية. يرجى التواصل مع الدعم الفني.',
      severity: 'error'
    };
  }
  
  if (flags.includes('INVALID_SESSION')) {
    return {
      title: 'جلسة غير صالحة',
      message: 'انتهت صلاحية جلستك. يرجى إغلاق التطبيق وإعادة فتحه من Telegram.',
      severity: 'error'
    };
  }
  
  if (flags.includes('IP_CHANGED') || flags.includes('USER_AGENT_CHANGED')) {
    return {
      title: 'تم اكتشاف نشاط مشبوه',
      message: 'تم اكتشاف تغيير في موقعك أو متصفحك. لأمانك، يرجى إعادة فتح التطبيق من Telegram.',
      severity: 'warning'
    };
  }
  
  return {
    title: 'تحذير أمني',
    message: 'تم اكتشاف نشاط غير عادي. يرجى استخدام التطبيق من خلال Telegram فقط.',
    severity: 'warning'
  };
};

export const SecurityAlert = ({ securityFlags, onRetry }: SecurityAlertProps) => {
  if (securityFlags.length === 0) return null;
  
  const { title, message, severity } = getSecurityMessage(securityFlags);
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-auto">
        <Alert className={severity === 'error' ? 'border-destructive' : 'border-warning'}>
          <div className="flex items-center gap-2 mb-2">
            {severity === 'error' ? (
              <Ban className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
          </div>
          <AlertDescription className="text-base mb-4">
            {message}
          </AlertDescription>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Shield className="h-4 w-4" />
            <span>حماية من التلاعب والوصول غير المصرح به</span>
          </div>
          
          {onRetry && !securityFlags.includes('USER_BLOCKED') && (
            <Button onClick={onRetry} className="w-full">
              إعادة المحاولة
            </Button>
          )}
          
          <div className="mt-4 text-xs text-muted-foreground text-center">
            للحصول على المساعدة، يرجى التواصل مع الدعم الفني في Telegram
          </div>
        </Alert>
      </div>
    </div>
  );
};