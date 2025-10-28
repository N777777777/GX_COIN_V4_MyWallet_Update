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
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not found')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting to notify previous winners...')

    // الحصول على جميع الفائزين السابقين مع معلومات المسابقة
    const { data: previousWinners, error: winnersError } = await supabase
      .from('lucky_draw_winners')
      .select(`
        *,
        lucky_draws!inner(
          title,
          description,
          prize_description,
          channel_username,
          creator_id,
          telegram_users!lucky_draws_creator_id_fkey(
            username,
            first_name
          )
        )
      `)

    if (winnersError) {
      console.error('Error fetching previous winners:', winnersError)
      throw new Error('Failed to fetch previous winners')
    }

    if (!previousWinners || previousWinners.length === 0) {
      console.log('No previous winners found')
      return new Response(
        JSON.stringify({ message: 'No previous winners to notify' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${previousWinners.length} previous winners`)

    let successCount = 0
    let errorCount = 0

    // إرسال رسالة لكل فائز سابق
    for (const winner of previousWinners) {
      try {
        const drawData = winner.lucky_draws
        const creatorData = drawData.telegram_users

        // إنشاء معلومات المنشئ
        let creatorInfo = 'منشئ المسابقة'
        if (creatorData) {
          if (creatorData.username) {
            creatorInfo = `@${creatorData.username}`
          } else if (creatorData.first_name) {
            creatorInfo = creatorData.first_name
          }
        }

        // إنشاء معلومات القناة
        const channelInfo = drawData.channel_username ? 
          (drawData.channel_username.startsWith('@') ? drawData.channel_username : `@${drawData.channel_username}`) 
          : 'القناة'

        const message = `🎉 *تحديث: معلومات مسابقتك السابقة* 🎉

مبروك مرة أخرى! هذه معلومات محدثة عن المسابقة التي فزت بها:

🏆 *المسابقة*: ${drawData.title}
📝 *الوصف*: ${drawData.description || 'لا يوجد وصف'}
🎁 *الجائزة*: ${drawData.prize_description || 'غير محددة'}
📢 *القناة*: ${channelInfo}
👤 *منشئ المسابقة*: ${creatorInfo}
🏅 *مركزك*: المركز ${winner.prize_position}
📅 *تاريخ الفوز*: ${new Date(winner.selected_at).toLocaleString('ar-EG')}

✨ نشكرك على مشاركتك في مسابقاتنا!

🤖 تم إرسال هذه الرسالة كجزء من تحديث النظام.`

        console.log(`Sending update to previous winner: ${winner.telegram_user_id}`)

        // إرسال الرسالة للفائز السابق
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: winner.telegram_user_id,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        })

        const telegramResult = await telegramResponse.json()

        if (telegramResponse.ok) {
          console.log(`Update sent successfully to winner: ${winner.telegram_user_id}`)
          successCount++
        } else {
          console.error(`Failed to send update to winner ${winner.telegram_user_id}:`, telegramResult)
          errorCount++
        }

        // إضافة تأخير قصير لتجنب الـ rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing winner ${winner.telegram_user_id}:`, error)
        errorCount++
      }
    }

    console.log(`Notification process completed. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Previous winners notification completed',
        total_processed: previousWinners.length,
        successful_notifications: successCount,
        failed_notifications: errorCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in notify-previous-winners function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to notify previous winners',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})