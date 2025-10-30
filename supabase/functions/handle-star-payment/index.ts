import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    // التحقق من وجود دفعة النجوم
    if (update.pre_checkout_query) {
      // تأكيد استلام الدفعة
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: update.pre_checkout_query.id,
            ok: true
          })
        }
      );
      
      const result = await response.json();
      console.log('Pre-checkout response:', result);
    }

    // معالجة الدفع المكتمل
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const payload = JSON.parse(payment.invoice_payload);
      
      console.log('Payment completed:', {
        telegramChargeId: payment.telegram_payment_charge_id,
        payload: payload,
        amount: payment.total_amount
      });

      // حفظ الدفعة في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('star_payments')
        .insert({
          telegram_user_id: update.message.from.id,
          telegram_charge_id: payment.telegram_payment_charge_id,
          amount: payload.amount,
          payload: payload,
          status: 'completed'
        });

      if (insertError) {
        console.error('Error saving payment:', insertError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing star payment:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});