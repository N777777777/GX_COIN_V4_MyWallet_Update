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
    const { drawData, winners } = await req.json()
    
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not found')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // إنشاء رسالة إعلان النتائج
    let message = `🎉 *انتهت السحبة: ${drawData.title}*\n\n`
    message += `📝 الوصف: ${drawData.description || 'لا يوجد وصف'}\n`
    message += `🏆 الجائزة: ${drawData.prize_description || 'غير محددة'}\n\n`

    if (winners && winners.length > 0) {
      message += `🎊 *المبروك للفائزين:*\n\n`
      
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i]
        
        // الحصول على معلومات المستخدم الفائز
        const { data: userData, error: userError } = await supabase
          .from('telegram_users')
          .select('first_name, last_name, username')
          .eq('telegram_id', winner.telegram_user_id)
          .single()

        let winnerName = `المستخدم ${winner.telegram_user_id}`
        if (userData && !userError) {
          if (userData.username) {
            winnerName = `@${userData.username}`
          } else if (userData.first_name) {
            winnerName = userData.first_name
            if (userData.last_name) {
              winnerName += ` ${userData.last_name}`
            }
          }
        } else {
          // إذا لم نجد البيانات، نحاول البحث بطريقة أخرى
          console.log(`Could not find user data for telegram_id: ${winner.telegram_user_id}`)
        }

        const position = i + 1
        const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅'
        
        message += `${positionEmoji} المركز ${position}: ${winnerName}\n`
      }
      
      message += `\n✨ مبروك للفائزين! سيتم التواصل معكم قريباً.\n`
    } else {
      message += `😔 *لم يشارك أحد في هذه السحبة*\n\n`
      message += `💔 لم يتم اختيار أي فائز لعدم وجود مشاركين.\n`
    }

    message += `\n📅 تاريخ انتهاء السحبة: ${new Date(drawData.ends_at).toLocaleString('ar-EG')}\n`
    message += `\n🤖 @${drawData.channel_username || 'قناتنا'}`

    console.log(`Attempting to send message to channel: ${drawData.channel_id}`)
    console.log(`Message content: ${message}`)

    // التحقق من أن البوت admin في القناة
    const adminCheckResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: drawData.channel_id,
        user_id: BOT_TOKEN.split(':')[0] // Bot ID من Token
      })
    })

    const adminCheck = await adminCheckResponse.json()
    console.log('Bot admin status:', adminCheck)

    if (!adminCheck.ok || !['administrator', 'creator'].includes(adminCheck.result?.status)) {
      console.error('Bot is not admin in channel:', adminCheck)
      throw new Error(`البوت ليس admin في القناة. Status: ${adminCheck.result?.status || 'unknown'}`)
    }

    // إرسال الرسالة للقناة
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: drawData.channel_id,
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

    console.log(`تم إعلان نتائج السحبة ${drawData.title} في القناة ${drawData.channel_username}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Winners announced successfully',
        telegram_message_id: telegramResult.result.message_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error announcing winners:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to announce winners',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})