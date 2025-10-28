import { useState, useEffect } from 'react';

export function useHourlyProfit(telegramId?: number, hourlyProfit: number = 0) {
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!telegramId || hourlyProfit <= 0) return;

    // تحديد ما إذا كان المستخدم نشطاً (التحقق من focus)
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // افتراض أن المستخدم نشط في البداية
    setIsActive(true);

    // تحديث الرصيد كل دقيقة عندما يكون المستخدم نشطاً
    const interval = setInterval(() => {
      if (isActive) {
        const now = Date.now();
        const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));
        
        if (minutesPassed >= 1) {
          // إضافة الربح لكل دقيقة مرت
          const profitPerMinute = hourlyProfit / 60;
          const totalProfit = profitPerMinute * minutesPassed;
          
          // تحديث الرصيد في localStorage
          const currentCoins = parseFloat(localStorage.getItem(`coins_${telegramId}`) || '0');
          const newCoins = currentCoins + totalProfit;
          localStorage.setItem(`coins_${telegramId}`, newCoins.toString());
          
          setLastUpdate(now);
          
          // إشعار المستخدم إذا كان الربح كبيراً
          if (totalProfit > 1) {
            console.log(`🎉 ربحت ${totalProfit.toFixed(4)} عملة من الربح بالساعة!`);
          }
        }
      }
    }, 60000); // كل دقيقة

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(interval);
    };
  }, [telegramId, hourlyProfit, isActive, lastUpdate]);

  // تحديث وقت آخر تحديث عند تحميل الخطاف
  useEffect(() => {
    setLastUpdate(Date.now());
  }, []);

  return { isActive };
}