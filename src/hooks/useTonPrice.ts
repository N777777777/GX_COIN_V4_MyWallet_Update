import { useState, useEffect } from 'react';

interface TonPriceData {
  price: number;
  change24h: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const PRICE_KEY = 'ton_price_usd';
const CHANGE_KEY = 'ton_price_change24h';
const UPDATED_KEY = 'ton_price_last_updated';

export const useTonPrice = (refreshInterval: number = 30000) => {
  // Load cached values first to avoid flicker to 0.00
  const cachedPrice = Number(localStorage.getItem(PRICE_KEY) || 0);
  const cachedChange = Number(localStorage.getItem(CHANGE_KEY) || 0);
  const cachedUpdated = localStorage.getItem(UPDATED_KEY);

  const [priceData, setPriceData] = useState<TonPriceData>({
    price: isFinite(cachedPrice) ? cachedPrice : 0,
    change24h: isFinite(cachedChange) ? cachedChange : 0,
    loading: !cachedPrice, // show loading only if no cached price
    error: null,
    lastUpdated: cachedUpdated ? new Date(cachedUpdated) : null,
  });

  const fetchTonPrice = async () => {
    // Only show loading if we don't have a price yet
    setPriceData((prev) => ({ ...prev, loading: prev.price === 0, error: null }));

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true'
      );

      if (!response.ok) {
        throw new Error('فشل في جلب السعر');
      }

      const data = await response.json();
      const ton = data['the-open-network'];
      const nextPrice = Number(ton?.usd || 0);
      const nextChange = Number(ton?.usd_24h_change || 0);
      const now = new Date();

      // Persist cache
      if (nextPrice) {
        localStorage.setItem(PRICE_KEY, String(nextPrice));
        localStorage.setItem(CHANGE_KEY, String(nextChange));
        localStorage.setItem(UPDATED_KEY, now.toISOString());
      }

      setPriceData({
        price: nextPrice,
        change24h: nextChange,
        loading: false,
        error: null,
        lastUpdated: now,
      });
    } catch (error) {
      console.error('Error fetching TON price:', error);
      // Keep previous price, just surface the error
      setPriceData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      }));
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchTonPrice();

    // Polling
    const interval = setInterval(fetchTonPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    ...priceData,
    refetch: fetchTonPrice,
  };
};
