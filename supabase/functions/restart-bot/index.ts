import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!BOT_TOKEN) {
      throw new Error('توكن البوت غير موجود');
    }

    console.log('Starting bot restart process...');

    // 1. فحص حالة البوت الحالية
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (!botInfo.ok) {
      throw new Error(`توكن البوت غير صحيح: ${botInfo.description}`);
    }

    console.log('Bot info:', botInfo.result);

    // 2. حذف الـ webhook القديم
    const deleteWebhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const deleteResult = await deleteWebhookResponse.json();
    
    console.log('Delete webhook result:', deleteResult);

    // 3. إعداد webhook جديد
    const webhookUrl = `https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/telegram-bot`;
    
    const setWebhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true // حذف الرسائل المعلقة
      })
    });

    const webhookResult = await setWebhookResponse.json();
    
    console.log('Set webhook result:', webhookResult);

    if (!webhookResult.ok) {
      throw new Error(`فشل إعداد webhook: ${webhookResult.description}`);
    }

    // 4. فحص حالة الـ webhook
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    console.log('Webhook info:', webhookInfo.result);

    // 5. تعيين menu button (open)
    const setMenuButtonResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'open',
          web_app: {
            url: 'https://g-coin-bot-1r3s.vercel.app/'
          }
        }
      })
    });

    const menuButtonResult = await setMenuButtonResponse.json();
    console.log('Set menu button result:', menuButtonResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إعادة تشغيل البوت بنجاح',
        bot_info: botInfo.result,
        webhook_info: webhookInfo.result
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Bot restart error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ في إعادة تشغيل البوت'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);