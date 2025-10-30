// Admin function to create campaigns
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { 
      campaignName,
      paymentType = 'ton',
      liquidityAmount,
      imageUrl = null,
      channelUsername,
      status = 'active'
    } = await req.json();

    // Create campaign directly with service role
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        campaign_name: campaignName,
        payment_type: paymentType,
        liquidity_amount: liquidityAmount,
        campaign_image_url: imageUrl || `https://via.placeholder.com/300x200/4f46e5/ffffff?text=${encodeURIComponent(campaignName)}`,
        channel_username: channelUsername,
        creator_id: '00000000-0000-0000-0000-000000000000',
        creator_telegram_id: 123456789,
        status: status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Campaign created successfully:', campaign);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign,
        message: 'Campaign created and published successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-campaign-admin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});