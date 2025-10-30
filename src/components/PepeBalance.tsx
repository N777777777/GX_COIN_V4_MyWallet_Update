import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, TrendingUp, Users, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PepeWithdrawalDialog } from "./PepeWithdrawalDialog";
interface PepeBalanceProps {
  telegramId?: number;
}
export function PepeBalance({
  telegramId
}: PepeBalanceProps) {
  const {
    toast
  } = useToast();
  const [pepeBalance, setPepeBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (telegramId) {
      loadPepeBalances();
    }
  }, [telegramId]);
  const loadPepeBalances = async () => {
    if (!telegramId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('telegram_users').select('bal_x7k9m').eq('telegram_id', telegramId).single();
      if (error) throw error;
      if (data) {
        setPepeBalance(data.bal_x7k9m || 0); // pepe_balance (obfuscated)
      }
    } catch (error) {
      console.error('Error loading PEPE balance:', error);
    }
  };
  const handleWithdrawalSuccess = () => {
    loadPepeBalances();
  };
  return <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <TrendingUp className="w-5 h-5" />
        رصيد PEPE
      </CardTitle>
      <p className="text-sm text-green-600/80 dark:text-green-400/80">
        رصيد PEPE الإجمالي
      </p>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {pepeBalance.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">عملة PEPE</p>
        </div>

        <div className="w-full">
          <PepeWithdrawalDialog telegramId={telegramId} pepeBalance={pepeBalance} onWithdrawalSuccess={handleWithdrawalSuccess} />
        </div>
      </div>
    </CardContent>
  </Card>;
}