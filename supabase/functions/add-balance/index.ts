import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AddBalanceRequest {
  telegram_id?: number;
  user_id?: string;
  coins?: number;
  ton_balance?: number;
  action: 'add_coins' | 'add_ton' | 'set_coins' | 'set_ton';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: AddBalanceRequest = await req.json();
    const { telegram_id, user_id, coins, ton_balance, action } = body;

    console.log('Add balance request:', { telegram_id, user_id, coins, ton_balance, action });

    // Validate input
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!telegram_id && !user_id) {
      return new Response(
        JSON.stringify({ error: 'Either telegram_id or user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by telegram_id or user_id
    let userData;
    if (telegram_id) {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'User not found with provided telegram_id' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userData = data;
    } else {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('id', user_id)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'User not found with provided user_id' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userData = data;
    }

    // Prepare update data
    let updateData: any = {};
    
    switch (action) {
      case 'add_coins':
        if (coins === undefined || coins === null) {
          return new Response(
            JSON.stringify({ error: 'Coins amount is required for add_coins action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.coins = (userData.coins || 0) + coins;
        break;
        
      case 'add_ton':
        if (ton_balance === undefined || ton_balance === null) {
          return new Response(
            JSON.stringify({ error: 'TON amount is required for add_ton action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.ton_balance = (userData.ton_balance || 0) + ton_balance;
        break;
        
      case 'set_coins':
        if (coins === undefined || coins === null) {
          return new Response(
            JSON.stringify({ error: 'Coins amount is required for set_coins action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.coins = coins;
        break;
        
      case 'set_ton':
        if (ton_balance === undefined || ton_balance === null) {
          return new Response(
            JSON.stringify({ error: 'TON amount is required for set_ton action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.ton_balance = ton_balance;
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: add_coins, add_ton, set_coins, or set_ton' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update user balance
    const { data: updatedUser, error: updateError } = await supabase
      .from('telegram_users')
      .update(updateData)
      .eq('id', userData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Balance updated successfully:', {
      user_id: userData.id,
      telegram_id: userData.telegram_id,
      old_balance: {
        coins: userData.coins,
        ton_balance: userData.ton_balance
      },
      new_balance: {
        coins: updatedUser.coins,
        ton_balance: updatedUser.ton_balance
      },
      action,
      changes: updateData
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Balance updated successfully',
        user: {
          id: updatedUser.id,
          telegram_id: updatedUser.telegram_id,
          first_name: updatedUser.first_name,
          username: updatedUser.username,
          coins: updatedUser.coins,
          ton_balance: updatedUser.ton_balance
        },
        changes: updateData,
        action
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in add-balance function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});