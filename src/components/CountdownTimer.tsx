import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ isEnglish = false }: { isEnglish?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  useEffect(() => {
    // تاريخ ثابت موحد لجميع المستخدمين 
    // 14 أغسطس 2025 الساعة 12:00 ظهراً
    const endDate = new Date(2025, 7, 14, 12, 0, 0); // الشهر 7 = أغسطس (0-indexed)
    
    console.log('Current time:', new Date());
    console.log('End Date:', endDate);
    console.log('Time difference:', endDate.getTime() - new Date().getTime());

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = endDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // حساب الوقت المتبقي فوراً
    calculateTimeLeft();

    // تحديث العداد كل ثانية
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <Card className="bg-gradient-card border-border shadow-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-center">
          <Clock className="w-5 h-5 text-primary" />
          {t("العد التنازلي للإنزال الجوي", "Airdrop Countdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-gradient-primary rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-foreground">
              {formatNumber(timeLeft.days)}
            </div>
            <div className="text-xs text-primary-foreground/80 mt-1">
              {t("يوم", "Day")}
            </div>
          </div>
          
          <div className="bg-gradient-primary rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-foreground">
              {formatNumber(timeLeft.hours)}
            </div>
            <div className="text-xs text-primary-foreground/80 mt-1">
              {t("ساعة", "Hour")}
            </div>
          </div>
          
          <div className="bg-gradient-primary rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-foreground">
              {formatNumber(timeLeft.minutes)}
            </div>
            <div className="text-xs text-primary-foreground/80 mt-1">
              {t("دقيقة", "Minute")}
            </div>
          </div>
          
          <div className="bg-gradient-primary rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-foreground">
              {formatNumber(timeLeft.seconds)}
            </div>
            <div className="text-xs text-primary-foreground/80 mt-1">
              {t("ثانية", "Second")}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {t("احصل على مكافآت حصرية عند انتهاء العداد!", "Get exclusive rewards when the countdown ends!")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}