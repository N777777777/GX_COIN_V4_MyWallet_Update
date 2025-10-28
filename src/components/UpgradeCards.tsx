import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, Clock, Lock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// تم إزالة DailyPuzzle

interface UpgradeCard {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
  hourlyProfit: number;
  icon: React.ReactNode;
  category: string;
  requirement?: {
    type: string;
    value: number;
  };
}

interface UpgradeCardsProps {
  userCoins: number;
  onUpgrade: (cardId: string, cost: number) => Promise<boolean>;
  telegramId?: number;
}

export function UpgradeCards({ userCoins, onUpgrade, telegramId }: UpgradeCardsProps) {
  const { toast } = useToast();
  const [cards, setCards] = useState<UpgradeCard[]>([
    {
      id: "mining-rig",
      name: "جهاز التعدين",
      description: "جهاز تعدين أساسي لكسب عملات G COIN",
      level: 1,
      cost: 50,
      hourlyProfit: 5,
      icon: <Zap className="w-5 h-5" />,
      category: "تعدين"
    },
    {
      id: "energy-generator",
      name: "مولد الطاقة",
      description: "يزيد من كفاءة التعدين بالطاقة المتجددة",
      level: 1,
      cost: 100,
      hourlyProfit: 8,
      icon: <Clock className="w-5 h-5" />,
      category: "طاقة"
    },
    {
      id: "mining-farm",
      name: "مزرعة التعدين",
      description: "مزرعة كاملة من أجهزة التعدين المتقدمة",
      level: 1,
      cost: 500,
      hourlyProfit: 25,
      icon: <Coins className="w-5 h-5" />,
      category: "تعدين",
      requirement: {
        type: "card_level",
        value: 5
      }
    },
    {
      id: "quantum-processor",
      name: "معالج كمي",
      description: "تقنية متقدمة للتعدين عالي السرعة",
      level: 1,
      cost: 1000,
      hourlyProfit: 50,
      icon: <Plus className="w-5 h-5" />,
      category: "تقنية",
      requirement: {
        type: "total_profit",
        value: 100
      }
    }
  ]);

  const [totalHourlyProfit, setTotalHourlyProfit] = useState(0);
  const [magicCurrency, setMagicCurrency] = useState(0);

  useEffect(() => {
    // حساب إجمالي الربح بالساعة
    const total = cards.reduce((sum, card) => sum + (card.hourlyProfit * card.level), 0);
    setTotalHourlyProfit(total);
    
    // تحميل عملة البطاقات السحرية من localStorage
    if (telegramId) {
      const savedMagicCurrency = localStorage.getItem(`magic_currency_${telegramId}`);
      setMagicCurrency(savedMagicCurrency ? parseInt(savedMagicCurrency) : 0);
    }
  }, [cards, telegramId]);

  const handleUpgrade = async (card: UpgradeCard) => {
    if (magicCurrency < card.cost) {
      toast({
        title: "عملة غير كافية!",
        description: `تحتاج إلى ${card.cost} بطاقة سحرية للترقية`,
        variant: "destructive"
      });
      return;
    }

    // التحقق من المتطلبات
    if (card.requirement) {
      const meetsRequirement = checkRequirement(card.requirement);
      if (!meetsRequirement) {
        toast({
          title: "متطلبات غير مكتملة",
          description: getRequirementText(card.requirement),
          variant: "destructive"
        });
        return;
      }
    }

    // خصم التكلفة من عملة البطاقات السحرية
    const newMagicCurrency = magicCurrency - card.cost;
    setMagicCurrency(newMagicCurrency);
    
    if (telegramId) {
      localStorage.setItem(`magic_currency_${telegramId}`, newMagicCurrency.toString());
    }

    setCards(prev => prev.map(c => 
      c.id === card.id 
        ? { 
            ...c, 
            level: c.level + 1,
            cost: Math.floor(c.cost * 1.5), // زيادة التكلفة بنسبة 50%
            hourlyProfit: Math.floor(c.hourlyProfit * 1.2) // زيادة الربح بنسبة 20%
          }
        : c
    ));

    toast({
      title: "تمت الترقية بنجاح!",
      description: `تم ترقية ${card.name} بنجاح`,
      variant: "default"
    });
  };

  const checkRequirement = (requirement: { type: string; value: number }) => {
    switch (requirement.type) {
      case "card_level":
        return cards.some(card => card.level >= requirement.value);
      case "total_profit":
        return totalHourlyProfit >= requirement.value;
      default:
        return true;
    }
  };

  const getRequirementText = (requirement: { type: string; value: number }) => {
    switch (requirement.type) {
      case "card_level":
        return `يتطلب بطاقة مطورة`;
      case "total_profit":
        return `يتطلب ربح إجمالي ${requirement.value} عملة/ساعة`;
      default:
        return "";
    }
  };

  const canAfford = (cost: number) => magicCurrency >= cost;
  const meetsRequirements = (card: UpgradeCard) => {
    if (!card.requirement) return true;
    return checkRequirement(card.requirement);
  };

  return (
    <div className="space-y-4">
      {/* عملة البطاقات السحرية */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">بطاقاتي</p>
              <p className="text-2xl font-bold text-orange-600">{magicCurrency}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* إجمالي الربح بالساعة */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">الربح بالساعة</p>
              <p className="text-2xl font-bold text-primary">{totalHourlyProfit}</p>
            </div>
            <Coins className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* بطاقات الترقية */}
      <div className="grid grid-cols-1 gap-4">
        {cards.map((card) => {
          const affordable = canAfford(card.cost);
          const requirements = meetsRequirements(card);
          const isLocked = !requirements;

          return (
            <Card key={card.id} className={`transition-all duration-300 ${
              isLocked ? 'opacity-50 bg-muted/50' :
              affordable ? 'hover:shadow-md border-primary/20' :
              'opacity-75'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      isLocked ? 'bg-muted' : 'bg-primary/10'
                    }`}>
                      {isLocked ? <Lock className="w-5 h-5 text-muted-foreground" /> : card.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{card.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {card.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span>الربح/ساعة:</span>
                    <span className="font-medium text-primary">+{card.hourlyProfit}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>التكلفة:</span>
                    <span className="font-medium text-orange-600">{card.cost} بطاقة سحرية</span>
                  </div>
                </div>

                {card.requirement && !requirements && (
                  <p className="text-xs text-destructive mb-2">
                    {getRequirementText(card.requirement)}
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  variant={affordable && requirements ? "default" : "outline"}
                  disabled={!affordable || !requirements}
                  onClick={() => handleUpgrade(card)}
                >
                  {isLocked ? "مغلق" :
                   !affordable ? "بطاقات سحرية غير كافية" :
                   "ترقية"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}