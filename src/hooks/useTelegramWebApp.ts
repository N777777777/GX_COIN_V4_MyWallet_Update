import { useEffect, useState } from 'react';

// تعريف نوع Telegram WebApp API
// هذا النوع مبسط ويحتوي فقط على الخصائص التي نحتاجها
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code: string;
      is_bot?: boolean;
      is_premium?: boolean;
    };
    query_id?: string;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  // يمكن إضافة المزيد من الخصائص حسب الحاجة
}

// تعريف نوع لـ window ليشمل Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Hook لاستخدام Telegram WebApp API
 * @returns {object} يحتوي على كائن webApp
 */
export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      setWebApp(window.Telegram.WebApp);
    }
  }, []);

  return { webApp };
};

