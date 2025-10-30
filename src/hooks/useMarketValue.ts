import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMarketValue() {
  const [marketValue, setMarketValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketValue = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_market_value');
      
      if (error) {
        console.error('Error fetching market value:', error);
        setError('فشل في جلب القيمة السوقية');
        return;
      }

      setMarketValue(data || 0);
    } catch (err) {
      console.error('Error fetching market value:', err);
      setError('فشل في جلب القيمة السوقية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketValue();

    // الاستماع للتحديثات في الوقت الفعلي
    const channel = supabase
      .channel('market-value-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_market_value'
        },
        (payload) => {
          if (payload.new && typeof payload.new.total_value === 'number') {
            setMarketValue(payload.new.total_value);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    marketValue,
    loading,
    error,
    refetch: fetchMarketValue
  };
}