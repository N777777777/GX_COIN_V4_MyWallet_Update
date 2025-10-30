import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { referrer_telegram_id, referred_user_name, gcoin_reward, pepe_reward, alpha_reward } = await req.json()

    if (!referrer_telegram_id) {
      return new Response(
        JSON.stringify({ error: 'Missing referrer_telegram_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found')
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification message
    let message = `🎉 مبروك! حصلت على مكافآت من إحالتك!\n\n`
    message += `👤 الصديق: ${referred_user_name || 'صديقك'}\n\n`
    message += `💰 المكافآت المضافة:\n`
    
    if (gcoin_reward && gcoin_reward > 0) {
      message += `🪙 ${gcoin_reward.toFixed(2)} G-COIN V4\n`
    }
    if (pepe_reward && pepe_reward > 0) {
      message += `🐸 ${pepe_reward.toFixed(2)} PEPE\n`
    }
    if (alpha_reward && alpha_reward > 0) {
      message += `⭐ ${alpha_reward.toFixed(2)} ALPHA\n`
    }
    
    message += `\n✨ استمر في دعوة المزيد من الأصدقاء لتحصل على المزيد من المكافآت!`

    // Send notification via Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: referrer_telegram_id,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send Telegram notification:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Notification sent to referrer ${referrer_telegram_id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-referrer-reward:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
