import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import starGif from "@/assets/star.BjMyq5OS.gif";
const PremiumPurchase = () => {
  const {
    goBack
  } = useBackNavigation();
  const isEnglish = true; // Changed to English
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;
  return <div className="min-h-screen bg-background mobile-container safe-top safe-bottom">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-to-r from-card via-card/90 to-card shadow-soft backdrop-blur-md -mx-3 px-3 sticky top-0 z-50">
        <div className="py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              {t("شراء المميز", "Purchase Premium")}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <img src={starGif} alt="Coming Soon" className="w-32 h-32 object-contain relative animate-bounce mx-auto" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('قريباً', 'Coming Soon')}
            </h1>
            
          </div>

          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
        </div>
      </main>
    </div>;
};
export default PremiumPurchase;