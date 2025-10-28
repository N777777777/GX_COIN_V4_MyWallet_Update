import { useState, useCallback } from "react";
import { FloatingScore } from "./FloatingScore";

interface TappableCoinProps {
  onTap: () => void;
  coinsPerTap: number;
  disabled?: boolean;
}

interface FloatingScoreData {
  id: string;
  score: number;
  x: number;
  y: number;
}

export function TappableCoin({ onTap, coinsPerTap, disabled = false }: TappableCoinProps) {
  const [floatingScores, setFloatingScores] = useState<FloatingScoreData[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const handleTap = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add floating score
    const newScore: FloatingScoreData = {
      id: Date.now().toString(),
      score: coinsPerTap,
      x,
      y
    };
    
    setFloatingScores(prev => [...prev, newScore]);
    setIsPressed(true);
    
    setTimeout(() => setIsPressed(false), 100);
    
    onTap();
  }, [onTap, coinsPerTap, disabled]);

  const handleScoreComplete = useCallback((id: string) => {
    setFloatingScores(prev => prev.filter(score => score.id !== id));
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`
          relative w-64 h-64 md:w-80 md:h-80 rounded-full cursor-pointer select-none
          bg-gradient-to-br from-primary/90 via-primary to-primary/80 
          border-4 border-primary/30 shadow-[0_0_40px_rgba(255,215,0,0.6)]
          transition-all duration-150 ease-out overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_60px_rgba(255,215,0,0.8)] hover:scale-105'}
          ${isPressed ? 'scale-95 shadow-[0_0_80px_rgba(255,215,0,1)]' : ''}
          ${!disabled ? 'active:scale-90' : ''}
        `}
        onClick={handleTap}
        onMouseDown={() => !disabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
      >
        {/* Bot Logo في وسط العملة */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <img 
              src="/lovable-uploads/9efaa780-0ca3-45bd-84eb-babe8bfa63b4.png" 
              alt="G COIN" 
              className="w-full h-full object-cover rounded-full"
            />
            {/* تأثير إضاءة خلف الصورة */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-full blur-xl -z-10"></div>
          </div>
        </div>
        
        {/* تأثيرات بصرية */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-spin-slow opacity-40" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        
        {/* Ripple effect */}
        <div className={`absolute inset-0 rounded-full border-2 border-primary/50 ${isPressed ? 'animate-ping' : ''}`} />
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse" />
      </div>
      
      {/* Floating scores */}
      {floatingScores.map(score => (
        <FloatingScore
          key={score.id}
          {...score}
          onComplete={handleScoreComplete}
        />
      ))}
    </div>
  );
}