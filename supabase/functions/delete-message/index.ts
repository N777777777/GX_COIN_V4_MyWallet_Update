import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function deleteMessage(botToken: string, chatId: string, messageId: number) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId
    })
  });
  return response.json();
}

async function deleteMultipleMessages(botToken: string, chatId: string, messageIds: number[]) {
  const results = [];
  for (const messageId of messageIds) {
    try {
      const result = await deleteMessage(botToken, chatId, messageId);
      results.push({ messageId, success: result.ok, result });
      // تأخير قصير بين الرسائل لتجنب rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({ messageId, success: false, error: error.message });
    }
  }
  return results;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // حذف الرسائل المحددة من القناة
    const chatId = '@G_COIN_V3';
    
    // قراءة أرقام الرسائل من البيانات المرسلة
    let messageIds: number[] = [];
    
    if (req.body) {
      const body = await req.json();
      messageIds = body.messageIds || [];
    }
    
    // إذا لم يتم إرسال أرقام رسائل، استخدم القيم الافتراضية
    if (messageIds.length === 0) {
      messageIds = [604, 605, 606, 607, 608];
    }
    
    console.log('🗑️ Message IDs to delete:', messageIds);
    
    const deleteResults = await deleteMultipleMessages(botToken, chatId, messageIds);
    
    console.log('🗑️ Multiple Messages Deletion Results:', deleteResults);

    const successCount = deleteResults.filter(r => r.success).length;
    const totalCount = deleteResults.length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `تم حذف ${successCount} من ${totalCount} رسائل`,
        results: deleteResults,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: successCount > 0 ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Message deletion error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);