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
          connected: false, 
          error: 'TELEGRAM_BOT_TOKEN not configured' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Test connection by getting bot info
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const result = await response.json()

    console.log('Bot connection test result:', result)

    if (result.ok) {
      return new Response(
        JSON.stringify({ 
          connected: true,
          bot_info: result.result
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          error: result.description || 'Connection failed' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Test bot connection error:', error)
    return new Response(
      JSON.stringify({ 
        connected: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})