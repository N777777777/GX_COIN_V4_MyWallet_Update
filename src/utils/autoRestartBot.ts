import { supabase } from "@/integrations/supabase/client";

// Auto restart bot function
export async function autoRestartBot() {
  try {
    console.log('🔄 Starting bot restart...');
    
    const { data, error } = await supabase.functions.invoke('restart-bot', {
      method: 'POST'
    });

    if (error) {
      console.error('❌ Bot restart failed:', error);
      throw error;
    }

    if (data?.success) {
      console.log('✅ Bot restarted successfully!');
      console.log('Bot info:', data.bot_info);
      console.log('Webhook info:', data.webhook_info);
      return true;
    } else {
      console.error('❌ Bot restart failed:', data?.error);
      throw new Error(data?.error || 'فشل في إعادة تشغيل البوت');
    }
  } catch (error: any) {
    console.error('❌ Auto restart error:', error);
    return false;
  }
}

// Execute auto restart once per session when imported  
if (typeof window !== 'undefined') {
  const alreadyRestarted = sessionStorage.getItem('botWebhookRefreshed');
  if (!alreadyRestarted) {
    // Add a small delay to prevent overlapping with other initialization
    setTimeout(() => {
      autoRestartBot().then((ok) => {
        if (ok) sessionStorage.setItem('botWebhookRefreshed', '1');
      });
    }, 2000);
  } else {
    console.log('ℹ️ Bot webhook refresh already performed this session');
  }
}