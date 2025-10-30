import { useState, useEffect } from "react";
import { Loader2, Zap } from "lucide-react";
import coinLogo from "@/assets/1000006763.png";
import { supabase } from "@/integrations/supabase/client";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

export function LoadingScreen({ onLoadComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Initializing...");

  useEffect(() => {
    let loadedCount = 0;
    const totalSteps = 10; // Total loading steps

    const updateProgress = (step: number, text: string) => {
      loadedCount = step;
      const newProgress = Math.floor((loadedCount / totalSteps) * 100);
      setProgress(newProgress);
      setLoadingText(text);
    };

    const loadEverything = async () => {
      try {
        // Step 1: Initialize Telegram WebApp
        updateProgress(1, "Connecting to Telegram...");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 2: Check authentication
        updateProgress(2, "Verifying user...");
        const telegramData = (window as any).Telegram?.WebApp?.initDataUnsafe;
        
        if (telegramData?.user) {
          // Step 3: Load user data from database
          updateProgress(3, "Loading user data...");
          try {
            const { data, error } = await supabase
              .from('telegram_users')
              .select('*')
              .eq('telegram_id', telegramData.user.id.toString())
              .single();
            
            if (error) {
              console.warn('User data not found, will be created on first interaction');
            }
          } catch (err) {
            console.warn('Error loading user data:', err);
          }
        }
        
        // Step 4-5: Preload critical images
        updateProgress(4, "Loading assets...");
        const criticalImages = [
          coinLogo,
          "/assets/Prince.gif",
          "/assets/rocket.png"
        ];
        
        const imagePromises = criticalImages.map(src => 
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continue even if image fails
            img.src = src;
          })
        );
        
        await Promise.all(imagePromises);
        updateProgress(5, "Assets loaded...");
        
        // Step 6: Load fonts
        updateProgress(6, "Loading fonts...");
        await document.fonts.ready;
        
        // Step 7: Preload additional assets
        updateProgress(7, "Loading additional resources...");
        const additionalImages = [
          "/assets/star.BjMyq5OS.gif",
          "/assets/coin.png",
          "/assets/trophy.png"
        ];
        
        const additionalPromises = additionalImages.map(src => 
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          })
        );
        
        await Promise.all(additionalPromises);
        
        // Step 8: Initialize external SDKs
        updateProgress(8, "Initializing services...");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 9: Prepare app state
        updateProgress(9, "Preparing app...");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 10: Final checks
        updateProgress(10, "Almost ready!");
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Complete
        onLoadComplete();
        
      } catch (error) {
        console.error('Error during loading:', error);
        // Continue anyway to not block the user
        updateProgress(10, "Ready!");
        setTimeout(() => onLoadComplete(), 500);
      }
    };

    loadEverything();
  }, [onLoadComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-background via-card to-background overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with glow effect */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-50 animate-pulse"></div>
          <img 
            src={coinLogo} 
            alt="G COIN" 
            className="w-32 h-32 object-contain drop-shadow-2xl relative animate-scale-in"
          />
        </div>

        {/* Title with gradient */}
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-8 h-8 text-primary animate-pulse" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in bg-[length:200%_100%] animate-[gradient_3s_ease_infinite]">
            G COIN
          </h1>
          <Zap className="w-8 h-8 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>

        {/* Loading bar */}
        <div className="w-80 mb-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/50">
            {/* Progress bar with gradient */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500 ease-out rounded-full"
              style={{ 
                width: `${progress}%`,
                backgroundSize: "200% 100%"
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          
          {/* Loading text and percentage */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-muted-foreground font-medium">{loadingText}</span>
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
        </div>

        {/* Spinner */}
        <div className="mt-4 relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
          <Loader2 className="w-10 h-10 text-primary animate-spin relative" />
        </div>
      </div>
    </div>
  );
}
