import OffersComponent from "@/components/OffersComponent";

const Offers = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Featured Offers
          </h1>
          <p className="text-muted-foreground">
            Complete offers and earn coins
          </p>
        </div>
        
        <OffersComponent />
      </div>
    </div>
  );
};

export default Offers;