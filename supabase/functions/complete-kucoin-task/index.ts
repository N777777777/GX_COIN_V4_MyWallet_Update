import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const { telegram_id } = await req.json()

      if (!telegram_id) {
        return new Response(
          JSON.stringify({ error: 'telegram_id is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Starting KUCOIN task completion for telegram_id: ${telegram_id}`)

      // البحث عن المستخدم
      const { data: user, error: userError } = await supabase
        .from('telegram_users')
        .select('id, telegram_id, first_name, last_name, username, coins, ton_balance')
        .eq('telegram_id', telegram_id)
        .single()

      if (userError || !user) {
        console.error('User not found:', userError)
        return new Response(
          JSON.stringify({ 
            error: 'User not found', 
            telegram_id: telegram_id 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`User found: ${JSON.stringify(user)}`)

      // التحقق من وجود المهمة مسبقاً
      const { data: existingTask } = await supabase
        .from('completed_tasks')
        .select('id, completed_at')
        .eq('telegram_user_id', user.id)
        .eq('task_id', '6')
        .single()

      if (existingTask) {
        console.log('Task already completed')
        return new Response(
          JSON.stringify({ 
            error: 'KUCOIN task already completed',
            user: user,
            completed_at: existingTask.completed_at
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // إنشاء UID تلقائي
      const auto_uid = `AUTO_${telegram_id}_${Date.now()}`

      // إدراج المهمة في completed_tasks
      const { error: insertError } = await supabase
        .from('completed_tasks')
        .insert({
          telegram_user_id: user.id,
          task_id: '6',
          task_title: 'KUCOIN',
          task_type: 'platform',
          reward_amount: 0.64,
          uid: auto_uid,
          campaign_link: 'https://t.me/G_COIN_V3/9185',
          completed_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error inserting task:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to complete task',
            details: insertError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Task inserted successfully')

      // إضافة 0.64 TON للمستخدم
      const tonReward = 0.64
      const newTonBalance = (user.ton_balance || 0) + tonReward
      const { data: updatedUser, error: updateError } = await supabase
        .from('telegram_users')
        .update({ 
          ton_balance: newTonBalance,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('ton_balance')
        .single()

      if (updateError) {
        console.error('Error updating user TON balance:', updateError)
        return new Response(
          JSON.stringify({ 
            warning: 'Task completed but failed to add TON balance',
            user: user,
            uid: auto_uid,
            details: updateError.message
          }),
          { 
            status: 206, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Successfully completed KUCOIN task for user ${user.first_name || user.username || user.telegram_id}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'KUCOIN task completed successfully',
          user: {
            telegram_id: user.telegram_id,
            name: user.first_name || user.username || 'غير محدد',
            ton_balance_before: user.ton_balance || 0,
            ton_balance_after: newTonBalance
          },
          task: {
            task_id: '6',
            task_title: 'KUCOIN',
            reward_amount: 0.64,
            uid: auto_uid,
            completed_at: new Date().toISOString()
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // GET request - عرض معلومات المستخدم فقط
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const telegram_id = url.searchParams.get('telegram_id')

      if (!telegram_id) {
        return new Response(
          JSON.stringify({ error: 'telegram_id parameter is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // البحث عن المستخدم
      const { data: user, error: userError } = await supabase
        .from('telegram_users')
        .select('id, telegram_id, first_name, last_name, username, coins')
        .eq('telegram_id', telegram_id)
        .single()

      if (userError || !user) {
        return new Response(
          JSON.stringify({ 
            error: 'User not found', 
            telegram_id: telegram_id 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // التحقق من حالة مهمة KUCOIN
      const { data: kucoinTask } = await supabase
        .from('completed_tasks')
        .select('id, completed_at, uid')
        .eq('telegram_user_id', user.id)
        .eq('task_id', '6')
        .single()

      return new Response(
        JSON.stringify({ 
          user: user,
          kucoin_task: kucoinTask ? {
            status: 'completed',
            completed_at: kucoinTask.completed_at,
            uid: kucoinTask.uid
          } : {
            status: 'not_completed'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})