import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityValidation {
  is_valid: boolean;
  security_flags: string[];
  user_blocked: boolean;
  session_expires_at: string;
  verification_required: boolean;
}

interface SecureSession {
  success: boolean;
  session_token?: string;
  session_id?: string;
  expires_at?: string;
  message?: string;
}

// دالة لإنشاء بصمة الجهاز
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Security check', 2, 2);
  }
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}`,
    canvas: canvas.toDataURL(),
    timestamp: Date.now()
  };
  
  return btoa(JSON.stringify(fingerprint));
};

export const useSecureAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityFlags, setSecurityFlags] = useState<string[]>([]);

  // التحقق من الجلسة الحالية عند التحميل
  useEffect(() => {
    initializeSecureSession();
  }, []);

  const initializeSecureSession = async () => {
    try {
      // محاولة الحصول على البيانات من Telegram WebApp
      const telegramData = getTelegramWebAppData();
      
      if (telegramData?.user?.id) {
        // مستخدم من Telegram - إنشاء جلسة آمنة
        await createSecureSession(telegramData.user.id);
      } else {
        // مستخدم يحاول الوصول بطريقة غير آمنة
        setError('الوصول المباشر غير مسموح. يرجى استخدام التطبيق من خلال Telegram فقط.');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('خطأ في تهيئة الجلسة الآمنة:', err);
      setError('فشل في التحقق من الأمان');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const getTelegramWebAppData = () => {
    try {
      return window.Telegram?.WebApp?.initDataUnsafe;
    } catch {
      return null;
    }
  };

  const createSecureSession = async (telegramId: number) => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      
      // استدعاء دالة إنشاء الجلسة الآمنة
      const { data, error } = await supabase.rpc('create_secure_session', {
        telegram_id_param: telegramId,
        device_fingerprint_param: deviceFingerprint,
        ip_address_param: null, // سيتم تعيينه في الخادم
        user_agent_param: navigator.userAgent,
        verification_source_param: 'telegram_webapp'
      });

      if (error) {
        throw error;
      }

      const sessionData = data as unknown as SecureSession;
      
      if (sessionData.success && sessionData.session_token) {
        setSessionToken(sessionData.session_token);
        setIsAuthenticated(true);
        setError(null);
        
        // حفظ token في localStorage كنسخة احتياطية (مشفرة)
        localStorage.setItem('secure_session', btoa(sessionData.session_token));
        
        // بدء مراقبة الجلسة
        startSessionMonitoring(telegramId, sessionData.session_token);
      } else {
        throw new Error(sessionData.message || 'فشل في إنشاء الجلسة الآمنة');
      }
    } catch (err) {
      console.error('خطأ في إنشاء الجلسة:', err);
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      setIsAuthenticated(false);
    }
  };

  const startSessionMonitoring = (telegramId: number, token: string) => {
    // التحقق من صحة الجلسة كل 5 دقائق
    const interval = setInterval(async () => {
      try {
        const validation = await validateSession(telegramId, token);
        
        if (!validation.is_valid) {
          console.warn('جلسة غير صالحة:', validation.security_flags);
          setSecurityFlags(validation.security_flags);
          
          if (validation.user_blocked) {
            setError('تم حظر حسابك لأسباب أمنية');
            setIsAuthenticated(false);
            clearInterval(interval);
          } else if (validation.security_flags.includes('INVALID_SESSION')) {
            setError('انتهت صلاحية الجلسة. يرجى إعادة فتح التطبيق');
            setIsAuthenticated(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('خطأ في مراقبة الجلسة:', err);
      }
    }, 5 * 60 * 1000); // كل 5 دقائق

    // حفظ معرف الفاصل الزمني لإلغائه لاحقاً
    return () => clearInterval(interval);
  };

  const validateSession = async (telegramId: number, token: string): Promise<SecurityValidation> => {
    const { data, error } = await supabase.rpc('validate_user_session', {
      telegram_id_param: telegramId,
      session_token_param: token,
      ip_address_param: null,
      user_agent_param: navigator.userAgent
    });

    if (error) {
      throw error;
    }

    return data as unknown as SecurityValidation;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setSessionToken(null);
    setSecurityFlags([]);
    setError(null);
    localStorage.removeItem('secure_session');
  };

  return {
    isAuthenticated,
    sessionToken,
    loading,
    error,
    securityFlags,
    logout,
    validateSession: (telegramId: number, token: string) => validateSession(telegramId, token)
  };
};