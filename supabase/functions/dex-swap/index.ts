import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TonClient } from "https://esm.sh/@ton/ton@15.3.1";
import { Address, beginCell, toNano } from "https://esm.sh/@ton/core@0.61.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(req.url);
    let action = searchParams.get('action');
    let requestBody = null;
    
    // Handle POST requests with JSON body
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        action = action || requestBody.action;
      } catch (e) {
        // If no JSON body, continue with query params
      }
    }

    if (action === 'quote') {
      const tokenIn = searchParams.get('tokenIn');
      const tokenOut = searchParams.get('tokenOut');
      const amountIn = searchParams.get('amountIn');

      if (!tokenIn || !tokenOut || !amountIn) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the pool for this pair
      const { data: pools, error: poolError } = await supabase
        .from('dex_pools')
        .select('*')
        .or(`and(token0_symbol.eq.${tokenIn},token1_symbol.eq.${tokenOut}),and(token0_symbol.eq.${tokenOut},token1_symbol.eq.${tokenIn})`)
        .limit(1);

      if (poolError || !pools || pools.length === 0) {
        return new Response(JSON.stringify({ error: 'Pool not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const pool = pools[0];
      const isToken0 = pool.token0_symbol === tokenIn;
      
      // Calculate output using constant product formula: x * y = k
      const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
      const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;
      const amountInNum = parseFloat(amountIn);
      
      // Apply fee (0.3% = 997/1000)
      const amountInWithFee = amountInNum * 997;
      const numerator = amountInWithFee * parseFloat(reserveOut);
      const denominator = parseFloat(reserveIn) * 1000 + amountInWithFee;
      const amountOut = numerator / denominator;
      
      // Calculate price impact
      const priceImpact = (amountInNum / parseFloat(reserveIn)) * 100;

      return new Response(JSON.stringify({
        amountOut: amountOut.toString(),
        priceImpact: priceImpact.toString(),
        pool: pool.pool_address,
        fee: '0.3'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'swap' && req.method === 'POST') {
      const body = requestBody || {};
      const { poolAddress, tokenIn, tokenOut, amountIn, minAmountOut, userAddress } = body;

      // Record the swap in database
      const { data: poolData } = await supabase
        .from('dex_pools')
        .select('id')
        .eq('pool_address', poolAddress)
        .single();

      if (poolData) {
        await supabase
          .from('dex_swaps')
          .insert({
            pool_id: poolData.id,
            user_address: userAddress,
            token_in: tokenIn,
            token_out: tokenOut,
            amount_in: parseFloat(amountIn),
            amount_out: parseFloat(minAmountOut),
            status: 'pending'
          });
      }

      // In a real implementation, this would interact with TON smart contracts
      // For now, we'll return a success response
      return new Response(JSON.stringify({
        success: true,
        message: 'Swap initiated successfully',
        transactionHash: 'mock_tx_hash_' + Date.now()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'pools') {
      const { data: pools, error } = await supabase
        .from('dex_pools')
        .select('*')
        .order('tvl_usd', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ pools }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'tokens') {
      const search = searchParams.get('search') || '';
      
      let query = supabase
        .from('jettons')
        .select('*')
        .order('verified', { ascending: false });

      if (search) {
        query = query.or(`symbol.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data: tokens, error } = await query.limit(50);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ tokens }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in dex-swap function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});