import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, Calendar } from "lucide-react";
import { MainTasks } from "./MainTasks";
import { PartnersTasks } from "./PartnersTasks";
import { DailyTasks } from "./DailyTasks";
import princeGif from "@/assets/Prince.gif";

interface TasksProps {
  coins: number;
  onReward: (amount: number, currency: 'coins' | 'pepe') => void;
  isEnglish?: boolean;
}

export function Tasks({
  coins,
  onReward,
  isEnglish = false
}: TasksProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'partners' | 'daily'>('main');

  const t = (arabic: string, english: string) => isEnglish ? english : arabic;

  const tabs = [
    { id: 'main', label: t('الأساسية', 'Main'), icon: Target },
    { id: 'partners', label: t('الشركاء', 'Partners'), icon: Users },
    { id: 'daily', label: t('اليومية', 'Daily'), icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Title and description */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('المهام', 'Tasks')}
        </h2>
        <p className="text-muted-foreground">
          {t('أكمل المهام واحصل على مكافآت', 'Complete tasks and get rewards')}
        </p>
      </div>
      
      {/* Prince image */}
      <div className="flex justify-center mb-6">
        <img 
          src={princeGif} 
          alt="Prince Animation" 
          className="w-48 h-auto rounded-lg shadow-lg"
        />
      </div>
      
      {/* Tab buttons */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Card 
              key={tab.id}
              className={`cursor-pointer transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary/50' 
                  : 'bg-gradient-to-br from-card/50 to-card border-border/50 hover:border-primary/30'
              }`}
              onClick={() => setActiveTab(tab.id as 'main' | 'partners' | 'daily')}
            >
              <CardContent className="p-4 text-center">
                <IconComponent className="w-6 h-6 mx-auto mb-2 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {tab.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'main' && (
          <MainTasks onReward={onReward} isEnglish={isEnglish} />
        )}
        {activeTab === 'partners' && (
          <PartnersTasks 
            onReward={onReward} 
            isEnglish={isEnglish}
          />
        )}
        {activeTab === 'daily' && (
          <DailyTasks onReward={onReward} isEnglish={isEnglish} />
        )}
      </div>
    </div>
  );
}