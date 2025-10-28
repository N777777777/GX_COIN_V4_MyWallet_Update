import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BalanceUpdateRequest {
  telegram_id: bigint
  balance_type: 'coins' | 'ton_balance' | 'bal_x7k9m' | 'bal_w5r2t' | 'bal_g4v7y' | 'bal_a6c3z'
  amount: number
  operation: 'add' | 'subtract' | 'set'
  source: string
  metadata?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { telegram_id, balance_type, amount, operation, source, metadata }: BalanceUpdateRequest = await req.json()

    // Validation
    if (!telegram_id || !balance_type || amount === undefined || !operation || !source) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 0) {
      return new Response(
        JSON.stringify({ error: 'Amount cannot be negative' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id, telegram_id, ' + balance_type)
      .eq('telegram_id', telegram_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oldBalance = user[balance_type] || 0
    let newBalance: number

    // Calculate new balance
    switch (operation) {
      case 'add':
        newBalance = oldBalance + amount
        break
      case 'subtract':
        newBalance = Math.max(0, oldBalance - amount)
        break
      case 'set':
        newBalance = amount
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Update balance
    const { error: updateError } = await supabase
      .from('telegram_users')
      .update({ [balance_type]: newBalance, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating balance:', updateError)
      throw updateError
    }

    // Log the change
    const { error: logError } = await supabase
      .from('balance_audit_log')
      .insert({
        telegram_user_id: user.id,
        telegram_id: telegram_id,
        balance_type: balance_type,
        old_balance: oldBalance,
        new_balance: newBalance,
        amount_changed: amount,
        operation_type: operation,
        source: source,
        additional_data: metadata,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    if (logError) {
      console.error('Error logging change:', logError)
    }

    console.log(`Balance updated: ${telegram_id}, ${balance_type}: ${oldBalance} -> ${newBalance}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        old_balance: oldBalance,
        new_balance: newBalance,
        balance_type: balance_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Secure balance update error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
