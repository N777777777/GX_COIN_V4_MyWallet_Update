import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CryptoCardProps {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  icon?: string;
}

export function CryptoCard({
  name,
  symbol,
  price,
  change,
  changePercent,
  volume,
  marketCap,
  icon
}: CryptoCardProps) {
  const isPositive = change >= 0;
  const priceColor = isPositive ? "text-success" : "text-danger";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-lg font-bold">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${priceColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">السعر</span>
            <span className="text-lg font-bold text-foreground">
              ${price.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">التغيير (24س)</span>
            <span className={`text-sm font-medium ${priceColor}`}>
              {isPositive ? '+' : ''}${change.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">الحجم</span>
            <span className="text-sm text-foreground">{volume}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">القيمة السوقية</span>
            <span className="text-sm text-foreground">{marketCap}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}