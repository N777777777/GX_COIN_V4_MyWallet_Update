import { useTelegramData } from "@/hooks/useTelegramData";

const OffersComponent = () => {
  const { telegramUser } = useTelegramData();

  if (!telegramUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view offers</p>
      </div>
    );
  }

  const offersUrl = `https://timewall.io/users/login?oid=c2f88e4765b9c1bf&uid=${telegramUser.telegram_id}&tab=clicks`;

  return (
    <div className="w-full h-screen">
      <iframe 
        title="TimeWall Offers" 
        src={offersUrl}
        frameBorder="0" 
        width="100%" 
        height="100%" 
        scrolling="auto"
        className="rounded-lg"
      >
      </iframe>
    </div>
  );
};

export default OffersComponent;