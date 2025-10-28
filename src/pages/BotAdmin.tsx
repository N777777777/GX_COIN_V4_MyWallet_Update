import { TelegramBotAdmin } from '@/components/TelegramBotAdmin';

export default function BotAdmin() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <TelegramBotAdmin />
      </div>
    </div>
  );
}