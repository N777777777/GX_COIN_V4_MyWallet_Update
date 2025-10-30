import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Sparkles } from 'lucide-react';

interface CampaignCardProps {
  campaign: {
    id: string;
    campaign_name: string;
    payment_type: string;
    liquidity_amount: number;
    campaign_image_url: string;
    total_participants: number;
    status: string;
  };
  isEnglish?: boolean;
}

export function CampaignCard({
  campaign,
  isEnglish = false
}: CampaignCardProps) {
  const navigate = useNavigate();
  const t = (arabic: string, english: string) => isEnglish ? english : arabic;
  const [isHovered, setIsHovered] = useState(false);

  const handleCampaignClick = () => {
    navigate(`/campaign/${campaign.id}`);
  };

  const handleParticipateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/campaign/${campaign.id}`);
  };

  const isExpired = campaign.status === 'completed' || campaign.status === 'expired' || campaign.status === 'inactive';

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-2xl scale-105' : 'shadow-md'
      } ${isExpired ? 'opacity-60' : ''}`}
      onClick={handleCampaignClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`} />
      
      {/* Animated Border */}
      <div className={`absolute inset-0 border-2 rounded-lg transition-all duration-300 ${
        isHovered ? 'border-primary/50' : 'border-transparent'
      }`} />

      <CardContent className="relative p-6 space-y-4">
        {/* Header with Badges */}
        <div className="flex items-start justify-between">
          <Badge 
            variant="secondary" 
            className={`${
              campaign.payment_type === 'alpha' 
                ? 'bg-gradient-to-r from-primary to-accent text-white' 
                : 'bg-muted'
            }`}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {campaign.payment_type.toUpperCase()}
          </Badge>
          
          {isExpired && (
            <Badge variant="outline" className="bg-muted-foreground/10 text-muted-foreground">
              {t('منتهي', 'Expired')}
            </Badge>
          )}
          
          {!isExpired && (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              <Calendar className="w-3 h-3 mr-1" />
              {t('10 أيام', '10 days')}
            </Badge>
          )}
        </div>

        {/* Campaign Image */}
        {campaign.campaign_image_url && (
          <div className="flex justify-center py-4">
            <div className={`relative transition-transform duration-300 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl" />
              <img 
                src={campaign.campaign_image_url} 
                alt={campaign.campaign_name}
                className="relative w-32 h-32 object-cover rounded-full border-4 border-background shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Campaign Info */}
        <CardHeader className="p-0 space-y-2">
          <CardTitle className="text-xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {t('التوزيع المجاني', 'Free Distribution')}
          </CardTitle>
          <CardDescription className="text-center text-lg font-medium text-foreground">
            {campaign.campaign_name}
          </CardDescription>
        </CardHeader>

        {/* Participants Count */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/50 rounded-lg">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {campaign.total_participants || 0} {t('مشارك', 'participants')}
          </span>
        </div>

        {/* Participate Button */}
        <Button
          onClick={handleParticipateClick}
          disabled={isExpired}
          className={`w-full font-bold transition-all duration-300 ${
            isExpired 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : 'bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:scale-105 text-white'
          }`}
          size="lg"
        >
          {isExpired 
            ? t('منتهي', 'Expired')
            : t('المشاركة الآن', 'Participate Now')
          }
        </Button>
      </CardContent>
    </Card>
  );
}