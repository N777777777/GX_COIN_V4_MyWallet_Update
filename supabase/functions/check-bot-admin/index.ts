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
    const { channel_link } = await req.json();
    
    if (!channel_link) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "رابط القناة مطلوب" 
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
    let channelUsername = channel_link.trim();
    
    console.log('Original channel link:', channelUsername);
    
    // إزالة المسافات والرموز الإضافية
    channelUsername = channelUsername.replace(/\s+/g, '');
    
    // إذا كان الرابط كاملاً، استخراج اسم القناة
    if (channelUsername.includes('t.me/')) {
      const parts = channelUsername.split('/');
      channelUsername = parts[parts.length - 1];
      
      // إزالة المعاملات إذا وجدت (مثل ?start=123)
      if (channelUsername.includes('?')) {
        channelUsername = channelUsername.split('?')[0];
      }
    }
    
    // إزالة @ إذا كانت موجودة لإعادة إضافتها بشكل صحيح
    if (channelUsername.startsWith('@')) {
      channelUsername = channelUsername.substring(1);
    }
    
    // إضافة @ في البداية
    channelUsername = '@' + channelUsername;
    
    console.log('Processed channel username:', channelUsername);

    console.log('Checking bot admin status for channel:', channelUsername);

    // أولاً، الحصول على معرف البوت
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfoData = await botInfoResponse.json();
    
    if (!botInfoData.ok) {
      console.error('Error getting bot info:', botInfoData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "خطأ في الحصول على معلومات البوت" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const botId = botInfoData.result.id;
    console.log('Bot ID:', botId);

    // التحقق من أن البوت أدمن في القناة
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelUsername,
        user_id: botId
      }),
    });

    const data = await response.json();
    
    console.log('Telegram API response:', data);
    
    if (!data.ok) {
      console.error('Telegram API Error:', {
        error_code: data.error_code,
        description: data.description,
        channel: channelUsername,
        bot_token_exists: !!botToken
      });
      
      let errorMessage = "خطأ في التحقق من القناة";
      
      if (data.error_code === 400) {
        if (data.description?.includes('chat not found')) {
          errorMessage = `القناة ${channelUsername} غير موجودة أو البوت لا يستطيع الوصول إليها. تأكد من:
• اسم القناة صحيح
• القناة عامة أو البوت مضاف إليها
• البوت ليس محظور من القناة`;
        } else if (data.description?.includes('user not found')) {
          errorMessage = "البوت غير موجود أو معطل";
        } else {
          errorMessage = `خطأ: ${data.description}`;
        }
      } else if (data.error_code === 403) {
        errorMessage = "البوت لا يملك صلاحية الوصول لهذه القناة";
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: {
          channel: channelUsername,
          telegram_error: data.description,
          error_code: data.error_code
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const member = data.result;
    const isAdmin = member.status === 'administrator' || member.status === 'creator';
    
    console.log('Bot status in channel:', member.status);
    console.log('Is admin:', isAdmin);
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `البوت ليس أدمن في القناة ${channelUsername}
        
حالة البوت الحالية: ${member.status}

لحل هذه المشكلة:
1. ادخل للقناة ${channelUsername}
2. اذهب لإعدادات القناة
3. أضف البوت كأدمن مع الصلاحيات المطلوبة
4. تأكد من أن البوت يمكنه دعوة المستخدمين` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // التحقق من صلاحيات البوت
    if (member.status === 'administrator') {
      // التحقق من الصلاحيات المطلوبة
      if (!member.can_manage_chat && !member.can_invite_users) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "البوت لا يملك الصلاحيات المطلوبة (إدارة المحادثة أو دعوة المستخدمين)" 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    console.log('Bot is admin in channel:', channelUsername, 'with status:', member.status);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `البوت أدمن في القناة ${channelUsername}`,
      channel_info: {
        username: channelUsername,
        bot_status: member.status,
        bot_id: botId,
        permissions: member.status === 'administrator' ? {
          can_manage_chat: member.can_manage_chat || false,
          can_invite_users: member.can_invite_users || false,
          can_delete_messages: member.can_delete_messages || false
        } : 'creator_all_permissions'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in check-bot-admin function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "خطأ في التحقق من القناة" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});