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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'add' && req.method === 'POST') {
      const body = await req.json();
      const { 
        poolAddress, 
        token0Amount, 
        token1Amount, 
        userAddress,
        token0Symbol,
        token1Symbol
      } = body;

      // Get pool data
      const { data: poolData, error: poolError } = await supabase
        .from('dex_pools')
        .select('*')
        .eq('pool_address', poolAddress)
        .single();

      if (poolError || !poolData) {
        return new Response(JSON.stringify({ error: 'Pool not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate LP tokens to mint
      // For simplicity, using geometric mean for initial liquidity
      const reserve0 = parseFloat(poolData.reserve0);
      const reserve1 = parseFloat(poolData.reserve1);
      
      let lpTokens: number;
      if (reserve0 === 0 && reserve1 === 0) {
        // Initial liquidity
        lpTokens = Math.sqrt(parseFloat(token0Amount) * parseFloat(token1Amount));
      } else {
        // Subsequent liquidity
        const liquidity0 = (parseFloat(token0Amount) * reserve0) / reserve0;
        const liquidity1 = (parseFloat(token1Amount) * reserve1) / reserve1;
        lpTokens = Math.min(liquidity0, liquidity1);
      }

      // Update pool reserves
      const newReserve0 = reserve0 + parseFloat(token0Amount);
      const newReserve1 = reserve1 + parseFloat(token1Amount);

      await supabase
        .from('dex_pools')
        .update({
          reserve0: newReserve0,
          reserve1: newReserve1,
          updated_at: new Date().toISOString()
        })
        .eq('id', poolData.id);

      // Record liquidity operation
      await supabase
        .from('dex_liquidity_operations')
        .insert({
          pool_id: poolData.id,
          user_address: userAddress,
          operation_type: 'add',
          token0_amount: parseFloat(token0Amount),
          token1_amount: parseFloat(token1Amount),
          lp_tokens: lpTokens,
          status: 'completed'
        });

      return new Response(JSON.stringify({
        success: true,
        lpTokens: lpTokens.toString(),
        message: 'Liquidity added successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'remove' && req.method === 'POST') {
      const body = await req.json();
      const { poolAddress, lpTokens, userAddress } = body;

      // Get pool data
      const { data: poolData, error: poolError } = await supabase
        .from('dex_pools')
        .select('*')
        .eq('pool_address', poolAddress)
        .single();

      if (poolError || !poolData) {
        return new Response(JSON.stringify({ error: 'Pool not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Calculate tokens to return (proportional to LP tokens)
      const reserve0 = parseFloat(poolData.reserve0);
      const reserve1 = parseFloat(poolData.reserve1);
      const lpTokensNum = parseFloat(lpTokens);
      
      // For simplicity, assume total LP supply equals reserves geometric mean
      const totalLPSupply = Math.sqrt(reserve0 * reserve1);
      const shareRatio = lpTokensNum / totalLPSupply;
      
      const token0Amount = reserve0 * shareRatio;
      const token1Amount = reserve1 * shareRatio;

      // Update pool reserves
      const newReserve0 = reserve0 - token0Amount;
      const newReserve1 = reserve1 - token1Amount;

      await supabase
        .from('dex_pools')
        .update({
          reserve0: newReserve0,
          reserve1: newReserve1,
          updated_at: new Date().toISOString()
        })
        .eq('id', poolData.id);

      // Record liquidity operation
      await supabase
        .from('dex_liquidity_operations')
        .insert({
          pool_id: poolData.id,
          user_address: userAddress,
          operation_type: 'remove',
          token0_amount: token0Amount,
          token1_amount: token1Amount,
          lp_tokens: lpTokensNum,
          status: 'completed'
        });

      return new Response(JSON.stringify({
        success: true,
        token0Amount: token0Amount.toString(),
        token1Amount: token1Amount.toString(),
        message: 'Liquidity removed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'positions') {
      const userAddress = searchParams.get('userAddress');
      
      if (!userAddress) {
        return new Response(JSON.stringify({ error: 'User address required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: positions, error } = await supabase
        .from('dex_liquidity_operations')
        .select(`
          *,
          dex_pools(*)
        `)
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ positions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in dex-liquidity function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});