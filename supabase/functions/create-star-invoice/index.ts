import { corsHeaders } from '../_shared/cors.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, userId } = await req.json();

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // إنشاء فاتورة نجوم التليجرام
    const invoiceData = {
      title: 'إنشاء سحب حظ',
      description: description || 'دفع رسوم إنشاء سحب حظ جديد',
      payload: JSON.stringify({ 
        type: 'lucky_draw_creation',
        userId: userId,
        amount: amount,
        timestamp: Date.now()
      }),
      provider_token: '', // فارغ للنجوم
      currency: 'XTR', // عملة النجوم
      prices: [{
        label: 'رسوم إنشاء السحب',
        amount: amount // بالنجوم
      }]
    };

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      }
    );

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }

    return new Response(JSON.stringify({
      success: true,
      invoice_link: result.result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating star invoice:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});