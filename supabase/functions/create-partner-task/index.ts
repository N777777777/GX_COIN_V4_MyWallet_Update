import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('Received request body:', requestBody)
    
    const { 
      telegram_id, 
      task_title, 
      task_description, 
      reward_amount, 
      task_url, 
      partner_name,
      max_participants,
      ton_cost
    } = requestBody

    if (!telegram_id || !task_title || !reward_amount || !task_url || !max_participants || !ton_cost) {
      console.error('Missing required fields:', { telegram_id, task_title, reward_amount, task_url, max_participants, ton_cost })
      return new Response(
        JSON.stringify({ success: false, message: 'البيانات المطلوبة ناقصة' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // الحصول على بيانات المستخدم
    console.log('Looking for user with telegram_id:', telegram_id)
    const { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id, ton_balance, first_name, username')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'المستخدم غير موجود' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // التحقق من كفاية رصيد TON
    if (user.ton_balance < ton_cost) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `رصيد TON غير كافي. تحتاج ${ton_cost} TON لإنشاء هذه المهمة`,
          required_balance: ton_cost,
          current_balance: user.ton_balance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // خصم رصيد TON
    const { error: deductError } = await supabase
      .from('telegram_users')
      .update({ ton_balance: user.ton_balance - ton_cost })
      .eq('id', user.id)

    if (deductError) {
      console.error('Error deducting TON balance:', deductError)
      return new Response(
        JSON.stringify({ success: false, message: 'خطأ في خصم رصيد TON' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // إنشاء المهمة باستخدام الدالة الموجودة
    const { data: result, error: taskError } = await supabase.rpc('create_partner_task', {
      creator_telegram_id: telegram_id,
      task_title,
      task_description,
      reward_amount,
      task_url,
      partner_name,
      max_participants
    })

    if (taskError || !result?.success) {
      // إعادة الرصيد في حالة فشل إنشاء المهمة
      await supabase
        .from('telegram_users')
        .update({ ton_balance: user.ton_balance })
        .eq('id', user.id)

      console.error('Error creating partner task:', taskError, result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: result?.message || taskError?.message || 'خطأ في إنشاء المهمة' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إنشاء المهمة بنجاح! تم خصم ${ton_cost} TON`,
        task_id: result?.task_id || null,
        deducted_amount: ton_cost,
        remaining_balance: user.ton_balance - ton_cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-partner-task function:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'خطأ في الخادم' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})