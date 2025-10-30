import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Checking for new pending tasks ===')
    
    // فحص المهام المعلقة الجديدة (التي تم إنشاؤها في آخر 10 دقائق)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: newPendingTasks, error } = await supabase
      .from('pending_tasks')
      .select(`
        *,
        telegram_users!inner(telegram_id, first_name, username)
      `)
      .eq('status', 'pending')
      .gte('created_at', tenMinutesAgo)
    
    if (error) {
      console.error('Error fetching new pending tasks:', error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    console.log(`Found ${newPendingTasks?.length || 0} new pending tasks`)

    if (newPendingTasks && newPendingTasks.length > 0) {
      // إرسال إشعار للإدارة لكل مهمة جديدة
      for (const task of newPendingTasks) {
        const user = task.telegram_users
        const adminMessage = `🔔 مهمة جديدة تحتاج مراجعة:

👤 المستخدم: ${user.first_name} (@${user.username || 'غير محدد'})
🆔 معرف التليجرام: ${user.telegram_id}
📋 المهمة: ${task.task_title}
🔢 UID: ${task.uid}
🔗 الرابط: ${task.campaign_link || 'غير محدد'}
⏰ وقت التقديم: ${new Date(task.created_at).toLocaleString('ar-EG')}

الرجاء مراجعة المهمة والتحقق من صحة المشاركة.

يمكنك الرد على هذه الرسالة بـ:
✅ APPROVE ${task.id} - لقبول المهمة
❌ REJECT ${task.id} [السبب] - لرفض المهمة`

        // إرسال للإدارة
        const ADMIN_CHAT_ID = 138370 // معرف الإدارة الحالي
        await sendTelegramMessage(ADMIN_CHAT_ID, adminMessage)

        console.log(`Notified admin about new pending task: ${task.task_title} from user ${user.telegram_id}`)
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Processed ${newPendingTasks.length} new pending tasks`,
        tasks: newPendingTasks.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No new pending tasks found',
      tasks: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in check-pending-tasks:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      console.error('Failed to send telegram message:', await response.text())
      return false
    }

    console.log(`Successfully sent telegram message to ${chatId}`)
    return true
  } catch (error) {
    console.error('Error sending telegram message:', error)
    return false
  }
}