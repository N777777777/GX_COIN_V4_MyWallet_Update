import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Zap, TrendingUp, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  currentLevel: number;
  maxLevel: number;
  effect: string;
  icon: React.ReactNode;
  color: string;
}

interface UpgradeShopProps {
  coins: number;
  onPurchase: (upgradeId: string, cost: number) => void;
}

export function UpgradeShop({ coins, onPurchase }: UpgradeShopProps) {
  const { toast } = useToast();
  
  const upgrades: Upgrade[] = [
    {
      id: "tap-power",
      name: "قوة النقر",
      description: "زيادة عدد النقاط لكل نقرة",
      price: 100,
      currentLevel: 1,
      maxLevel: 50,
      effect: "+1 نقطة لكل نقرة",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-success"
    },
    {
      id: "energy-capacity",
      name: "سعة الطاقة",
      description: "زيادة الحد الأقصى للطاقة",
      price: 250,
      currentLevel: 1,
      maxLevel: 25,
      effect: "+50 طاقة",
      icon: <Zap className="w-5 h-5" />,
      color: "text-energy"
    },
    {
      id: "energy-recharge",
      name: "إعادة شحن الطاقة",
      description: "سرعة إعادة شحن الطاقة",
      price: 500,
      currentLevel: 1,
      maxLevel: 20,
      effect: "+1 طاقة/ثانية",
      icon: <Zap className="w-5 h-5" />,
      color: "text-primary"
    },
    {
      id: "auto-clicker",
      name: "النقر التلقائي",
      description: "نقر تلقائي كل ثانية",
      price: 1000,
      currentLevel: 0,
      maxLevel: 10,
      effect: "نقر تلقائي",
      icon: <Star className="w-5 h-5" />,
      color: "text-warning"
    }
  ];

  const handlePurchase = (upgrade: Upgrade) => {
    if (coins >= upgrade.price) {
      onPurchase(upgrade.id, upgrade.price);
      toast({
        title: "تم الشراء!",
        description: `تم ترقية ${upgrade.name} بنجاح`,
        variant: "default",
      });
    } else {
      toast({
        title: "رصيد غير كافي",
        description: `تحتاج ${upgrade.price - coins} نقطة إضافية`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShoppingCart className="w-5 h-5" />
          متجر الترقيات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upgrades.map((upgrade) => (
          <div
            key={upgrade.id}
            className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`${upgrade.color}`}>
                {upgrade.icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{upgrade.name}</h4>
                <p className="text-sm text-muted-foreground">{upgrade.description}</p>
                <p className="text-xs text-success">{upgrade.effect}</p>
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {upgrade.price.toLocaleString()} 💰
                </span>
              </div>
              
              <Button
                size="sm"
                onClick={() => handlePurchase(upgrade)}
                disabled={coins < upgrade.price}
                className="bg-primary hover:bg-primary/90"
              >
                شراء
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}