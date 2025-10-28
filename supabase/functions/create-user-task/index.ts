import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTaskRequest {
  channel_url: string;
  target_members: number;
  image?: File;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { channel_url, target_members, creator_telegram_id, image_data } = await req.json();
    
    if (!channel_url || !target_members || !creator_telegram_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'المعلومات المطلوبة ناقصة' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // استخراج اسم القناة من الرابط
    const channelUsername = channel_url.replace('https://t.me/', '').replace('@', '');
    
    // التحقق من المستخدم ورصيده
    const { data: userData, error: userError } = await supabase
      .from('telegram_users')
      .select('id, pepe_withdrawable_balance')
      .eq('telegram_id', creator_telegram_id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, message: 'المستخدم غير موجود' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // حساب التكلفة
    const memberOptions: Record<number, number> = {
      500: 150000,
      1000: 300000,
      5000: 1500000,
      10000: 3000000
    };

    const totalCost = memberOptions[target_members];
    if (!totalCost) {
      return new Response(
        JSON.stringify({ success: false, message: 'عدد الأعضاء غير صحيح' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (userData.pepe_withdrawable_balance < totalCost) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `رصيد PEPE غير كافي. تحتاج إلى ${totalCost.toLocaleString()} PEPE` 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // التحقق من أن البوت مشرف في القناة
    console.log('Checking bot admin status for channel:', channelUsername);
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'إعدادات البوت غير متوفرة' }),
        { headers: corsHeaders, status: 500 }
      );
    }

    try {
      // التحقق من معلومات القناة والبوت
      const channelInfoResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${channelUsername}`
      );
      
      if (!channelInfoResponse.ok) {
        const errorText = await channelInfoResponse.text();
        console.log('Error getting channel info:', errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'لا يمكن الوصول للقناة. تأكد من أن الرابط صحيح والقناة عامة' 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const channelInfo = await channelInfoResponse.json();
      console.log('Channel info:', channelInfo);

      if (!channelInfo.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'رابط القناة غير صحيح أو القناة غير متاحة' 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const channelId = channelInfo.result.id;

      // الحصول على معرف البوت أولاً
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botInfo = await botInfoResponse.json();
      const botId = botInfo.result.id;

      // التحقق من أن البوت مشرف في القناة
      const adminResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${botId}`
      );

      if (!adminResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'لا يمكن التحقق من صلاحيات البوت في القناة' 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const adminInfo = await adminResponse.json();
      console.log('Bot admin info:', adminInfo);

      if (!adminInfo.ok || !['administrator', 'creator'].includes(adminInfo.result.status)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'البوت ليس مشرف في القناة. يجب إضافة البوت كمشرف أولاً' 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }

      // رفع الصورة إذا كانت موجودة
      let imageUrl = null;
      if (image_data) {
        try {
          const imageBuffer = Uint8Array.from(atob(image_data), c => c.charCodeAt(0));
          const fileName = `task-images/${Date.now()}-${crypto.randomUUID()}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/jpeg'
            });

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
          } else {
            const { data: urlData } = supabase.storage
              .from('task-images')
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        } catch (imageError) {
          console.error('Error processing image:', imageError);
        }
      }

      // إنشاء المهمة
      const { data: taskData, error: taskError } = await supabase
        .from('user_created_tasks')
        .insert({
          creator_id: userData.id,
          creator_telegram_id: creator_telegram_id,
          channel_url: channel_url,
          channel_username: channelUsername,
          channel_id: channelId,
          target_members: target_members,
          total_cost: totalCost,
          image_url: imageUrl,
          bot_verified: true
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating task:', taskError);
        return new Response(
          JSON.stringify({ success: false, message: 'فشل في إنشاء المهمة' }),
          { headers: corsHeaders, status: 500 }
        );
      }

      // خصم التكلفة من رصيد المستخدم باستخدام النظام الآمن
      const { error: balanceError } = await supabase.functions.invoke('secure-balance-update', {
        body: {
          telegram_id: creator_telegram_id,
          balance_type: 'bal_w5r2t', // pepe_withdrawable_balance
          amount: totalCost,
          operation: 'subtract',
          source: 'user_task_creation',
          metadata: {
            task_id: task.id,
            channel_url: channel_url,
            total_members: total_members,
            cost_per_member: COST_PER_MEMBER
          }
        }
      });

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        // حذف المهمة في حال فشل خصم الرصيد
        await supabase.from('user_created_tasks').delete().eq('id', taskData.id);
        
        return new Response(
          JSON.stringify({ success: false, message: 'فشل في خصم الرصيد' }),
          { headers: corsHeaders, status: 500 }
        );
      }

      // نشر المهمة في القناة
      let messageText = `🎯 مهمة جديدة متاحة الآن!\n\n`;
      messageText += `📢 اشترك في هذه القناة واربح 50 PEPE عن كل اشتراك!\n\n`;
      messageText += `👥 العدد المطلوب: ${target_members.toLocaleString()} مشترك\n`;
      messageText += `💰 المكافأة: 50 PEPE لكل مشترك\n\n`;
      messageText += `للمشاركة: /join_task_${taskData.id}`;

      try {
        let publishResponse;
        if (imageUrl) {
          publishResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                photo: imageUrl,
                caption: messageText,
                parse_mode: 'HTML'
              })
            }
          );
        } else {
          publishResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                text: messageText,
                parse_mode: 'HTML'
              })
            }
          );
        }

        const publishResult = await publishResponse.json();
        console.log('Publish result:', publishResult);

        if (publishResult.ok) {
          // تحديث المهمة لتكون منشورة
          await supabase
            .from('user_created_tasks')
            .update({ published_to_channel: true })
            .eq('id', taskData.id);
        }
      } catch (publishError) {
        console.error('Error publishing to channel:', publishError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إنشاء المهمة ونشرها بنجاح! 🎉',
          task_id: taskData.id 
        }),
        { headers: corsHeaders }
      );

    } catch (telegramError) {
      console.error('Telegram API error:', telegramError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'خطأ في التواصل مع تليجرام. تأكد من صحة رابط القناة' 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in create-user-task:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'حدث خطأ غير متوقع' 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});