import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Send } from "lucide-react";

export default function TelegramOnly() {
  const handleOpenTelegram = () => {
    window.open('https://t.me/G3_COIN_V3_BOT', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50 shadow-2xl">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              تطبيق Telegram فقط
            </h1>
            <h2 className="text-xl font-semibold text-muted-foreground">
              Telegram App Only
            </h2>
          </div>

          {/* Description */}
          <div className="space-y-3 text-muted-foreground">
            <p className="leading-relaxed">
              هذا التطبيق يعمل فقط من خلال Telegram
            </p>
            <p className="leading-relaxed">
              This app only works through Telegram
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={handleOpenTelegram}
              size="lg"
              className="w-full gap-2 text-lg"
            >
              <Send className="w-5 h-5" />
              افتح في Telegram
              <span className="mx-2">|</span>
              Open in Telegram
            </Button>
          </div>

          {/* Bot Link */}
          <div className="pt-2">
            <a 
              href="https://t.me/G3_COIN_V3_BOT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              @G3_COIN_V3_BOT
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}