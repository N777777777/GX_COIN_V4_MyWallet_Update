import { supabase } from "@/integrations/supabase/client";

export async function restartBot() {
  try {
    const { data, error } = await supabase.functions.invoke('restart-bot', {
      method: 'POST'
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error restarting bot:', error);
    throw new Error(error.message || 'فشل في إعادة تشغيل البوت');
  }
}