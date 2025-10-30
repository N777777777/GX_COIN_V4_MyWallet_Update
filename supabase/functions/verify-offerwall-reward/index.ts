import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rewardId, userId, projectId, amount, hash, user_telegram_id } = await req.json();
    
    console.log('Verifying OfferWall reward:', { rewardId, userId, projectId, amount, user_telegram_id });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get secret key from environment
    const secretKey = Deno.env.get('OFFERWALL_SECRET_KEY') || 'your_secret_key_here';
    
    // 1. Verify the hash
    const expectedHash = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(`${userId}:${projectId}:${rewardId}:${amount}:${secretKey}`)
    ).then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    if (hash && hash !== expectedHash) {
      console.error('Invalid hash provided');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid hash'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Check if reward hasn't already been claimed
    const { data: existingReward } = await supabase
      .from('offerwall_rewards')
      .select('id')
      .eq('reward_id', rewardId)
      .eq('user_telegram_id', user_telegram_id)
      .single();

    if (existingReward) {
      console.error('Reward already claimed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Reward already claimed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Get or create user
    let { data: user } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('telegram_id', user_telegram_id)
      .single();

    if (!user) {
      // Create user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: user_telegram_id,
          first_name: 'OfferWall User',
          username: `user_${user_telegram_id}`,
          coins: amount || 10
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to create user'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      user = newUser;
    } else {
      // Update existing user balance
      await supabase
        .from('telegram_users')
        .update({
          coins: supabase.sql`coins + ${amount || 10}`
        })
        .eq('id', user.id);
    }

    // 4. Record the reward
    await supabase
      .from('offerwall_rewards')
      .insert({
        reward_id: rewardId,
        user_id: user.id,
        user_telegram_id: user_telegram_id,
        project_id: projectId,
        amount: amount || 10,
        original_hash: hash,
        status: 'confirmed'
      });

    // 5. Process referral commission for coins earned
    try {
      const { error: commissionError } = await supabase
        .rpc('process_referral_commission', {
          p_referred_telegram_id: user_telegram_id,
          p_commission_type: 'gcoin_v4',
          p_amount: amount || 10
        });

      if (commissionError) {
        console.error('Error processing referral commission:', commissionError);
      } else {
        console.log(`Referral commission processed for user ${user_telegram_id}`);
      }
    } catch (error) {
      console.error('Error calling commission function:', error);
    }

    // 6. Generate confirmation hash
    const confirmationHash = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(`${rewardId}:${userId}:${projectId}:${amount}:confirm:${secretKey}`)
    ).then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    console.log('Reward verified successfully');

    return new Response(JSON.stringify({
      success: true,
      confirmationHash,
      message: 'Reward verified and credited successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in verify-offerwall-reward function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});