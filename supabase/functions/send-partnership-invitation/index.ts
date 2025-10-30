import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { telegram_id, username, channel_link } = await req.json();

    console.log('Received partnership request:', { telegram_id, username, channel_link });

    if (!telegram_id || !username || !channel_link) {
      return new Response(
        JSON.stringify({ error: 'جميع الحقول مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id, telegram_id')
      .eq('telegram_id', telegram_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'المستخدم غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a pending or approved request
    const { data: existingRequest, error: checkError } = await supabase
      .from('partnership_requests')
      .select('id, status')
      .eq('telegram_user_id', user.id)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing request:', checkError);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء التحقق من الطلبات السابقة' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRequest) {
      const message = existingRequest.status === 'approved' 
        ? 'أنت شريك معتمد بالفعل'
        : 'لديك طلب شراكة قيد المراجعة';
      
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create partnership request
    const { data: request, error: insertError } = await supabase
      .from('partnership_requests')
      .insert({
        telegram_user_id: user.id,
        telegram_id: user.telegram_id,
        username,
        channel_link
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating partnership request:', insertError);
      return new Response(
        JSON.stringify({ error: 'حدث خطأ أثناء إرسال الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Partnership request created successfully:', request.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال طلب الشراكة بنجاح! سيتم مراجعته قريباً',
        request_id: request.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-partnership-invitation:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
