import { useEffect, useState } from 'react';

interface TelegramWebAppProps {
  children: React.ReactNode;
}

// تسهيل تشغيل التطبيق كـ Telegram Web App
export function TelegramWebApp({ children }: TelegramWebAppProps) {
  const [isTelegramChecked, setIsTelegramChecked] = useState(false);

  useEffect(() => {
    // التحقق من أن التطبيق يعمل داخل Telegram فقط
    const isTelegramWebApp = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    
    // التحقق من معاملات المطور للسماح بالوصول من المتصفح للاختبار
    const urlParams = new URLSearchParams(window.location.search);
    const isDeveloper = urlParams.get('dev') === 'true';
    
    // إذا لم يكن في Telegram وليس مطور، إعادة التوجيه
    if (!isTelegramWebApp && !isDeveloper && window.location.pathname !== '/telegram-only') {
      console.log('⚠️ Access denied: App must be opened from Telegram');
      window.location.href = '/telegram-only';
      return;
    }
    
    setIsTelegramChecked(true);
    
    // تحقق من وجود Telegram Web App
    if (isTelegramWebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      try {
        // تجهيز التطبيق
        tg.ready?.();
        tg.expand?.();
        
        // تطبيق ألوان التليجرام إذا كانت متوفرة
        if (tg.themeParams?.bg_color) {
          document.documentElement.style.setProperty('--telegram-bg', tg.themeParams.bg_color);
        }
        
        if (tg.themeParams?.text_color) {
          document.documentElement.style.setProperty('--telegram-text', tg.themeParams.text_color);
        }
        
        // إخفاء الأزرار الافتراضية
        tg.MainButton?.hide?.();
        // Skip BackButton for older versions to avoid warnings
        if (tg.version && parseFloat(tg.version) >= 6.1) {
          tg.BackButton?.hide?.();
        }
        
        console.log('🚀 Telegram Web App initialized successfully!');
        console.log('User:', tg.initDataUnsafe?.user);
        console.log('Start param:', tg.initDataUnsafe?.start_param);
        
      } catch (error) {
        console.log('Error initializing Telegram Web App:', error);
      }
    }
  }, []);

  // لا تعرض المحتوى حتى يتم التحقق من Telegram
  if (!isTelegramChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}