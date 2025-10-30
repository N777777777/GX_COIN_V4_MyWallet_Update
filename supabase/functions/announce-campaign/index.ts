// Announce campaign completion to Telegram bot/channel
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign } = await req.json();
    
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the campaign announcement message
    const message = `🚀 *حملة جديدة متاحة الآن!*

📝 *${campaign.campaign_name}*
💰 *مبلغ السيولة:* ${campaign.liquidity_amount} ${campaign.payment_type}
👥 *القناة:* @${campaign.channel_username}

انضم الآن وابدأ في كسب المكافآت! 🎯

/start - للبدء`;

    // Get channel ID from environment or use a default chat ID
    const channelId = Deno.env.get('TELEGRAM_ANNOUNCEMENT_CHANNEL_ID') || '@your_channel';

    // Send message to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Failed to send Telegram message:', telegramData);
      return new Response(
        JSON.stringify({ error: 'Failed to send announcement', details: telegramData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Campaign announced successfully:', {
      campaign_id: campaign.id,
      message_id: telegramData.result?.message_id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign announced successfully',
        telegram_message_id: telegramData.result?.message_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in announce-campaign function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});