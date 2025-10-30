import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, CheckCircle, ArrowLeft, Zap, TrendingUp, Pickaxe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramData } from "@/hooks/useTelegramData";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { supabase } from "@/integrations/supabase/client";
interface MiningRecord {
  success: boolean;
  can_mine: boolean;
  total_gcoin_mined: number;
  gcoin_v4_balance: number;
  last_mining_date?: string;
  hours_until_next_mining: number;
  user_coins: number;
  user_alpha_coins: number;
  user_ton_balance: number;
}
export default function Mining() {
  const {
    toast
  } = useToast();
  const {
    telegramUser,
    updateUserStats,
    loading,
    refreshUserData
  } = useTelegramData();
  const {
    goBack
  } = useBackNavigation();
  const [miningRecord, setMiningRecord] = useState<MiningRecord | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [timeUntilNextMining, setTimeUntilNextMining] = useState<string>("");

  // Fetch mining record for the user
  const fetchMiningRecord = async () => {
    if (!telegramUser?.id) return;
    console.log('Mining: Fetching mining record for user:', telegramUser.id, 'Current Alpha coins:', telegramUser.bal_a6c3z); // alpha_coins (obfuscated)
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_user_mining_record', {
        p_telegram_user_id: telegramUser.id
      });
      if (error) {
        console.error('Mining: Error fetching mining record:', error);
        return;
      }
      if (data) {
        const record = data as unknown as MiningRecord;
        console.log('Mining: Got mining record:', record);
        setMiningRecord(record);
        if (!record.can_mine && record.hours_until_next_mining > 0) {
          const hours = Math.floor(record.hours_until_next_mining);
          const minutes = Math.floor(record.hours_until_next_mining % 1 * 60);
          setTimeUntilNextMining(`${hours} hours ${minutes} minutes`);
        } else {
          setTimeUntilNextMining("");
        }
      }
    } catch (error) {
      console.error('Mining: Error fetching mining record:', error);
    }
  };

  // Update counter every minute
  useEffect(() => {
    if (miningRecord && !miningRecord.can_mine && miningRecord.hours_until_next_mining > 0) {
      const interval = setInterval(() => {
        fetchMiningRecord();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [miningRecord]);
  useEffect(() => {
    console.log('Mining: telegramUser changed:', telegramUser?.bal_a6c3z); // alpha_coins (obfuscated)
    if (telegramUser) {
      fetchMiningRecord();
    }
  }, [telegramUser, telegramUser?.bal_a6c3z]); // alpha_coins (obfuscated)

  // Listen to real-time database updates
  useEffect(() => {
    if (!telegramUser?.id) return;
    const channel = supabase.channel('user-updates').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'telegram_users',
      filter: `id=eq.${telegramUser.id}`
    }, payload => {
      console.log('Mining: Real-time update received:', payload.new);
      if (refreshUserData) {
        refreshUserData();
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramUser?.id, refreshUserData]);

  // Execute mining operation
  const handleMining = async () => {
    console.log('Mining: Starting mining process, current alpha_coins:', telegramUser?.bal_a6c3z); // alpha_coins (obfuscated)
    if (!telegramUser || isMining) return;
    setIsMining(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('mine_gcoin', {
        p_telegram_user_id: telegramUser.id
      });
      if (error) {
        console.error('Mining error:', error);
        toast({
          title: "Mining Error",
          description: "An error occurred during mining, please try again",
          variant: "destructive"
        });
        return;
      }
      if (data) {
        const result = data as unknown as {
          success: boolean;
          message?: string;
        };
        if (result.success) {
          console.log('Mining: Success! Mining result:', result);
          await refreshUserData();
          await fetchMiningRecord();
          toast({
            title: "⛏️ Mining Successful!",
            description: "🎉 You received 1 G COIN V4 for 10 Alpha coins",
            variant: "success" as any
          });
        } else {
          toast({
            title: "Mining Failed",
            description: result.message || "An unexpected error occurred",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Mining error:', error);
      toast({
        title: "Mining Error",
        description: "An error occurred during mining, please try again",
        variant: "destructive"
      });
    } finally {
      setIsMining(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={goBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-center">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (!telegramUser) {
    return <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={goBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-center text-destructive">
                Error loading user data
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={goBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Pickaxe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">G COIN V4 Mine</h1>
          <p className="text-muted-foreground mt-2">Earn G Coins every 24 hours</p>
        </div>

        {/* Mining Cost & Reward Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cost Card */}
          <Card className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                10
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 font-semibold">
                Mining Cost
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                Alpha Coins
              </div>
            </CardContent>
          </Card>

          {/* Reward Card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                1
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 font-semibold">
                Mining Reward
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                G COIN V4
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Balances */}
        <div className="grid grid-cols-2 gap-4">
          {/* G COIN V4 Balance */}
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {telegramUser?.bal_g4v7y?.toFixed(2) || "0.00"} {/* gcoin_v4_balance (obfuscated) */}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                G COIN V4 Balance
              </div>
            </CardContent>
          </Card>

          {/* Alpha Coins Balance */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {telegramUser?.bal_a6c3z?.toFixed(0) || "0"} {/* alpha_coins (obfuscated) */}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Alpha Coins
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mining Info */}
        

        {/* Main Mining Card */}
        <Card className="w-full bg-gradient-to-br from-card to-muted/50 border-2 border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Zap className="h-7 w-7 text-yellow-500" />
              Mining Operation
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Mining Button or Countdown */}
            {miningRecord?.can_mine ? <Button onClick={handleMining} disabled={isMining || (telegramUser?.bal_a6c3z || 0) < 10} className="w-full h-12 text-base font-bold bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 shadow-lg transform transition-all duration-200 hover:scale-105" size="lg">
                {isMining ? <>
                    <Zap className="mr-2 h-6 w-6 animate-pulse" />
                    Mining...
                  </> : (telegramUser?.bal_a6c3z || 0) < 10 ? <> {/* alpha_coins (obfuscated) */}
                    <Coins className="mr-2 h-6 w-6" />
                    You need 10 Alpha coins to mine
                  </> : <>
                    <Pickaxe className="mr-2 h-6 w-6" />
                    Mine for 10 ALPHA
                  </>}
              </Button> : <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600 text-xl">
                  <CheckCircle className="h-8 w-8" />
                  <span className="font-bold">Mined Successfully Today! 🎉</span>
                </div>
                
                {timeUntilNextMining && <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                        <Clock className="h-5 w-5" />
                        <span className="font-semibold">
                          Next mining in: {timeUntilNextMining}
                        </span>
                      </div>
                    </CardContent>
                  </Card>}
                
                
              </div>}
          </CardContent>
        </Card>

        {/* Mining Tips */}
        
      </div>
    </div>;
}