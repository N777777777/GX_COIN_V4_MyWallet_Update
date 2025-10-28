import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function revokeWebhook(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: true })
  });
  return response.json();
}

async function getBotInfo(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
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

    // التحقق من معلومات البوت
    const botInfo = await getBotInfo(botToken);
    
    // إلغاء الويب هوك للأمان
    const webhookResult = await revokeWebhook(botToken);
    
    console.log('🚨 Emergency Bot Security Check:');
    console.log('Bot Info:', botInfo);
    console.log('Webhook Revoked:', webhookResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emergency security check completed',
        bot_info: botInfo,
        webhook_revoked: webhookResult,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Emergency security check error:', error);
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