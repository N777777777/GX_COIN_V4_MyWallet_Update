import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_BOT_TOKEN not configured' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // الحصول على URL الخاص بالـ webhook
    const url = new URL(req.url)
    const webhookUrl = `https://${url.host}/functions/v1/telegram-bot`

    console.log('Setting up webhook to:', webhookUrl)

    // إعداد الـ webhook
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true
      }),
    })

    const result = await response.json()
    console.log('Webhook setup result:', result)

    if (result.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook setup successfully',
          webhook_url: webhookUrl 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      console.error('Failed to setup webhook:', result.description)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to setup webhook: ${result.description}` 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Setup webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})