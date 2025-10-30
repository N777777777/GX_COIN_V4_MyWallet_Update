import { useState, useEffect } from 'react';

interface CryptoPriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface CryptoPricesData {
  ton: CryptoPriceData;
  pepe: CryptoPriceData;
  loading: boolean;
  error: string | null;
}

const CACHE_KEYS = {
  TON_PRICE: 'ton_price_data',
  PEPE_PRICE: 'pepe_price_data',
  LAST_UPDATED: 'crypto_prices_last_updated'
};

export const useCryptoPrices = (refreshInterval: number = 30000) => {
  // Load cached values
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const cachedTon = getCachedData(CACHE_KEYS.TON_PRICE);
  const cachedPepe = getCachedData(CACHE_KEYS.PEPE_PRICE);
  const cachedUpdated = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);

  const [pricesData, setPricesData] = useState<CryptoPricesData>({
    ton: {
      symbol: 'TON',
      name: 'The Open Network',
      price: cachedTon?.price || 0,
      change24h: cachedTon?.change24h || 0,
      loading: !cachedTon,
      error: null,
      lastUpdated: cachedUpdated ? new Date(cachedUpdated) : null,
    },
    pepe: {
      symbol: 'PEPE',
      name: 'Pepe',
      price: cachedPepe?.price || 0,
      change24h: cachedPepe?.change24h || 0,
      loading: !cachedPepe,
      error: null,
      lastUpdated: cachedUpdated ? new Date(cachedUpdated) : null,
    },
    loading: !cachedTon || !cachedPepe,
    error: null,
  });

  const fetchCryptoPrices = async () => {
    // Only show loading if we don't have cached prices
    setPricesData((prev) => ({
      ...prev,
      loading: prev.ton.price === 0 || prev.pepe.price === 0,
      error: null,
    }));

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,pepe&vs_currencies=usd&include_24hr_change=true'
      );

      if (!response.ok) {
        throw new Error('فشل في جلب الأسعار');
      }

      const data = await response.json();
      const ton = data['the-open-network'];
      const pepe = data['pepe'];
      const now = new Date();

      const tonData = {
        price: Number(ton?.usd || 0),
        change24h: Number(ton?.usd_24h_change || 0),
      };

      const pepeData = {
        price: Number(pepe?.usd || 0),
        change24h: Number(pepe?.usd_24h_change || 0),
      };

      // Cache the data
      if (tonData.price) {
        localStorage.setItem(CACHE_KEYS.TON_PRICE, JSON.stringify(tonData));
      }
      if (pepeData.price) {
        localStorage.setItem(CACHE_KEYS.PEPE_PRICE, JSON.stringify(pepeData));
      }
      localStorage.setItem(CACHE_KEYS.LAST_UPDATED, now.toISOString());

      setPricesData({
        ton: {
          symbol: 'TON',
          name: 'The Open Network',
          price: tonData.price,
          change24h: tonData.change24h,
          loading: false,
          error: null,
          lastUpdated: now,
        },
        pepe: {
          symbol: 'PEPE',
          name: 'Pepe',
          price: pepeData.price,
          change24h: pepeData.change24h,
          loading: false,
          error: null,
          lastUpdated: now,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setPricesData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      }));
    }
  };

  useEffect(() => {
    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    ...pricesData,
    refetch: fetchCryptoPrices,
  };
};