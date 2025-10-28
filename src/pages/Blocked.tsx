import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ban, AlertTriangle } from "lucide-react";

export default function Blocked() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Ban className="w-6 h-6" />
            تم حظر حسابك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>عذراً،</strong> تم حظر حسابك من قبل الإدارة.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>لا يمكنك الوصول إلى هذه الخدمة حالياً.</p>
            <p>إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني.</p>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-center">
              للاستفسارات: 
              <a 
                href="https://t.me/G_COIN_help_Support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline mr-1"
              >
                اتصل بفريق الدعم
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
