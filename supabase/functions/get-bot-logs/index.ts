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
    // For now, return some sample logs
    // In a real implementation, you might fetch from a logging service
    const logs = [
      `${new Date().toISOString()} - Bot started successfully`,
      `${new Date().toISOString()} - Webhook configured`,
      `${new Date().toISOString()} - Listening for updates`,
    ]

    return new Response(
      JSON.stringify({ 
        logs: logs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Get bot logs error:', error)
    return new Response(
      JSON.stringify({ 
        logs: [`Error fetching logs: ${error.message}`]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})