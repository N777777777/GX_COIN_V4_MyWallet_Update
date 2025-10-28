import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id, user_telegram_id } = await req.json();
    
    if (!task_id || !user_telegram_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "معرف المهمة ومعرف المستخدم مطلوبان" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // إنشاء عميل Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // الحصول على بيانات المهمة
    const { data: taskData, error: taskError } = await supabase
      .from('user_created_tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError || !taskData) {
      console.error('Task not found:', taskError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "المهمة غير موجودة" 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // التحقق من أن المهمة نشطة
    if (taskData.status !== 'active') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "المهمة غير نشطة" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // التحقق من عدم اكتمال المهمة
    if (taskData.current_participants >= taskData.required_participants) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "تم الوصول للعدد المطلوب من المشاركين" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "خطأ في إعدادات البوت" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // استخراج اسم القناة من الرابط
    let channelUsername = taskData.channel_or_post_link;
    
    // إزالة البارامترات من الرابط
    channelUsername = channelUsername.split('?')[0].split('#')[0];
    
    if (channelUsername.includes('t.me/')) {
      const parts = channelUsername.split('/');
      channelUsername = '@' + parts[parts.length - 1];
    }
    if (!channelUsername.startsWith('@')) {
      channelUsername = '@' + channelUsername;
    }

    console.log('Checking membership for user', user_telegram_id, 'in channel', channelUsername);

    // أولاً، محاولة الحصول على معرف القناة الرقمي
    let chatId = channelUsername;
    try {
      const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelUsername }),
      });
      
      const chatData = await chatResponse.json();
      if (chatData.ok) {
        chatId = chatData.result.id; // استخدام المعرف الرقمي
        console.log('Found channel ID:', chatId);
      }
    } catch (error) {
      console.log('Could not get channel ID, using username:', channelUsername);
    }

    // التحقق من عضوية المستخدم في القناة
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: user_telegram_id
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('Error checking membership:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'تعذر التحقق من العضوية. تأكد من انضمامك للقناة أولاً ثم حاول مرة أخرى' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const member = data.result;
    const isMember = ['member', 'administrator', 'creator'].includes(member.status);
    
    if (!isMember) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "المستخدم ليس عضواً في القناة" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // الحصول على بيانات المستخدم
    const { data: userData, error: userError } = await supabase
      .from('telegram_users')
      .select('id')
      .eq('telegram_id', user_telegram_id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "المستخدم غير موجود في قاعدة البيانات" 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // التحقق من عدم مشاركة المستخدم مسبقاً
    const { data: existingParticipation } = await supabase
      .from('user_task_participants')
      .select('id')
      .eq('task_id', task_id)
      .eq('participant_telegram_id', user_telegram_id)
      .maybeSingle();

    if (existingParticipation) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "لقد شاركت في هذه المهمة مسبقاً" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // إضافة المستخدم كمشارك
    const { error: participantError } = await supabase
      .from('user_task_participants')
      .insert({
        task_id: task_id,
        participant_id: userData.id,
        participant_telegram_id: user_telegram_id,
        verification_status: 'verified',
        submission_data: {
          verified_at: new Date().toISOString(),
          channel: channelUsername
        }
      });

    if (participantError) {
      console.error('Error adding participant:', participantError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "خطأ في إضافة المشارك" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // تحديث عدد المشاركين وإضافة المكافأة للمستخدم
    const newParticipantCount = taskData.current_participants + 1;
    const isTaskComplete = newParticipantCount >= taskData.required_participants;

    // تحديث المهمة
    const { error: updateTaskError } = await supabase
      .from('user_created_tasks')
      .update({
        current_participants: newParticipantCount,
        status: isTaskComplete ? 'completed' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id);

    if (updateTaskError) {
      console.error('Error updating task:', updateTaskError);
    }

    // إضافة المكافأة للمستخدم باستخدام دالة آمنة
    const { data: newBalance, error: rewardError } = await supabase
      .rpc('increment_ton_balance', {
        user_id: userData.id,
        amount: taskData.reward_per_person
      });

    if (rewardError) {
      console.error('Error adding reward:', rewardError);
      // في حالة فشل إضافة المكافأة، نرجع خطأ
      return new Response(JSON.stringify({ 
        success: false, 
        error: "تم التحقق من العضوية لكن فشل في إضافة المكافأة" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // تحديث حالة المشارك لاستلام المكافأة
    await supabase
      .from('user_task_participants')
      .update({ reward_claimed: true })
      .eq('task_id', task_id)
      .eq('participant_telegram_id', user_telegram_id);

    console.log('User verified and reward added:', user_telegram_id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "تم التحقق من العضوية وإضافة المكافأة",
      reward_amount: taskData.reward_per_person,
      task_progress: `${newParticipantCount}/${taskData.required_participants}`,
      task_completed: isTaskComplete
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in verify-channel-membership function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "خطأ في التحقق من العضوية" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});