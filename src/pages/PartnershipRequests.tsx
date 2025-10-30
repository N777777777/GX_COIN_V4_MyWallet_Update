import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramData } from "@/hooks/useTelegramData";
import { ArrowLeft, CheckCircle, XCircle, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBackNavigation } from "@/hooks/useBackNavigation";

interface PartnershipInvitation {
  id: string;
  manager_telegram_username: string;
  invited_telegram_username: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  invited_user_id: string;
  invited_telegram_id: number;
  manager_user_id: string;
  updated_at: string;
}

interface PartnerCommission {
  pepe_commission_rate: number;
  alpha_commission_rate: number;
  gcoin_v4_commission_rate: number;
}

const PartnershipRequests = () => {
  const [invitations, setInvitations] = useState<PartnershipInvitation[]>([]);
  const [commissions, setCommissions] = useState<Record<string, PartnerCommission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { telegramUser } = useTelegramData();
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();

  useEffect(() => {
    fetchInvitations();
  }, [telegramUser]);

  const fetchInvitations = async () => {
    if (!telegramUser?.username) return;

    try {
      const { data, error } = await supabase
        .from('partnership_invitations')
        .select('*')
        .eq('invited_telegram_username', `@${telegramUser.username}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);

      // جلب معدلات العمولة للشراكات المقبولة
      if (data && data.length > 0) {
        const acceptedInvitations = data.filter(inv => inv.status === 'accepted');
        if (acceptedInvitations.length > 0) {
          const userIds = acceptedInvitations.map(inv => inv.invited_user_id);
          const { data: partnersData, error: partnersError } = await supabase
            .from('partners')
            .select('telegram_user_id, pepe_commission_rate, alpha_commission_rate, gcoin_v4_commission_rate')
            .in('telegram_user_id', userIds);

          if (!partnersError && partnersData) {
            const commissionsMap: Record<string, PartnerCommission> = {};
            partnersData.forEach(partner => {
              commissionsMap[partner.telegram_user_id] = {
                pepe_commission_rate: partner.pepe_commission_rate,
                alpha_commission_rate: partner.alpha_commission_rate,
                gcoin_v4_commission_rate: partner.gcoin_v4_commission_rate
              };
            });
            setCommissions(commissionsMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "❌ Error",
        description: "An error occurred while fetching invitations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-6 h-6" />
              Partnership Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading...</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No partnership invitations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">From Manager</p>
                            <p className="text-lg font-semibold">{invitation.manager_telegram_username}</p>
                          </div>
                          {getStatusBadge(invitation.status)}
                        </div>

                        {/* Commission Rates */}
                        {invitation.status === 'accepted' && commissions[invitation.invited_user_id] && (
                          <div className="bg-accent/20 p-3 rounded-lg space-y-2">
                            <h4 className="font-semibold text-sm">Your Commission Rates:</h4>
                            <ul className="space-y-1 text-sm">
                              <li className="flex items-center justify-between">
                                <span>PEPE:</span>
                                <span className="font-bold text-green-500">{commissions[invitation.invited_user_id].pepe_commission_rate}%</span>
                              </li>
                              <li className="flex items-center justify-between">
                                <span>ALPHA:</span>
                                <span className="font-bold text-blue-500">{commissions[invitation.invited_user_id].alpha_commission_rate}%</span>
                              </li>
                              <li className="flex items-center justify-between">
                                <span>G COIN V4:</span>
                                <span className="font-bold text-yellow-500">{commissions[invitation.invited_user_id].gcoin_v4_commission_rate}%</span>
                              </li>
                            </ul>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground">
                          <p>Invitation Date: {formatDate(invitation.created_at)}</p>
                          {invitation.responded_at && (
                            <p>Response Date: {formatDate(invitation.responded_at)}</p>
                          )}
                        </div>

                        {/* Pending Actions Info */}
                        {invitation.status === 'pending' && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-sm text-blue-500">
                              💡 You will receive a message in the bot to accept or reject
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnershipRequests;
