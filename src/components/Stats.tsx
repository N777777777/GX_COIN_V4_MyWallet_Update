import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Target, 
  Zap, 
  TrendingUp, 
  Clock,
  Award
} from "lucide-react";

interface StatsProps {
  totalAlphaCoins: number; // Renamed from totalCoins to totalAlphaCoins
  totalTaps: number;
  coinsPerTap: number;
  energy: number;
  maxEnergy: number;
  level: number;
  achievements: number;
  playTime: number;
}

export function Stats({ 
  totalAlphaCoins, // Renamed from totalCoins to totalAlphaCoins
  totalTaps, 
  coinsPerTap, 
  energy, 
  maxEnergy, 
  level, 
  achievements, 
  playTime 
}: StatsProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}س ${minutes}د`;
    } else if (minutes > 0) {
      return `${minutes}د ${secs}ث`;
    } else {
      return `${secs}ث`;
    }
  };

  const stats = [
    {
      title: "Alpha Coins",
      value: totalAlphaCoins.toLocaleString(),
      icon: Trophy,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "مجموع النقرات",
      value: totalTaps.toLocaleString(),
      icon: Target,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "نقاط/نقرة",
      value: coinsPerTap.toString(),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "الطاقة",
      value: `${energy}/${maxEnergy}`,
      icon: Zap,
      color: "text-energy",
      bgColor: "bg-energy/10"
    },
    {
      title: "المستوى",
      value: level.toString(),
      icon: Award,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "وقت اللعب",
      value: formatTime(playTime),
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10"
    }
  ];

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Trophy className="w-5 h-5" />
          الإحصائيات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${stat.bgColor} border border-border/50`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <Badge variant="outline" className="text-xs">
                  {stat.value}
                </Badge>
              </div>
              <h4 className="text-sm font-medium text-foreground">{stat.title}</h4>
            </div>
          ))}
        </div>
        
        {/* Achievements */}
        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">الإنجازات</span>
            <Badge variant="secondary">
              {achievements}/20
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}