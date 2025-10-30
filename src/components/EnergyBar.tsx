import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Zap, Clock } from "lucide-react";

interface EnergyBarProps {
  currentEnergy: number;
  maxEnergy: number;
  rechargeRate: number;
  isEnglish?: boolean;
}

export function EnergyBar({ currentEnergy, maxEnergy, rechargeRate, isEnglish = false }: EnergyBarProps) {
  const energyPercentage = (currentEnergy / maxEnergy) * 100;
  const isLowEnergy = energyPercentage < 20;

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  return (
    <Card className="p-4 bg-gradient-to-r from-card to-secondary/30 border-border/50 shadow-soft rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-energy/20 to-accent/20 flex items-center justify-center">
            <Zap className={`w-4 h-4 ${isLowEnergy ? 'text-danger animate-shake' : 'text-energy'}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{t("الطاقة", "Energy")}</span>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {currentEnergy}/{maxEnergy}
        </span>
      </div>
      
      <div className="relative mb-3">
        <div className="w-full bg-secondary/50 rounded-xl h-3 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r from-energy to-accent rounded-xl transition-all duration-500 ease-out ${isLowEnergy ? 'animate-pulse' : ''}`}
            style={{ width: `${energyPercentage}%` }}
          />
        </div>
        {isLowEnergy && (
          <div className="absolute inset-0 bg-gradient-to-r from-danger/20 to-transparent rounded-xl animate-pulse" />
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-4 h-4 rounded-lg bg-accent/20 flex items-center justify-center">
          <Clock className="w-2.5 h-2.5 text-accent" />
        </div>
        <span>{t("إعادة شحن:", "Recharge:")} {rechargeRate}{t("/ثانية", "/sec")}</span>
      </div>
    </Card>
  );
}