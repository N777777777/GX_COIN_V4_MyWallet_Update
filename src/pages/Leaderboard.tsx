import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Users, ArrowLeft, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackNavigation } from "@/hooks/useBackNavigation";

interface LeaderboardUser {
  telegram_id: number;
  first_name: string;
  username: string;
  referral_count: number;
}

interface CoinsLeaderboardUser {
  telegram_id: number;
  first_name: string;
  username: string;
  total_balance: number;
}

export default function Leaderboard() {
  const { goBack } = useBackNavigation();
  const [referralLeaderboard, setReferralLeaderboard] = useState<LeaderboardUser[]>([]);
  const [coinsLeaderboard, setCoinsLeaderboard] = useState<CoinsLeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("referrals");

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      
      // Fetch referrals leaderboard
      const { data: referralData, error: referralError } = await supabase.rpc('get_referral_leaderboard', { 
        limit_count: 50 
      });

      if (referralError) {
        console.error('Error fetching referral leaderboard:', referralError);
      } else {
        setReferralLeaderboard(referralData || []);
      }

      // Fetch coins leaderboard
      const { data: coinsData, error: coinsError } = await supabase.rpc('get_coins_leaderboard', { 
        limit_count: 50 
      });

      if (coinsError) {
        console.error('Error fetching coins leaderboard:', coinsError);
      } else {
        setCoinsLeaderboard(coinsData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    if (position <= 3) {
      return "default";
    } else if (position <= 10) {
      return "secondary";
    } else {
      return "outline";
    }
  };

  const getCardStyle = (position: number) => {
    if (position <= 3) {
      return "bg-gradient-to-r from-primary/15 to-accent/15 border-primary/40";
    } else if (position <= 10) {
      return "bg-gradient-to-r from-secondary/10 to-muted/10 border-secondary/30";
    } else {
      return "bg-muted/30 border-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background mobile-container safe-top safe-bottom">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-to-r from-card via-card/90 to-card shadow-soft backdrop-blur-md -mx-3 px-3 sticky top-0 z-50">
        <div className="py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Leaderboard
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6">
        {loading ? (
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-pulse">Loading...</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="referrals" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Referrals
              </TabsTrigger>
              <TabsTrigger value="coins" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Coins
              </TabsTrigger>
            </TabsList>

            {/* Referrals Leaderboard */}
            <TabsContent value="referrals" className="space-y-3">
              {referralLeaderboard.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-muted-foreground">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No data available</p>
                      <p className="text-sm">Start inviting friends to appear on the leaderboard!</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                referralLeaderboard.map((user, index) => (
                  <Card
                    key={user.telegram_id.toString()}
                    className={`transition-all duration-200 ${getCardStyle(index + 1)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          {getRankIcon(index + 1)}
                          <Badge variant={getRankBadge(index + 1)} className="text-xs px-2">
                            #{index + 1}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">
                            {user.first_name || user.username || `User ${user.telegram_id}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.referral_count} referrals
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Badge 
                            variant="outline" 
                            className={`text-sm px-3 py-1 ${
                              index < 3 ? 'border-primary text-primary bg-primary/10' : ''
                            }`}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            {user.referral_count}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Coins Leaderboard */}
            <TabsContent value="coins" className="space-y-3">
              {coinsLeaderboard.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-muted-foreground">
                      <Coins className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No data available</p>
                      <p className="text-sm">Start earning coins to appear on the leaderboard!</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                coinsLeaderboard.map((user, index) => (
                  <Card
                    key={user.telegram_id.toString()}
                    className={`transition-all duration-200 ${getCardStyle(index + 1)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          {getRankIcon(index + 1)}
                          <Badge variant={getRankBadge(index + 1)} className="text-xs px-2">
                            #{index + 1}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">
                            {user.first_name || user.username || `User ${user.telegram_id}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Number(user.total_balance).toLocaleString()} coins
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Badge 
                            variant="outline" 
                            className={`text-sm px-3 py-1 ${
                              index < 3 ? 'border-primary text-primary bg-primary/10' : ''
                            }`}
                          >
                            <Coins className="w-4 h-4 mr-1" />
                            {Number(user.total_balance).toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}