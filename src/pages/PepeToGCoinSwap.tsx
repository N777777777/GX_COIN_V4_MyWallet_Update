import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { useBackNavigation } from "@/hooks/useBackNavigation";
export default function PepeToGCoinSwap() {
  const {
    goBack
  } = useBackNavigation();
  return <div className="min-h-screen bg-background mobile-container safe-top safe-bottom">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-to-r from-card via-card/90 to-card shadow-soft backdrop-blur-md -mx-3 px-3 sticky top-0 z-50">
        <div className="py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">SWAP</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6 flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full">
          <CardContent className="py-16 px-6 text-center">
            <div className="space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ArrowRightLeft className="w-10 h-10 text-primary" />
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Coming Soon</h2>
                
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>;
}