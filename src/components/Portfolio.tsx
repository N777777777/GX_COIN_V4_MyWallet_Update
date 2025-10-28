import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowUpDown } from "lucide-react";

interface PortfolioItem {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  price: number;
  change: number;
  changePercent: number;
  value: number;
}

export function Portfolio() {
  const [portfolio] = useState<PortfolioItem[]>([
    {
      id: "1",
      name: "Bitcoin",
      symbol: "BTC",
      amount: 0.5,
      price: 43250,
      change: 1250,
      changePercent: 2.98,
      value: 21625
    },
    {
      id: "2",
      name: "Ethereum",
      symbol: "ETH",
      amount: 5.2,
      price: 2680,
      change: -85,
      changePercent: -3.07,
      value: 13936
    },
    {
      id: "3",
      name: "Binance Coin",
      symbol: "BNB",
      amount: 45,
      price: 315,
      change: 12,
      changePercent: 3.96,
      value: 14175
    }
  ]);

  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const totalChange = portfolio.reduce((sum, item) => sum + (item.change * item.amount), 0);
  const totalChangePercent = (totalChange / (totalValue - totalChange)) * 100;

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="w-5 h-5" />
            إجمالي المحفظة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                ${totalValue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">القيمة الإجمالية</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">التغيير اليوم</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {totalChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
                <p className={`text-2xl font-bold ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalChangePercent.toFixed(2)}%
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Percentage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Items */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Cryptocurrencies</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Coin
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Trade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
                    {item.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.amount} {item.symbol}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${item.value.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={item.change >= 0 ? "default" : "destructive"}
                      className={`text-xs ${item.change >= 0 ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}
                    >
                      {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}