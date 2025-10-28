import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DeleteMessages = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [messageIds, setMessageIds] = useState<string>("");

  const deleteSpamMessages = async () => {
    if (!messageIds.trim()) {
      toast.error('يرجى إدخال أرقام الرسائل');
      return;
    }

    setIsDeleting(true);
    try {
      // تحويل النص إلى مصفوفة أرقام
      const ids = messageIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (ids.length === 0) {
        toast.error('يرجى إدخال أرقام صحيحة للرسائل');
        setIsDeleting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-message', {
        body: { messageIds: ids }
      });
      
      if (error) {
        console.error('Error calling delete-message function:', error);
        toast.error('خطأ في استدعاء وظيفة حذف الرسائل: ' + error.message);
        return;
      }

      setResult(data);
      
      if (data?.success) {
        toast.success(data.message || 'تم حذف الرسائل بنجاح');
      } else {
        toast.error(data?.error || 'فشل في حذف الرسائل');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>حذف الرسائل السبام</CardTitle>
          <CardDescription>
            هذه الصفحة تسمح بحذف الرسائل السبام من القناة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="messageIds">أرقام الرسائل (مفصولة بفاصلة)</Label>
            <Input 
              id="messageIds"
              value={messageIds}
              onChange={(e) => setMessageIds(e.target.value)}
              placeholder="مثال: 604, 605, 606, 607"
              className="w-full"
            />
          </div>
          
          <Button 
            onClick={deleteSpamMessages} 
            disabled={isDeleting || !messageIds.trim()}
            className="w-full"
          >
            {isDeleting ? 'جاري الحذف...' : 'حذف الرسائل'}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">نتيجة الحذف:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteMessages;