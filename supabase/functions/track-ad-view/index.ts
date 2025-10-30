import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdClickRequest {
  adId: string;
  userId: number;
  timestamp: number;
}

interface AdVerificationRequest {
  adId: string;
  userId: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'click' && req.method === 'POST') {
      // تسجيل نقرة الإعلان
      const { adId, userId, timestamp }: AdClickRequest = await req.json();

      // البحث عن المستخدم
      const { data: user } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', userId)
        .single();

      if (!user) {
        return new Response(
          JSON.stringify({ success: false, message: 'المستخدم غير موجود' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // حفظ سجل النقرة
      const { error } = await supabase
        .from('ad_view_tracking')
        .upsert({
          telegram_user_id: user.id,
          telegram_id: userId,
          ad_id: adId,
          click_timestamp: new Date(timestamp).toISOString(),
          verification_status: 'pending'
        }, {
          onConflict: 'telegram_user_id,ad_id'
        });

      if (error) {
        console.error('Error saving ad click:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'خطأ في حفظ النقرة' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'تم تسجيل النقرة بنجاح' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'verify' && req.method === 'POST') {
      // التحقق من صحة المشاهدة
      const { adId, userId }: AdVerificationRequest = await req.json();

      // البحث عن المستخدم
      const { data: user } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('telegram_id', userId)
        .single();

      if (!user) {
        return new Response(
          JSON.stringify({ success: false, message: 'المستخدم غير موجود' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // البحث عن سجل النقرة
      const { data: adClick } = await supabase
        .from('ad_view_tracking')
        .select('*')
        .eq('telegram_user_id', user.id)
        .eq('ad_id', adId)
        .eq('verification_status', 'pending')
        .single();

      if (!adClick) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'لم يتم العثور على سجل نقرة للإعلان',
            canClaim: false
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // حساب الوقت المنقضي منذ النقرة
      const clickTime = new Date(adClick.click_timestamp).getTime();
      const currentTime = Date.now();
      const timeSpentSeconds = Math.floor((currentTime - clickTime) / 1000);
      const minimumTime = 15; // 15 ثانية

      if (timeSpentSeconds >= minimumTime) {
        // المستخدم قضى وقتاً كافياً - تحديث الحالة وإعطاء المكافأة
        await supabase
          .from('ad_view_tracking')
          .update({
            verification_status: 'verified',
            verification_timestamp: new Date().toISOString(),
            time_spent_seconds: timeSpentSeconds
          })
          .eq('id', adClick.id);

        // إعطاء المكافأة للمستخدم
        const { data: result } = await supabase.rpc('handle_ad_view_and_check_qualification', {
          user_telegram_id: userId
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            canClaim: true,
            timeSpent: timeSpentSeconds,
            message: `ممتاز! قضيت ${timeSpentSeconds} ثانية في الإعلان`,
            qualification_won: result?.qualification_won || false,
            views_today: result?.views_today || 0,
            remaining_views: result?.remaining_views || 0
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // لم يقض وقتاً كافياً
        const remainingTime = minimumTime - timeSpentSeconds;
        return new Response(
          JSON.stringify({ 
            success: false, 
            canClaim: false,
            timeSpent: timeSpentSeconds,
            remainingTime,
            message: `تحتاج إلى ${remainingTime} ثانية إضافية`
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: 'طريقة طلب غير صحيحة' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in track-ad-view function:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'خطأ في الخادم' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});