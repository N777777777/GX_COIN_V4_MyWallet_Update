import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Auto-processing withdrawals...')

    // استدعاء Edge Function معالجة السحب
    const { data, error } = await supabase.functions.invoke('process-withdrawals', {
      body: {}
    })

    if (error) {
      console.error('Error calling process-withdrawals:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'فشل في معالجة طلبات السحب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auto-processing result:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم تشغيل معالجة طلبات السحب التلقائية',
        result: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto-process withdrawals error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'حدث خطأ في المعالجة التلقائية' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})