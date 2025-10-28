import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TonClient } from "https://esm.sh/@ton/ton@15.3.1";
import { Address } from "https://esm.sh/@ton/core@0.61.0";

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
      const { minterAddress, userAddress } = body;

      if (!minterAddress) {
        return new Response(JSON.stringify({ error: 'Minter address required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate address format
      try {
        Address.parse(minterAddress);
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid minter address format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('jettons')
        .select('*')
        .eq('minter_address', minterAddress)
        .single();

      if (existingToken) {
        return new Response(JSON.stringify({ 
          error: 'Token already exists',
          token: existingToken 
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // In a real implementation, this would fetch token metadata from TON blockchain
      // For now, we'll create a placeholder token
      const tokenData = {
        minter_address: minterAddress,
        symbol: 'TOKEN' + Date.now().toString().slice(-4),
        name: 'Custom Token',
        decimals: 9,
        description: 'User-added token',
        verified: false,
        total_supply: 1000000000000000000 // 1B tokens with 9 decimals
      };

      // Simulate blockchain interaction delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Insert the new token
        const { data: newToken, error: insertError } = await supabase
          .from('jettons')
          .insert(tokenData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return new Response(JSON.stringify({
          success: true,
          token: newToken,
          message: 'Token added successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Error inserting token:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to add token to database' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'validate') {
      const minterAddress = searchParams.get('minterAddress');
      
      if (!minterAddress) {
        return new Response(JSON.stringify({ error: 'Minter address required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        // Validate address format
        Address.parse(minterAddress);

        // In a real implementation, this would query the TON blockchain
        // to verify the contract exists and get its metadata
        const isValid = minterAddress.startsWith('EQ') || minterAddress.startsWith('UQ');
        
        if (!isValid) {
          return new Response(JSON.stringify({
            valid: false,
            error: 'Invalid contract address'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Mock token metadata (in real implementation, fetch from blockchain)
        const tokenMetadata = {
          symbol: 'TOKEN',
          name: 'Sample Token',
          decimals: 9,
          totalSupply: '1000000000000000000'
        };

        return new Response(JSON.stringify({
          valid: true,
          metadata: tokenMetadata
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Invalid address format'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'search') {
      const query = searchParams.get('q') || '';
      
      let dbQuery = supabase
        .from('jettons')
        .select('*')
        .order('verified', { ascending: false })
        .order('created_at', { ascending: false });

      if (query) {
        dbQuery = dbQuery.or(`symbol.ilike.%${query}%,name.ilike.%${query}%,minter_address.ilike.%${query}%`);
      }

      const { data: tokens, error } = await dbQuery.limit(20);

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
    console.error('Error in dex-tokens function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});