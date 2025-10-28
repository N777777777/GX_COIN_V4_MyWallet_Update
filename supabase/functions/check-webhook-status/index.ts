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
      return new Response(
        JSON.stringify({ 
          active: false, 
          error: 'TELEGRAM_BOT_TOKEN not configured' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check webhook info
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const result = await response.json()

    console.log('Webhook info:', result)

    if (result.ok) {
      const webhookInfo = result.result
      const isActive = webhookInfo.url && webhookInfo.url.length > 0
      
      return new Response(
        JSON.stringify({ 
          active: isActive,
          webhook_info: webhookInfo
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          active: false, 
          error: result.description || 'Failed to get webhook info' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Check webhook status error:', error)
    return new Response(
      JSON.stringify({ 
        active: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})