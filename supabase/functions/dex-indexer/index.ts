import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Starting DEX indexer...');

    // Update pool prices and TVL
    const { data: pools, error: poolsError } = await supabase
      .from('dex_pools')
      .select('*');

    if (poolsError) {
      throw poolsError;
    }

    console.log(`Found ${pools?.length || 0} pools to update`);

    if (pools) {
      for (const pool of pools) {
        try {
          const reserve0 = parseFloat(pool.reserve0);
          const reserve1 = parseFloat(pool.reserve1);

          // Calculate price (token1 in terms of token0)
          const price0 = reserve1 > 0 ? reserve0 / reserve1 : 0;
          const price1 = reserve0 > 0 ? reserve1 / reserve0 : 0;

          // Simple TVL calculation (in USD, assuming TON price)
          const tonPrice = 5.0; // Fallback price
          let tvlUsd = 0;

          if (pool.token0_symbol === 'TON') {
            tvlUsd = (reserve0 * tonPrice * 2) / Math.pow(10, 9); // Assuming 9 decimals
          } else if (pool.token1_symbol === 'TON') {
            tvlUsd = (reserve1 * tonPrice * 2) / Math.pow(10, 9);
          } else {
            // For non-TON pairs, use a mock calculation
            tvlUsd = (reserve0 + reserve1) / Math.pow(10, 9) * 1.0; // $1 per token average
          }

          await supabase
            .from('dex_pools')
            .update({
              price_token0: price0.toString(),
              price_token1: price1.toString(),
              tvl_usd: tvlUsd.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', pool.id);

          console.log(`Updated pool ${pool.token0_symbol}/${pool.token1_symbol}: TVL=$${tvlUsd.toFixed(2)}`);
        } catch (error) {
          console.error(`Error updating pool ${pool.id}:`, error);
        }
      }
    }

    // Update token verification status and metadata
    const { data: tokens, error: tokensError } = await supabase
      .from('jettons')
      .select('*')
      .eq('verified', false);

    if (tokensError) {
      console.error('Error fetching unverified tokens:', tokensError);
    } else if (tokens) {
      console.log(`Found ${tokens.length} unverified tokens`);
      
      // Auto-verify tokens that match certain criteria
      for (const token of tokens) {
        try {
          // Simple verification logic
          const shouldVerify = 
            token.symbol.length <= 6 && 
            token.name.length > 0 && 
            !token.name.toLowerCase().includes('test');

          if (shouldVerify) {
            await supabase
              .from('jettons')
              .update({ verified: true })
              .eq('id', token.id);
            
            console.log(`Auto-verified token: ${token.symbol}`);
          }
        } catch (error) {
          console.error(`Error verifying token ${token.id}:`, error);
        }
      }
    }

    console.log('DEX indexer completed successfully');

    return new Response(JSON.stringify({
      success: true,
      poolsUpdated: pools?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in dex-indexer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});