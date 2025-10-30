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

    console.log(`Notifying draw creator for draw: ${drawData.id}`)

    // الحصول على بيانات منشئ المسابقة
    const { data: creatorData, error: creatorError } = await supabase
      .from('telegram_users')
      .select('telegram_id, username, first_name')
      .eq('id', drawData.creator_id)
      .single()

    if (creatorError || !creatorData) {
      console.error('Error fetching creator data:', creatorError)
      throw new Error('Could not find draw creator')
    }

    // إنشاء قائمة بأسماء المستخدمين للفائزين
    let winnersInfo = ''
    
    if (winners && winners.length > 0) {
      winnersInfo = '\n🏆 *الفائزون:*\n\n'
      
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i]
        
        // الحصول على معلومات المستخدم الفائز
        const { data: winnerData, error: winnerError } = await supabase
          .from('telegram_users')
          .select('first_name, last_name, username')
          .eq('telegram_id', winner.telegram_user_id)
          .single()

        let winnerName = `المستخدم ${winner.telegram_user_id}`
        if (winnerData && !winnerError) {
          if (winnerData.username) {
            winnerName = `@${winnerData.username}`
          } else if (winnerData.first_name) {
            winnerName = winnerData.first_name
            if (winnerData.last_name) {
              winnerName += ` ${winnerData.last_name}`
            }
          }
        }

        const position = i + 1
        const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅'
        
        winnersInfo += `${positionEmoji} المركز ${position}: ${winnerName}\n`
      }
    } else {
      winnersInfo = '\n😔 لم يشارك أحد في هذه المسابقة'
    }

    // إنشاء رسالة لمنشئ المسابقة
    const channelInfo = drawData.channel_username ? 
      (drawData.channel_username.startsWith('@') ? drawData.channel_username : `@${drawData.channel_username}`) 
      : 'قناتك'

    const message = `📊 *تقرير نتائج المسابقة* 📊

🏆 *المسابقة*: ${drawData.title}
📢 *القناة*: ${channelInfo}
📅 *انتهت في*: ${new Date(drawData.ends_at).toLocaleString('ar-EG')}
👥 *إجمالي المشاركين*: ${drawData.total_participants || 0}

${winnersInfo}

📋 *ملخص المسابقة:*
📝 الوصف: ${drawData.description || 'لا يوجد وصف'}
🎁 الجائزة: ${drawData.prize_description || 'غير محددة'}

🤖 شكراً لك على إنشاء هذه المسابقة الرائعة!`

    console.log(`Sending notification to creator: ${creatorData.telegram_id}`)
    console.log(`Message content: ${message}`)

    // إرسال الرسالة لمنشئ المسابقة
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: creatorData.telegram_id,
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

    console.log(`Creator notification sent successfully to: ${creatorData.telegram_id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Creator notification sent successfully',
        telegram_message_id: telegramResult.result.message_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending creator notification:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send creator notification',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})