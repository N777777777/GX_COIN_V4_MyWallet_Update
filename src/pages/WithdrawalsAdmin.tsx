import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WithdrawalAdmin from "@/components/WithdrawalAdmin";
import { useClickSound } from "@/hooks/useClickSound";

export default function WithdrawalsAdmin() {
  const navigate = useNavigate();
  const { playSound } = useClickSound();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                playSound();
                navigate('/');
              }}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Withdrawal Requests Management</h1>
            <div></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <WithdrawalAdmin />
      </main>
    </div>
  );
}