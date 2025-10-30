import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LuckyDrawData {
  id: string;
  title: string;
  description: string;
  channel_username: string;
  channel_id?: number;
  mandatory_channel_username?: string;
  mandatory_channel_id?: number;
  require_channel_subscription: boolean;
  entry_fee: number;
  max_participants?: number;
  winner_count: number;
  prize_description: string;
  ends_at: string;
  image_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting send-draw-to-channel function');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { drawData } = await req.json() as { drawData: LuckyDrawData };
    
    console.log('Received draw data:', JSON.stringify(drawData, null, 2));
    
    if (!drawData) {
      console.error('No draw data provided');
      return new Response(
        JSON.stringify({ error: 'بيانات السحبة مطلوبة' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found');
      return new Response(
        JSON.stringify({ error: 'إعدادات البوت غير مكتملة' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // الحصول على معرف القناة من اسم المستخدم
    let channelId = drawData.channel_id;
    
    if (!channelId && drawData.channel_username) {
      // إزالة @ من بداية اسم القناة إذا كانت موجودة
      const cleanChannelUsername = drawData.channel_username.startsWith('@') 
        ? drawData.channel_username.substring(1) 
        : drawData.channel_username;
      
      try {
        console.log(`محاولة الحصول على معلومات القناة: @${cleanChannelUsername}`);
        // الحصول على معلومات القناة
        const getChatUrl = `https://api.telegram.org/bot${botToken}/getChat`;
        const getChatResponse = await fetch(`${getChatUrl}?chat_id=@${cleanChannelUsername}`);
        
        console.log(`استجابة getChat: ${getChatResponse.status} - ${getChatResponse.statusText}`);
        
        if (getChatResponse.ok) {
          const chatData = await getChatResponse.json();
          console.log('بيانات القناة:', JSON.stringify(chatData, null, 2));
          if (chatData.ok && chatData.result) {
            channelId = chatData.result.id;
            console.log(`تم الحصول على معرف القناة: ${channelId}`);
            
            // تحديث معرف القناة في قاعدة البيانات
            const { error: updateError } = await supabaseClient
              .from('lucky_draws')
              .update({ channel_id: channelId })
              .eq('id', drawData.id);
              
            if (updateError) {
              console.error('خطأ في تحديث معرف القناة:', updateError);
            } else {
              console.log('تم تحديث معرف القناة في قاعدة البيانات');
            }
          }
        } else {
          console.error('فشل في الحصول على معلومات القناة:', await getChatResponse.text());
          return new Response(
            JSON.stringify({ 
              error: 'لا يمكن العثور على القناة. تأكد من أن البوت أدمن في القناة ومن صحة اسم القناة' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (error) {
        console.error('خطأ في الحصول على معرف القناة:', error);
        return new Response(
          JSON.stringify({ 
            error: 'خطأ في الوصول للقناة. تأكد من أن البوت أدمن في القناة' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // إنشاء رسالة السحبة
    const endDate = new Date(drawData.ends_at);
    const formattedEndDate = endDate.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `🎉 *سحبة جديدة: ${drawData.title}* 🎉\n\n`;
    message += `📝 *الوصف:* ${drawData.description}\n`;
    message += `🏆 *الجائزة:* ${drawData.prize_description}\n`;
    message += `👥 *عدد الفائزين:* ${drawData.winner_count}\n`;
    
    if (drawData.entry_fee > 0) {
      message += `💰 *رسوم المشاركة:* ${drawData.entry_fee} TON\n`;
    } else {
      message += `🆓 *المشاركة مجانية*\n`;
    }
    
    if (drawData.max_participants) {
      message += `👥 *الحد الأقصى للمشاركين:* ${drawData.max_participants}\n`;
    }
    
    message += `⏰ *تنتهي في:* ${formattedEndDate}\n\n`;
    
    if (drawData.require_channel_subscription && drawData.mandatory_channel_username) {
      message += `⚠️ *يجب الاشتراك في القناة:* @${drawData.mandatory_channel_username}\n\n`;
    }
    
    message += `🔗 للمشاركة في السحبة، اضغط الزر أدناه`;

    // إرسال الرسالة للقناة الأساسية
    if (channelId) {
      console.log(`إرسال الرسالة للقناة: ${channelId}`);
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const messageData = {
        chat_id: channelId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎯 دخول السحبة',
                web_app: { url: `https://arabian-coin-bot121321.vercel.app/lucky-draw/${drawData.id}` }
              }
            ]
          ]
        }
      };

      // إرسال الصورة إذا كانت متوفرة
      if (drawData.image_url) {
        const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        const photoData = {
          chat_id: channelId,
          photo: drawData.image_url,
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: messageData.reply_markup
        };

        const photoResponse = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoData),
        });

        if (!photoResponse.ok) {
          console.error('فشل في إرسال الصورة للقناة');
          // إذا فشل إرسال الصورة، أرسل الرسالة النصية
          const textResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData),
          });
          
          if (!textResponse.ok) {
            const errorText = await textResponse.text();
            console.error('خطأ في إرسال الرسالة النصية للقناة:', errorText);
            throw new Error(`فشل في إرسال الرسالة للقناة: ${errorText}`);
          }
        }
      } else {
        // إرسال الرسالة النصية فقط
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('خطأ في إرسال الرسالة للقناة:', errorText);
          throw new Error(`فشل في إرسال الرسالة للقناة: ${errorText}`);
        }
      }

      console.log(`تم إرسال السحبة ${drawData.title} للقناة ${drawData.channel_username}`);
    }

    // إرسال إشعار للقناة الإجبارية أيضاً (إذا كانت مختلفة)
    if (drawData.require_channel_subscription && 
        drawData.mandatory_channel_id && 
        drawData.mandatory_channel_id !== channelId) {
      
      const notificationMessage = `🔔 *إشعار: سحبة جديدة متاحة*\n\n`;
      const notificationData = {
        chat_id: drawData.mandatory_channel_id,
        text: `${notificationMessage}يتطلب الاشتراك في هذه القناة للمشاركة في السحبة الجديدة: "${drawData.title}"\n\n🔗 للمشاركة، اضغط الزر أدناه`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎯 دخول السحبة',
                web_app: { url: `https://arabian-coin-bot121321.vercel.app/lucky-draw/${drawData.id}` }
              }
            ]
          ]
        }
      };

      const notificationUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال السحبة للقناة بنجاح' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending draw to channel:', error);
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ في إرسال السحبة للقناة',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});