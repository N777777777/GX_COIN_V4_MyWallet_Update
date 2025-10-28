import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowRightLeft, Brain, Coins, Trophy } from "lucide-react";
import { TonBalance } from "./TonBalance";
import { useNavigate } from "react-router-dom";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
export default function WalletComponent() {
  const navigate = useNavigate();
  const {
    goBack
  } = useBackNavigation();
  const {
    telegramUser
  } = useTelegramData();
  const [balances, setBalances] = useState({
    pepe: 0,
    gcoin_v4: 0,
    alpha_coins: 0
  });
  useEffect(() => {
    const fetchBalances = async () => {
      if (!telegramUser?.id) return;
      try {
        const {
          data,
          error
        } = await supabase.from('telegram_users').select('bal_x7k9m, bal_g4v7y, bal_a6c3z').eq('id', telegramUser.id).single();
        if (data) {
          setBalances({
            pepe: data.bal_x7k9m || 0,
            // pepe_balance (obfuscated)
            gcoin_v4: data.bal_g4v7y || 0,
            // gcoin_v4_balance (obfuscated)
            alpha_coins: data.bal_a6c3z || 0 // alpha_coins (obfuscated)
          });
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };
    fetchBalances();

    // Real-time updates
    if (telegramUser?.id) {
      const channel = supabase.channel('wallet-balances').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'telegram_users',
        filter: `id=eq.${telegramUser.id}`
      }, (payload: any) => {
        if (payload.new) {
          setBalances({
            pepe: payload.new.bal_x7k9m || 0,
            // pepe_balance (obfuscated)
            gcoin_v4: payload.new.bal_g4v7y || 0,
            // gcoin_v4_balance (obfuscated)
            alpha_coins: payload.new.bal_a6c3z || 0 // alpha_coins (obfuscated)
          });
        }
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [telegramUser?.id]);
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Back Button */}
        
        
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
          
        </div>

        {/* TON Balance */}
        <TonBalance />

        {/* Balances Overview */}
        <Card className="bg-gradient-to-br from-card/50 to-card border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              My Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PEPE Balance */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">PEPE</p>
                  
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">
                {balances.pepe.toLocaleString()}
              </p>
            </div>

            {/* G COIN V4 Balance */}
            

            {/* Alpha Coins Balance */}
            
          </CardContent>
        </Card>

        {/* Mining Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Mining
            </CardTitle>
          </CardHeader>
          <CardContent>
            
            <Button className="w-full" onClick={() => navigate('/mining')}>
              Go to Mining
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Connection Section */}
        

        {/* PEPE to G COIN Swap */}
        

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/leaderboard')}>
              View Leaderboard
            </Button>
          </CardContent>
        </Card>

        {/* Partnership Requests */}
        
      </div>
    </div>;
}