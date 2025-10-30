import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Clock, RefreshCw, Wrench, Bot } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center space-y-8">
        
        {/* Bot Icon with Animation */}
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-pulse-glow">
            <Bot className="w-16 h-16 text-primary-foreground" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Badge variant="outline" className="bg-background border-primary animate-bounce">
              <Settings className="w-3 h-3 mr-1 animate-spin" />
              Maintenance
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-8 space-y-6">
            
            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground">
                🔧 Bot Under Maintenance
              </h1>
              <p className="text-lg text-muted-foreground">
                We're working on improving the bot to give you a better experience
              </p>
            </div>

            {/* Status Messages */}
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary animate-pulse" />
                  <span className="font-semibold text-foreground">Will Return Soon</span>
                </div>
                <p className="text-sm text-muted-foreground mr-8">
                  We're performing important updates to improve performance and add new features
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-foreground">System Updates</span>
                </div>
                <p className="text-sm text-muted-foreground mr-8">
                  Adding new features and fixing bugs
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-foreground">Performance Improvement</span>
                </div>
                <p className="text-sm text-muted-foreground mr-8">
                  Improving response speed and user experience
                </p>
              </div>
            </div>

            {/* Expected Return Time */}
            <div className="bg-gradient-primary text-primary-foreground rounded-lg p-4 text-center">
              <p className="font-semibold">Expected Return Within</p>
              <p className="text-2xl font-bold mt-1">A Few Hours</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Footer Message */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> You can save this page and return to it later to check the bot status
          </p>
        </div>

      </div>
    </div>
  );
};

export default Maintenance;