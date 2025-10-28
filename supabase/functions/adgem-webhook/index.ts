import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AdGemWebhookRequest {
  uid: string;
  payout: string;
  secret: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let uid: string, payout: string, secret: string;

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      uid = url.searchParams.get('uid') || '';
      payout = url.searchParams.get('payout') || '';
      secret = url.searchParams.get('secret') || '';
    } else {
      const body = await req.json() as AdGemWebhookRequest;
      uid = body.uid || '';
      payout = body.payout || '';
      secret = body.secret || '';
    }

    // Validate required parameters
    if (!uid || !payout || !secret) {
      console.error('Missing required parameters:', { uid: !!uid, payout: !!payout, secret: !!secret });
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate secret key
    const expectedSecret = 'gcoin_secret_2025';
    if (secret !== expectedSecret) {
      console.error('Invalid secret provided');
      return new Response('Invalid secret', { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    // Parse payout amount
    const payoutAmount = parseFloat(payout);
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      console.error('Invalid payout amount:', payout);
      return new Response('Invalid payout amount', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Calculate points (payout * 100)
    const points = payoutAmount * 100;

    console.log(`Processing AdGem reward: UID=${uid}, Payout=${payoutAmount}, Points=${points}`);

    // Find user by telegram_id (assuming uid is telegram_id)
    const telegramId = parseInt(uid);
    if (isNaN(telegramId)) {
      console.error('Invalid telegram ID:', uid);
      return new Response('Invalid user ID', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const { data: user, error: userError } = await supabaseClient
      .from('telegram_users')
      .select('id, telegram_id, first_name, coins')
      .eq('telegram_id', telegramId)
      .single();

    if (userError || !user) {
      console.error('User not found:', telegramId, userError);
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update user's coins balance
    const { error: updateError } = await supabaseClient
      .from('telegram_users')
      .update({ 
        coins: user.coins + points,
        last_active: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user balance:', updateError);
      return new Response('Failed to update balance', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Log the transaction (optional - create a table for AdGem transactions if needed)
    try {
      // You could create an adgem_transactions table to track these
      const { error: logError } = await supabaseClient
        .from('completed_tasks')
        .insert({
          telegram_user_id: user.id,
          task_id: `adgem_${Date.now()}`,
          task_title: 'AdGem Reward',
          task_type: 'adgem',
          reward_amount: points,
          uid: uid,
          campaign_link: 'AdGem Network'
        });

      if (logError) {
        console.warn('Failed to log transaction:', logError);
        // Don't fail the webhook for logging errors
      }
    } catch (logErr) {
      console.warn('Logging error:', logErr);
    }

    console.log(`Successfully processed AdGem reward for user ${telegramId}: +${points} coins`);

    // Increment global market value
    try {
      await supabaseClient.rpc('increment_market_value', { amount: 0.0025 });
    } catch (marketErr) {
      console.warn('Failed to update market value:', marketErr);
    }

    // Process referral commission for coins earned
    try {
      const { error: commissionError } = await supabaseClient
        .rpc('process_referral_commission', {
          p_referred_telegram_id: telegramId,
          p_commission_type: 'gcoin_v4',
          p_amount: points
        });

      if (commissionError) {
        console.error('Error processing referral commission:', commissionError);
      } else {
        console.log(`Referral commission processed for user ${telegramId}`);
      }
    } catch (error) {
      console.error('Error calling commission function:', error);
    }

    return new Response('OK', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('AdGem webhook error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});