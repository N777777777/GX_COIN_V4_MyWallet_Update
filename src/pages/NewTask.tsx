import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Link as LinkIcon, Coins } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export default function NewTask() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [subscribers, setSubscribers] = useState<string>('100');

  // Calculate cost in Telegram Stars
  const calculateCost = (subs: string) => {
    const subsNum = parseInt(subs);
    return subsNum / 100 * 50; // Every 100 subscribers = 50 stars
  };
  const calculateReward = (subs: string) => {
    const subsNum = parseInt(subs);
    return subsNum * 0.0005;
  };
  const starsCost = calculateCost(subscribers);
  const rewardPerUser = calculateReward(subscribers);
  const handleSubmit = async () => {
    if (!taskTitle || !channelUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }
    const storedTelegramId = localStorage.getItem('gcoin_telegram_id');
    if (!storedTelegramId) {
      toast({
        title: "Authentication Error",
        description: "No Telegram ID found",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Check user's Stars balance
      const {
        data: userData
      } = await supabase.from('telegram_users').select('stars_balance').eq('telegram_id', parseInt(storedTelegramId)).single();
      if (!userData || userData.stars_balance < starsCost) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${starsCost} Stars to create this task`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create task
      const {
        data,
        error
      } = await supabase.functions.invoke('create-partner-task', {
        body: {
          telegram_id: parseInt(storedTelegramId),
          task_title: taskTitle,
          task_description: `Subscribe to the channel and get ${rewardPerUser} coins`,
          reward_amount: rewardPerUser,
          task_url: channelUrl,
          partner_name: taskTitle,
          max_participants: parseInt(subscribers),
          stars_cost: starsCost
        }
      });
      if (error) {
        throw error;
      }
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to create task');
      }
      toast({
        title: "Task Created! 🎉",
        description: data?.message || "Task created and published successfully"
      });

      // Return to tasks page
      navigate(-1);
    } catch (error: any) {
      console.error('Error creating partner task:', error);
      toast({
        title: "Creation Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-primary" />
              New Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Task Name
              </Label>
              <Input id="taskTitle" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Enter task name" className="bg-background" />
            </div>

            {/* Channel Link */}
            <div className="space-y-2">
              <Label htmlFor="channelUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Channel Link
              </Label>
              <Input id="channelUrl" value={channelUrl} onChange={e => setChannelUrl(e.target.value)} placeholder="https://t.me/your_channel" className="bg-background" dir="ltr" />
            </div>

            {/* Number of Subscribers */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Number of Subscribers
              </Label>
              <Select value={subscribers} onValueChange={setSubscribers}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 subscribers</SelectItem>
                  <SelectItem value="500">500 subscribers</SelectItem>
                  <SelectItem value="1000">1000 subscribers</SelectItem>
                  <SelectItem value="5000">5000 subscribers</SelectItem>
                  <SelectItem value="10000">10000 subscribers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cost and Reward Information */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Cost:
                  </span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-lg font-bold">{starsCost} ⭐ Stars</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground text-center">
                    Every 100 subscribers = 50 Stars
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Create Button */}
            <Button onClick={handleSubmit} disabled={loading || !taskTitle || !channelUrl} className="w-full" size="lg">
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>;
}