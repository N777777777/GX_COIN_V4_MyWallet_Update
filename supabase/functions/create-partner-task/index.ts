import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('Received request body:', requestBody)
    
    const { 
      telegram_id, 
      task_title, 
      task_description, 
      reward_amount, 
      task_url, 
      partner_name,
      max_participants,
      stars_cost
    } = requestBody

    if (!telegram_id || !task_title || !reward_amount || !task_url || !max_participants || stars_cost === undefined) {
      console.error('Missing required fields:', { telegram_id, task_title, reward_amount, task_url, max_participants, stars_cost })
      return new Response(
        JSON.stringify({ success: false, message: 'Required data is missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get user data
    console.log('Looking for user with telegram_id:', telegram_id)
    const { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id, stars_balance, first_name, username')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if user has enough Stars
    if (user.stars_balance < stars_cost) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient Stars balance. You need ${stars_cost} Stars to create this task`,
          required_balance: stars_cost,
          current_balance: user.stars_balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Deduct Stars balance
    const { error: deductError } = await supabase
      .from('telegram_users')
      .update({ stars_balance: user.stars_balance - stars_cost })
      .eq('id', user.id)

    if (deductError) {
      console.error('Error deducting Stars balance:', deductError)
      return new Response(
        JSON.stringify({ success: false, message: 'Error deducting Stars balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Create task using existing function
    const { data: result, error: taskError } = await supabase.rpc('create_partner_task', {
      creator_telegram_id: telegram_id,
      task_title,
      task_description,
      reward_amount,
      task_url,
      partner_name,
      max_participants
    })

    if (taskError || !result?.success) {
      // Refund Stars if task creation failed
      await supabase
        .from('telegram_users')
        .update({ stars_balance: user.stars_balance })
        .eq('id', user.id)

      console.error('Error creating partner task:', taskError, result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: result?.message || taskError?.message || 'Error creating task' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task created successfully! ${stars_cost} Stars deducted`,
        task_id: result?.task_id || null,
        deducted_amount: stars_cost,
        remaining_balance: user.stars_balance - stars_cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-partner-task function:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})