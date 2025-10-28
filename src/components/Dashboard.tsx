import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  Bell, 
  Settings,
  Zap,
  DollarSign,
  Activity,
  Users
} from "lucide-react";
import { CryptoCard } from "./CryptoCard";
import { Portfolio } from "./Portfolio";
import AlphaPlatform from "./AlphaPlatform";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const cryptoData = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      price: 43250,
      change: 1250,
      changePercent: 2.98,
      volume: "$28.5B",
      marketCap: "$845.2B",
      icon: "₿"
    },
    {
      name: "Ethereum",
      symbol: "ETH", 
      price: 2680,
      change: -85,
      changePercent: -3.07,
      volume: "$12.3B",
      marketCap: "$322.1B",
      icon: "Ξ"
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      price: 315,
      change: 12,
      changePercent: 3.96,
      volume: "$1.2B",
      marketCap: "$48.5B",
      icon: "⚡"
    },
    {
      name: "Cardano",
      symbol: "ADA",
      price: 0.48,
      change: 0.03,
      changePercent: 6.67,
      volume: "$890M",
      marketCap: "$17.2B",
      icon: "♠"
    }
  ];

  const marketStats = [
    {
      title: "Total Market Cap",
      value: "$2.1T",
      change: "+2.4%",
      icon: DollarSign,
      positive: true
    },
    {
      title: "Trading Volume (24h)",
      value: "$89.2B",
      change: "+15.6%",
      icon: Activity,
      positive: true
    },
    {
      title: "Bitcoin Dominance",
      value: "50.2%",
      change: "-0.8%",
      icon: TrendingUp,
      positive: false
    },
    {
      title: "Active Coins",
      value: "2,847",
      change: "+12",
      icon: Users,
      positive: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">CryptoBot</h1>
                <p className="text-sm text-muted-foreground">بوت التداول الذكي</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="animate-pulse-glow">
                <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                متصل
              </Badge>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">لمحة عامة</TabsTrigger>
            <TabsTrigger value="portfolio">المحفظة</TabsTrigger>
            <TabsTrigger value="trading">التداول</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Market Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {marketStats.map((stat, index) => (
                <Card key={index} className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className={`text-sm font-medium ${stat.positive ? 'text-success' : 'text-danger'}`}>
                          {stat.change}
                        </p>
                      </div>
                      <stat.icon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Top Cryptocurrencies */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Top Cryptocurrencies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cryptoData.map((crypto, index) => (
                  <CryptoCard key={index} {...crypto} />
                ))}
              </div>
            </div>

            {/* Market Alerts */}
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bell className="w-5 h-5" />
                  Market Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-foreground">البيتكوين يتجاوز $43,000</p>
                      <p className="text-sm text-muted-foreground">منذ 5 دقائق</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                    <Activity className="w-5 h-5 text-warning" />
                    <div>
                      <p className="font-medium text-foreground">حجم تداول عالي في ETH</p>
                      <p className="text-sm text-muted-foreground">منذ 12 دقيقة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-danger/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-danger" />
                    <div>
                      <p className="font-medium text-foreground">انخفاض في أسعار الـ Altcoins</p>
                      <p className="text-sm text-muted-foreground">منذ 18 دقيقة</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Portfolio />
          </TabsContent>

          <TabsContent value="trading">
            <AlphaPlatform />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}