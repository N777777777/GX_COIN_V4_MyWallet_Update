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
    const { winnerId, drawData } = await req.json()
    
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not found')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Sending notification to winner: ${winnerId}`)

    // الحصول على بيانات منشئ المسابقة
    const { data: creatorData, error: creatorError } = await supabase
      .from('telegram_users')
      .select('username, first_name, telegram_id')
      .eq('id', drawData.creator_id)
      .single()

    let creatorInfo = 'منشئ المسابقة'
    let creatorContact = ''
    if (creatorData && !creatorError) {
      if (creatorData.username) {
        creatorInfo = `@${creatorData.username}`
        creatorContact = `@${creatorData.username}`
      } else if (creatorData.first_name) {
        creatorInfo = creatorData.first_name
      }
      
      // إضافة معرف التليجرام
      if (creatorData.telegram_id) {
        creatorContact += creatorContact ? ` (ID: ${creatorData.telegram_id})` : `ID: ${creatorData.telegram_id}`
      }
    }

    // إنشاء رسالة تهنئة للفائز مع معلومات القناة ومنشئ المسابقة
    const channelInfo = drawData.channel_username ? 
      (drawData.channel_username.startsWith('@') ? drawData.channel_username : `@${drawData.channel_username}`) 
      : 'القناة'

    const message = `🎉 *مبروك! لقد فزت في السحبة!* 🎉

🏆 *السحبة*: ${drawData.title}
📝 *الوصف*: ${drawData.description || 'لا يوجد وصف'}
🎁 *الجائزة*: ${drawData.prize_description || 'غير محددة'}
📢 *القناة*: ${channelInfo}
👤 *منشئ المسابقة*: ${creatorInfo}
📞 *للتواصل مع منشئ السحب*: ${creatorContact}

✨ تهانينا على فوزك! تواصل مع منشئ السحب لاستلام الجائزة.

🤖 شكراً لمشاركتك في مسابقتنا!`

    // إرسال الرسالة للفائز
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: winnerId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    const telegramResult = await telegramResponse.json()
    console.log('Telegram send result:', telegramResult)

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult)
      throw new Error(`Telegram API error: ${telegramResult.description || 'Unknown error'}`)
    }

    console.log(`Notification sent successfully to winner: ${winnerId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Winner notification sent successfully',
        telegram_message_id: telegramResult.result.message_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending winner notification:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send winner notification',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})