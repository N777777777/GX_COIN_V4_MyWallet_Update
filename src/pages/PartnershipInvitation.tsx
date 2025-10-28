import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Users } from "lucide-react";

const PartnershipInvitation = () => {
  const [selectedManager, setSelectedManager] = useState("");
  const [invitedUsername, setInvitedUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const managers = [
    "@Ammar_1011",
    "@G_COIN_help_Support",
    "@S9_P6",
    "@d8ded",
    "@KINGCRYPTO771"
  ];

  const handleInvite = async () => {
    if (!selectedManager || !invitedUsername) {
      toast({
        title: "⚠️ خطأ",
        description: "يرجى اختيار المدير وكتابة يوزر المدعو",
        variant: "destructive"
      });
      return;
    }

    if (!invitedUsername.startsWith('@')) {
      toast({
        title: "⚠️ خطأ",
        description: "يجب أن يبدأ اليوزر بعلامة @",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_partnership_invitation', {
        p_manager_username: selectedManager,
        p_invited_username: invitedUsername
      });

      if (error) throw error;

      const result = data as any;

      if (result?.success) {
        // إرسال إشعار للمدعو عبر البوت
        await supabase.functions.invoke('send-partnership-invitation', {
          body: {
            invitation_id: result.invitation_id,
            invited_telegram_id: result.invited_telegram_id,
            manager_username: selectedManager
          }
        });

        toast({
          title: "✅ تم إرسال الدعوة",
          description: result.message
        });

        setSelectedManager("");
        setInvitedUsername("");
      } else {
        toast({
          title: "❌ فشل",
          description: result?.message || "حدث خطأ",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error inviting partner:', error);
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ أثناء إرسال الدعوة",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-6 h-6" />
              دعوة للشراكة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="manager">اختر المدير</Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدير" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">يوزر المدعو للشراكة</Label>
              <Input
                id="username"
                placeholder="@username"
                value={invitedUsername}
                onChange={(e) => setInvitedUsername(e.target.value)}
              />
            </div>

            <div className="bg-accent/20 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">نسب العمولة للشريك:</h3>
              <ul className="space-y-1 text-sm">
                <li>• 60% من عملات PEPE</li>
                <li>• 6% من عملات ALPHA</li>
                <li>• 10% من عملات G COIN V4</li>
              </ul>
            </div>

            <div className="bg-accent/20 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">نسب عمولة الإحالة للمديرين:</h3>
              <ul className="space-y-1 text-sm">
                <li>• 60% من عملات PEPE من إحالاتهم</li>
                <li>• 6% من عملات ALPHA من إحالاتهم</li>
                <li>• 10% من عملات G COIN V4 من إحالاتهم</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                * هذه النسب تطبق فقط على المديرين المحددين عند حصولهم على إحالات مباشرة
              </p>
            </div>

            <Button
              onClick={handleInvite}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              {isLoading ? "جارٍ الإرسال..." : "إرسال الدعوة"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnershipInvitation;