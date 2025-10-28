import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { drawId, userId } = await req.json();
    
    if (!drawId || !userId) {
      return new Response(
        JSON.stringify({ error: 'معرف السحبة ومعرف المستخدم مطلوبين' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من وجود السحبة والتأكد أن المستخدم هو منشئها
    const { data: draw, error: drawError } = await supabaseClient
      .from('lucky_draws')
      .select('*')
      .eq('id', drawId)
      .eq('creator_id', userId)
      .eq('status', 'active')
      .single();

    if (drawError || !draw) {
      return new Response(
        JSON.stringify({ error: 'السحبة غير موجودة أو غير مسموح لك بإلغائها' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // التحقق من أن السحبة لم تبدأ بعد أو أنه لا يوجد مشاركين كثيرين
    const { data: participants } = await supabaseClient
      .from('lucky_draw_participants')
      .select('id, participant_id')
      .eq('draw_id', drawId);

    const participantCount = participants?.length || 0;
    
    // عد المشاركين باستثناء صاحب السحب إذا كان مشاركاً
    const nonCreatorParticipants = participants?.filter(p => p.participant_id !== userId) || [];
    const nonCreatorParticipantCount = nonCreatorParticipants.length;
    
    // السماح بالإلغاء فقط إذا كان عدد المشاركين (بدون صاحب السحب) أقل من 10
    if (nonCreatorParticipantCount >= 10) {
      return new Response(
        JSON.stringify({ error: 'لا يمكن إلغاء السحبة بعد وصول عدد المشاركين الآخرين إلى 10 أو أكثر' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // تحديث حالة السحبة إلى ملغية
    const { error: updateError } = await supabaseClient
      .from('lucky_draws')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', drawId);

    if (updateError) {
      throw updateError;
    }

    // No refund needed since draws are now free

    // لا نرسل إشعار إلغاء للقناة لتجنب الإزعاج

    // No participant refunds needed since draws are free

    // حذف سجلات المشاركة
    if (participantCount > 0) {
      await supabaseClient
        .from('lucky_draw_participants')
        .delete()
        .eq('draw_id', drawId);
    }

    console.log(`تم إلغاء السحبة ${draw.title} بنجاح`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إلغاء السحبة بنجاح' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error cancelling draw:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'حدث خطأ في إلغاء السحبة',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});