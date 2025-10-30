import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Coins } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface CampaignCreationDialogProps {
  isEnglish?: boolean;
  pepeBalance: number;
  tonBalance: number;
  telegramId?: number;
}

export function CampaignCreationDialog({ 
  isEnglish = false, 
  pepeBalance, 
  tonBalance, 
  telegramId 
}: CampaignCreationDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;
  
  const minimumTonRequired = 10;
  
  const canCreateWithTon = tonBalance >= minimumTonRequired;
  const canCreateCampaign = canCreateWithTon;

  const handleCreateCampaign = () => {
    navigate(`/campaigns/create?payment=ton`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full py-6 text-lg font-semibold"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('إنشاء كامبين', 'Create Campaign')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {t('إنشاء كامبين بـ TON', 'Create Campaign with TON')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-primary">
                {t('رصيد TON', 'TON Balance')}
              </p>
              {canCreateWithTon ? (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                  {t('كافي', 'Sufficient')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/20 text-red-700 border-red-500/30">
                  {t('غير كافي', 'Insufficient')}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-primary mb-1">
              {tonBalance.toFixed(2)} TON
            </p>
            <p className="text-xs text-muted-foreground">
              {t('المطلوب: 10 TON', 'Required: 10 TON')}
            </p>
          </div>
          
          <Button 
            onClick={handleCreateCampaign}
            disabled={!canCreateWithTon}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            <Coins className="w-4 h-4 mr-2" />
            {t('إنشاء بـ TON', 'Create with TON')}
          </Button>
          
          {!canCreateCampaign && (
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t('تحتاج إلى رصيد TON كافي لإنشاء كامبين', 'You need sufficient TON balance to create a campaign')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}