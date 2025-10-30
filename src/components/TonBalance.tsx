import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
export const TonBalance = () => {
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const {
    telegramUser
  } = useTelegramData();
  useEffect(() => {
    const fetchTonBalance = async () => {
      if (!telegramUser?.id) {
        setLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('telegram_users').select('ton_balance').eq('id', telegramUser.id).single();
        if (error) {
          console.error('Error fetching TON balance:', error);
        } else {
          setTonBalance(data?.ton_balance || 0);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTonBalance();

    // إعداد الاستماع للتحديثات الفورية
    if (telegramUser?.id) {
      const channel = supabase.channel('ton-balance-changes').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'telegram_users',
        filter: `id=eq.${telegramUser.id}`
      }, payload => {
        if (payload.new.ton_balance !== undefined) {
          setTonBalance(payload.new.ton_balance);
        }
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [telegramUser?.id]);
  if (loading) {
    return <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>;
  }
  return;
};