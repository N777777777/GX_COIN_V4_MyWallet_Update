import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TelegramMessage {
  chat_id: number;
  text: string;
  parse_mode?: string;
}

async function sendTelegramMessage(botToken: string, message: TelegramMessage) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      console.error(`Failed to send message to ${message.chat_id}:`, await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error sending message to ${message.chat_id}:`, error);
    return false;
  }
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

    // الحصول على جميع المستخدمين
    const { data: users, error } = await supabase
      .from('telegram_users')
      .select('telegram_id, first_name')
      .limit(1000); // إرسال على دفعات لتجنب التحميل الزائد

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No users found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = `🔒 تحديث أمني مهم 🔒

لقد كان البوت مخترق ولكن تم إصلاح المشكلة الآن.

✅ يمكنكم الآن العمل بأمان تام!

🔧 ما تم إصلاحه:
• إغلاق جميع الثغرات الأمنية
• تحديث نظام الحماية
• استعادة الوظائف بشكل آمن

📱 يمكنكم الآن استخدام البوت بثقة كاملة.

شكراً لصبركم وثقتكم 🙏`;

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // إرسال الرسائل على دفعات صغيرة لتجنب معدل الحد
    for (let i = 0; i < users.length; i += 5) {
      const batch = users.slice(i, i + 5);
      
      const batchPromises = batch.map(async (user) => {
        const success = await sendTelegramMessage(botToken, {
          chat_id: user.telegram_id,
          text: message,
          parse_mode: 'HTML'
        });
        
        if (success) {
          successCount++;
          console.log(`✅ Message sent to ${user.first_name} (${user.telegram_id})`);
        } else {
          failCount++;
          console.log(`❌ Failed to send message to ${user.first_name} (${user.telegram_id})`);
        }
        
        return { user_id: user.telegram_id, success };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // انتظار قصير بين الدفعات لتجنب معدل الحد
      if (i + 5 < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`📊 Mass message results: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mass message sending completed',
        results: {
          total_users: users.length,
          success_count: successCount,
          fail_count: failCount,
          details: results
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-mass-message function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);