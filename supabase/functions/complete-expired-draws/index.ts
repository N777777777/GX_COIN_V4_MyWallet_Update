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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // البحث عن السحوبات النشطة التي انتهى وقتها
    const { data: expiredDraws, error: fetchError } = await supabase
      .from('lucky_draws')
      .select('*')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired draws:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired draws' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!expiredDraws || expiredDraws.length === 0) {
      console.log('No expired draws found')
      return new Response(
        JSON.stringify({ message: 'No expired draws to complete' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${expiredDraws.length} expired draws`)

    // معالجة كل سحبة منتهية
    for (const draw of expiredDraws) {
      try {
        // الحصول على المشاركين في السحبة
        const { data: participants, error: participantsError } = await supabase
          .from('lucky_draw_participants')
          .select('*')
          .eq('draw_id', draw.id)

        if (participantsError) {
          console.error(`Error fetching participants for draw ${draw.id}:`, participantsError)
          continue
        }

        console.log(`Draw ${draw.id} has ${participants?.length || 0} participants`)

        let winners = []

        // اختيار الفائزين إذا كان هناك مشاركين
        if (participants && participants.length > 0) {
          const winnerCount = Math.min(draw.winner_count || 1, participants.length)
          
          // خلط المشاركين واختيار الفائزين
          const shuffled = [...participants].sort(() => 0.5 - Math.random())
          const selectedWinners = shuffled.slice(0, winnerCount)

          // حفظ الفائزين في قاعدة البيانات
          for (let i = 0; i < selectedWinners.length; i++) {
            const winner = selectedWinners[i]
            const { error: winnerError } = await supabase
              .from('lucky_draw_winners')
              .insert({
                draw_id: draw.id,
                winner_id: winner.participant_id,
                telegram_user_id: winner.telegram_user_id,
                prize_position: i + 1,
                selected_at: new Date().toISOString()
              })

            if (winnerError) {
              console.error(`Error saving winner for draw ${draw.id}:`, winnerError)
            } else {
              winners.push(winner)
              console.log(`Winner ${winner.telegram_user_id} saved for draw ${draw.id}`)
            }
          }
        }

        // تحديث حالة السحبة إلى مكتملة
        const { error: updateError } = await supabase
          .from('lucky_draws')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', draw.id)

        if (updateError) {
          console.error(`Error updating draw ${draw.id}:`, updateError)
          continue
        }

        console.log(`Draw ${draw.id} marked as completed`)

        // إرسال إعلان الفائزين للقناة
        console.log(`Checking if should announce winners for draw ${draw.id}`)
        console.log(`Channel ID: ${draw.channel_id}, Channel Username: ${draw.channel_username}`)
        console.log(`Winners count: ${winners.length}`)
        
        if (draw.channel_id && draw.channel_username) {
          try {
            console.log(`Calling announce-winners function for draw ${draw.id}`)
            const { data: announceData, error: announceError } = await supabase.functions.invoke('announce-winners', {
              body: { 
                drawData: draw,
                winners: winners
              }
            })

            if (announceError) {
              console.error(`Error announcing winners for draw ${draw.id}:`, announceError)
            } else {
              console.log(`Winners announced successfully for draw ${draw.id}:`, announceData)
            }
          } catch (error) {
            console.error(`Failed to announce winners for draw ${draw.id}:`, error)
          }
        } else {
          console.log(`Skipping announcement for draw ${draw.id} - missing channel info`)
        }

        // إرسال إشعارات للفائزين
        for (const winner of winners) {
          try {
            console.log(`Sending notification to winner ${winner.telegram_user_id}`)
            const { data: notifyData, error: notifyError } = await supabase.functions.invoke('notify-winner', {
              body: { 
                winnerId: winner.telegram_user_id,
                drawData: draw
              }
            })

            if (notifyError) {
              console.error(`Error notifying winner ${winner.telegram_user_id}:`, notifyError)
            } else {
              console.log(`Notification sent to winner ${winner.telegram_user_id}:`, notifyData)
            }
          } catch (error) {
            console.error(`Failed to notify winner ${winner.telegram_user_id}:`, error)
          }
        }

        // إرسال إشعار لمنشئ المسابقة بالفائزين
        try {
          console.log(`Sending creator notification for draw ${draw.id}`)
          const { data: creatorNotifyData, error: creatorNotifyError } = await supabase.functions.invoke('notify-draw-creator', {
            body: { 
              drawData: draw,
              winners: winners
            }
          })

          if (creatorNotifyError) {
            console.error(`Error notifying draw creator for draw ${draw.id}:`, creatorNotifyError)
          } else {
            console.log(`Creator notification sent successfully for draw ${draw.id}:`, creatorNotifyData)
          }
        } catch (error) {
          console.error(`Failed to notify draw creator for draw ${draw.id}:`, error)
        }

      } catch (error) {
        console.error(`Error processing draw ${draw.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully completed ${expiredDraws.length} expired draws`,
        completedDraws: expiredDraws.map(d => d.id)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in complete-expired-draws function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})