import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CancelTaskRequest {
  taskId: string;
  userTelegramId: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { taskId, userTelegramId }: CancelTaskRequest = await req.json()

    if (!taskId || !userTelegramId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Cancelling task:', taskId, 'for user:', userTelegramId)

    // البحث عن المستخدم في قاعدة البيانات
    const { data: userData, error: userError } = await supabaseClient
      .from('telegram_users')
      .select('id, coins, ton_balance')
      .eq('telegram_id', userTelegramId)
      .single()

    if (userError || !userData) {
      console.error('User not found:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // البحث عن المهمة والتحقق من الملكية
    const { data: taskData, error: taskError } = await supabaseClient
      .from('user_created_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('creator_telegram_id', userTelegramId)
      .eq('status', 'active')
      .single()

    if (taskError || !taskData) {
      console.error('Task not found or not owned by user:', taskError)
      return new Response(
        JSON.stringify({ error: 'Task not found or not owned by user' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // حساب المبلغ المسترد (50% من الميزانية الإجمالية)
    const refundAmount = taskData.total_budget * 0.5
    
    console.log('Current user coins:', userData.coins, 'Current TON balance:', userData.ton_balance, 'Refund amount:', refundAmount, 'New TON balance will be:', userData.ton_balance + refundAmount)

    // تحديث حالة المهمة إلى cancelled
    const { error: updateTaskError } = await supabaseClient
      .from('user_created_tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId)

    if (updateTaskError) {
      console.error('Error updating task status:', updateTaskError)
      return new Response(
        JSON.stringify({ error: 'Failed to cancel task' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // إرجاع 50% من المبلغ للمستخدم كـ TON باستخدام النظام الآمن
    const { error: updateUserError } = await supabaseClient.functions.invoke('secure-balance-update', {
      body: {
        telegram_id: userTelegramId,
        balance_type: 'ton_balance',
        amount: refundAmount,
        operation: 'add',
        source: 'task_cancellation_refund',
        metadata: {
          task_id: taskId,
          total_budget: taskData.total_budget,
          refund_percentage: 50
        }
      }
    });

    if (updateUserError) {
      console.error('Error updating user balance:', updateUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to refund amount' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Task cancelled successfully. Refunded:', refundAmount, 'to user:', userData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        refundAmount: refundAmount,
        totalBudget: taskData.total_budget,
        message: `تم إلغاء المهمة وإرجاع ${refundAmount} TON (50% من ${taskData.total_budget} TON)`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cancel-user-task function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})