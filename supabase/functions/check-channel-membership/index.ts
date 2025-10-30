import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { user_id, channel_username } = await req.json();
    
    if (!user_id || !channel_username) {
      return new Response(
        JSON.stringify({ 
          is_member: false,
          error: 'معرف المستخدم واسم القناة مطلوبين',
          success: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ 
          is_member: false,
          error: 'إعدادات البوت غير مكتملة',
          success: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // إزالة @ من بداية اسم القناة إذا كانت موجودة
    const cleanChannelUsername = channel_username.startsWith('@') 
      ? channel_username.substring(1) 
      : channel_username;

    // التحقق من عضوية المستخدم في القناة
    const checkMemberUrl = `https://api.telegram.org/bot${botToken}/getChatMember`;
    
    console.log(`Checking membership for user ${user_id} in channel @${cleanChannelUsername}`);
    
    const memberResponse = await fetch(`${checkMemberUrl}?chat_id=@${cleanChannelUsername}&user_id=${user_id}`);
    
    if (!memberResponse.ok) {
      const errorText = await memberResponse.text();
      console.error('فشل في التحقق من عضوية القناة:', errorText);
      
      // محاولة استخدام معرف القناة الرقمي بدلاً من اسم المستخدم
      if (errorText.includes('PARTICIPANT_ID_INVALID') || errorText.includes('member list is inaccessible')) {
        // في هذه الحالة، سنقبل المستخدم (assume they are a member)
        console.log(`Cannot verify membership for @${cleanChannelUsername}, assuming user is member`);
        return new Response(
          JSON.stringify({ 
            is_member: true,
            status: 'assumed_member',
            message: 'لا يمكن التحقق من العضوية، تم قبول المشاركة',
            warning: 'verification_unavailable'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          is_member: false,
          error: 'خطأ في التحقق من عضوية القناة',
          success: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const memberData = await memberResponse.json();
    
    if (!memberData.ok) {
      return new Response(
        JSON.stringify({ 
          is_member: false,
          error: 'فشل في التحقق من العضوية', 
          success: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من حالة العضوية
    const memberStatus = memberData.result.status;
    const isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
    
    console.log(`User ${user_id} membership in @${cleanChannelUsername}: ${memberStatus}`);

    return new Response(
      JSON.stringify({ 
        is_member: isMember,
        status: memberStatus,
        message: isMember ? 'المستخدم عضو في القناة' : 'المستخدم ليس عضواً في القناة'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error checking channel membership:', error);
    return new Response(
      JSON.stringify({ 
        is_member: false,
        error: 'حدث خطأ في التحقق من عضوية القناة',
        details: error.message,
        success: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});