import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Settings as SettingsIcon, Volume2, VolumeX, Languages, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('sound_enabled');
    return saved !== 'false';
  });

  // Language state
  const [isEnglish, setIsEnglish] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'en' || saved === null;
  });

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  // Toggle sound
  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem('sound_enabled', newSoundState ? 'true' : 'false');
  };

  // Toggle language
  const toggleLanguage = () => {
    const newLanguage = !isEnglish;
    setIsEnglish(newLanguage);
    localStorage.setItem('app_language', newLanguage ? 'en' : 'ar');
    toast({
      title: newLanguage ? "Language Changed" : "تم تغيير اللغة",
      description: newLanguage ? "Language changed to English" : "تم تغيير اللغة إلى العربية"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/95 shadow-sm sticky top-0 z-50">
        <div className="p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t("الإعدادات", "Settings")}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* User Profile Card */}
        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage 
                    src={(window.Telegram?.WebApp?.initDataUnsafe?.user as any)?.photo_url} 
                    alt="User Avatar" 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-2xl">
                    {telegramUser?.first_name 
                      ? telegramUser.first_name.charAt(0).toUpperCase() 
                      : <User className="w-8 h-8" />
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">
                  {telegramUser?.first_name || telegramUser?.username 
                    ? telegramUser.first_name || `@${telegramUser.username}` 
                    : t("مستخدم", "User")
                  }
                </h3>
                {telegramUser?.username && telegramUser?.first_name && (
                  <p className="text-sm text-muted-foreground">
                    @{telegramUser.username}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Sound Settings */}
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                {soundEnabled 
                  ? <Volume2 className="w-6 h-6 text-primary" /> 
                  : <VolumeX className="w-6 h-6 text-muted-foreground" />
                }
                <div>
                  <Label htmlFor="sound-toggle" className="text-base font-medium cursor-pointer">
                    {t("الموسيقى", "Music")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("تشغيل/إيقاف الأصوات", "Enable/Disable sounds")}
                  </p>
                </div>
              </div>
              <Switch 
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={toggleSound}
              />
            </div>

            {/* Language Settings */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Languages className="w-6 h-6 text-primary" />
                <div>
                  <Label htmlFor="language-toggle" className="text-base font-medium cursor-pointer">
                    {t("اللغة", "Language")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isEnglish ? "English" : "العربية"}
                  </p>
                </div>
              </div>
              <Switch 
                id="language-toggle"
                checked={isEnglish}
                onCheckedChange={toggleLanguage}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
