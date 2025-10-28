import { Rocket } from "lucide-react";

interface CampaignsProps {
  isEnglish?: boolean;
  tonBalance: number;
  telegramId?: number;
}

export function Campaigns({ isEnglish = false }: CampaignsProps) {
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <Rocket className="w-24 h-24 text-primary relative animate-bounce" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
            {t('قريباً', 'Coming Soon')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('نعمل على شيء مميز لك!', 'We are working on something special for you!')} 🚀
          </p>
        </div>

        <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
      </div>
    </div>
  );
}