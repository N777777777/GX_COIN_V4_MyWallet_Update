import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const CHANNEL_CHAT_ID = '@G_COIN_V3'; // قناة الإعلان

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily stars draw process...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // اختيار الفائز اليومي
    const { data: result, error } = await supabase.rpc('select_daily_stars_winner');
    
    if (error) {
      console.error('Error selecting winner:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Winner selection result:', result);

    if (!result?.success || !result?.winner) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: result?.message || 'No winner selected',
          participants_count: result?.participants_count || 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const winner = result.winner;
    
    // إنشاء رسالة الإعلان
    const message = `Today's draw winner 🎉

Winner's username: @${winner.username || winner.first_name}

You have won 15 stars ⭐ They will be sent to you shortly.

🎊 Congratulations! 
📅 Next draw: Tomorrow at the same time
🎯 Want to participate? Watch ads in the Daily Stars Box!`;

    // إرسال الرسالة للقناة
    if (TELEGRAM_BOT_TOKEN) {
      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: CHANNEL_CHAT_ID,
              text: message,
              parse_mode: 'HTML'
            } as TelegramMessage)
          }
        );

        const telegramResult = await telegramResponse.json();
        console.log('Telegram message result:', telegramResult);

        if (telegramResult.ok) {
          // تحديث حالة الرسالة كمرسلة
          await supabase
            .from('daily_stars_winners')
            .update({ 
              message_sent: true, 
              announced_at: new Date().toISOString() 
            })
            .eq('draw_date', result.draw_date)
            .eq('telegram_id', winner.telegram_id);

          console.log('Message sent successfully and database updated');
        } else {
          console.error('Failed to send Telegram message:', telegramResult);
        }
      } catch (telegramError) {
        console.error('Error sending Telegram message:', telegramError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        winner: winner,
        message: 'Winner selected and announced successfully',
        participants_count: result.participants_count,
        draw_date: result.draw_date,
        telegram_sent: TELEGRAM_BOT_TOKEN ? true : false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in daily stars draw:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});