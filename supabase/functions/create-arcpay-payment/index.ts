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
    const arcpayApiKey = Deno.env.get('ARCPAY_API_KEY')!
    
    if (!arcpayApiKey) {
      throw new Error('ARCPAY_API_KEY is not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const body = await req.json()
      const { amount, telegram_user_id, telegram_id, description } = body

      console.log('Creating ArcPay payment:', { amount, telegram_user_id, description })

      // التحقق من البيانات المطلوبة
      if (!amount || !telegram_user_id || amount <= 0) {
        throw new Error('Invalid payment data')
      }

      // إنشاء payment_id فريد
      const payment_id = `payment_${Date.now()}_${telegram_user_id}`
      const callback_url = `${supabaseUrl}/functions/v1/arckey-callback`

      // إنشاء فاتورة ArcPay
      const arcpayPayload = {
        amount: parseFloat(amount),
        currency: 'TON',
        description: description || `شراء ${amount} TON عبر G Coin`,
        external_id: payment_id,
        callback_url: callback_url,
        success_url: `https://yyjxkogzsqiekbawwhgf.supabase.co/payment-success?payment_id=${payment_id}&amount=${amount}`,
        cancel_url: `https://yyjxkogzsqiekbawwhgf.supabase.co/payment-cancel?payment_id=${payment_id}`
      }

      console.log('Sending to ArcPay:', arcpayPayload)

      // استدعاء ArcPay API
      const arcpayResponse = await fetch('https://api.arcpay.io/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${arcpayApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(arcpayPayload)
      })

      if (!arcpayResponse.ok) {
        const errorText = await arcpayResponse.text()
        console.error('ArcPay API error:', errorText)
        throw new Error(`ArcPay API failed: ${arcpayResponse.status}`)
      }

      const arcpayData = await arcpayResponse.json()
      console.log('ArcPay response:', arcpayData)

      // حفظ معلومات الدفع في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('arcpay_payments')
        .insert({
          payment_id: payment_id,
          telegram_user_id: telegram_user_id,
          telegram_id: telegram_id,
          amount: parseFloat(amount),
          currency: 'TON',
          status: 'pending',
          arcpay_invoice_id: arcpayData.id,
          payment_url: arcpayData.payment_url,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw insertError
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: payment_id,
          payment_url: arcpayData.payment_url,
          invoice_id: arcpayData.id,
          amount: amount,
          currency: 'TON'
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
    console.error('Error creating ArcPay payment:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})