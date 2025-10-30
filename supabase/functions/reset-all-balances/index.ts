import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting reset of ALL user balances to zero...')

    // إعادة تعيين جميع الأرصدة إلى الصفر
    const { error: resetError, count } = await supabase
      .from('telegram_users')
      .update({
        bal_x7k9m: 0,        // pepe_balance
        bal_j3n8q: 0,        // pepe_advertising_balance
        bal_w5r2t: 0,        // pepe_withdrawable_balance
        bal_g4v7y: 0,        // gcoin_v4_balance
        bal_a6c3z: 0,        // alpha_coins
        ton_balance: 0,
        coins: 0,
        updated_at: new Date().toISOString()
      })
      .neq('telegram_id', 0) // تحديث جميع المستخدمين

    if (resetError) {
      console.error('Error resetting balances:', resetError)
      throw resetError
    }

    console.log(`Reset completed: ${count} users affected`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إعادة تعيين جميع الأرصدة إلى الصفر بنجاح',
        users_affected: count,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reset error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
