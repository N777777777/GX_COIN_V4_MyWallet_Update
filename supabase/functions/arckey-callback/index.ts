import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('ArcKey callback received:', req.method)

    if (req.method === 'POST') {
      const body = await req.json()
      console.log('ArcKey callback data:', body)

      const { payment_id, status, transaction_hash, amount, currency } = body

      if (!payment_id) {
        throw new Error('Payment ID is required')
      }

      // العثور على السجل في قاعدة البيانات
      const { data: payment, error: fetchError } = await supabase
        .from('arcpay_payments')
        .select('*')
        .eq('payment_id', payment_id)
        .single()

      if (fetchError || !payment) {
        console.error('Payment not found:', fetchError)
        throw new Error('Payment not found')
      }

      // تحديث حالة الدفع
      const { error: updateError } = await supabase
        .from('arcpay_payments')
        .update({
          status: status || 'completed',
          transaction_hash: transaction_hash,
          completed_at: new Date().toISOString(),
          callback_data: body
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Error updating payment:', updateError)
        throw updateError
      }

      // إذا كان الدفع ناجحاً، إضافة الرصيد للمستخدم بشكل آمن
      if (status === 'completed' || status === 'success') {
        // الحصول على telegram_id
        const { data: userData } = await supabase
          .from('telegram_users')
          .select('telegram_id')
          .eq('id', payment.telegram_user_id)
          .single();

        if (userData) {
          // استخدام edge function الآمن لتحديث الرصيد
          const { error: balanceError } = await supabase.functions.invoke('secure-balance-update', {
            body: {
              telegram_id: userData.telegram_id,
              balance_type: 'ton_balance',
              amount: payment.amount,
              operation: 'add',
              source: 'arckey_payment',
              metadata: {
                payment_id: payment_id,
                transaction_hash: transaction_hash
              }
            }
          });

          if (balanceError) {
            console.error('Error updating user balance:', balanceError)
            throw balanceError
          }
        }

        // إنشاء سجل شراء TON
        const { error: purchaseError } = await supabase
          .from('ton_purchases')
          .insert({
            telegram_user_id: payment.telegram_user_id,
            ton_amount: payment.amount,
            coin_amount: 0,
            transaction_hash: transaction_hash || payment_id,
            status: 'completed',
            verified: true,
            verification_status: 'verified_arckey',
            completed_at: new Date().toISOString()
          })

        if (purchaseError) {
          console.error('Error creating purchase record:', purchaseError)
        }

        console.log(`Payment ${payment_id} completed successfully for user ${payment.telegram_user_id}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Callback processed successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } else if (req.method === 'GET') {
      // معالجة استعلامات الحالة
      const url = new URL(req.url)
      const payment_id = url.searchParams.get('payment_id')

      if (!payment_id) {
        throw new Error('Payment ID is required')
      }

      const { data: payment, error } = await supabase
        .from('arcpay_payments')
        .select('*')
        .eq('payment_id', payment_id)
        .single()

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: {
            id: payment.payment_id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            created_at: payment.created_at,
            completed_at: payment.completed_at
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )

  } catch (error) {
    console.error('Error in ArcKey callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})