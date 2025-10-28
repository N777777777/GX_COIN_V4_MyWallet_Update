import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Telegram WebApp type declaration
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
          };
        };
      };
    };
  }
}

interface TelegramUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  coins: number;
  energy: number;
  energy_limit: number;
  coins_per_tap: number;
  energy_recharge_rate: number;
  ton_balance?: number;
  referrer_telegram_id?: number;
  bal_g4v7y?: number; // gcoin_v4_balance (obfuscated)
  bal_a6c3z?: number; // alpha_coins (obfuscated)
  bal_x7k9m?: number; // pepe_balance (obfuscated)
  bal_w5r2t?: number; // pepe_withdrawable_balance (obfuscated)
  addr_t9w2x?: string; // ton_wallet_address (obfuscated)
  total_referrals_count?: number;
  created_at: string;
  updated_at: string;
}

export const useTelegramData = () => {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('useTelegramData: Hook initialized');

  useEffect(() => {
    const initTelegramData = async () => {
      console.log('useTelegramData: Starting initialization');
      try {
        setLoading(true);
        setError(null);

        // أولاً، محاولة الحصول على بيانات Telegram إذا كانت متاحة
        let telegramId: number | null = null;
        let username: string | undefined = undefined;
        let firstName: string | undefined = undefined;
        let lastName: string | undefined = undefined;

        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          const user = window.Telegram.WebApp.initDataUnsafe.user;
          telegramId = user.id;
          username = user.username;
          firstName = user.first_name;
          lastName = user.last_name;
          
          console.log('useTelegramData: Found Telegram user:', { telegramId, username, firstName });
        } else {
          console.log('useTelegramData: No Telegram WebApp data available');
        }

        // البحث عن المستخدم في قاعدة البيانات
        let userData: TelegramUser | null = null;

        if (telegramId) {
          // البحث بواسطة telegram_id
          console.log('useTelegramData: Searching for user with telegram_id:', telegramId);
          const { data: existingUser, error } = await supabase
            .from('telegram_users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

          console.log('useTelegramData: Search result:', { existingUser, error });

          if (existingUser) {
            userData = existingUser;
            console.log('useTelegramData: User found in database');
          } else if (error?.code !== 'PGRST116') {
            console.error('useTelegramData: Database search error:', error);
            throw new Error('خطأ في البحث عن المستخدم في قاعدة البيانات');
          }
        }

        // إذا لم نجد المستخدم أو لم يكن لدينا telegram_id، أحضر مستخدم لديه رصيد
        if (!userData) {
          console.log('useTelegramData: No specific user found, loading user with coins from database');
          const { data: userWithCoins, error: fetchError } = await supabase
            .from('telegram_users')
            .select('*')
            .gt('coins', 0)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('useTelegramData: User with coins query result:', { userWithCoins, fetchError });

          if (userWithCoins && !fetchError) {
            userData = userWithCoins;
            console.log('useTelegramData: User with coins loaded from database');
          } else {
            // إذا لم نجد مستخدم لديه رصيد، أحضر آخر مستخدم
            const { data: anyUser, error: anyUserError } = await supabase
              .from('telegram_users')
              .select('*')
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (anyUser && !anyUserError) {
              userData = anyUser;
              console.log('useTelegramData: Any user loaded from database as fallback');
            } else {
              console.error('useTelegramData: Failed to load any user:', anyUserError);
              throw new Error('لا توجد بيانات مستخدم في قاعدة البيانات');
            }
          }
        }

        // إذا كان لدينا بيانات Telegram محدثة، قم بتحديث قاعدة البيانات
        if (userData && telegramId && (
          userData.first_name !== firstName || 
          userData.last_name !== lastName || 
          userData.username !== username
        )) {
          console.log('useTelegramData: Updating user data');
          const { data: updatedUser, error: updateError } = await supabase
            .from('telegram_users')
            .update({
              first_name: firstName,
              last_name: lastName,
              username: username
            })
            .eq('telegram_id', telegramId)
            .select()
            .maybeSingle();

          if (updatedUser && !updateError) {
            userData = updatedUser;
            console.log('useTelegramData: User data updated');
          } else {
            console.error('useTelegramData: Failed to update user:', updateError);
          }
        }

        // تعيين بيانات المستخدم
        if (userData) {
          setTelegramUser(userData);
          console.log('useTelegramData: User data set successfully:', userData);
        } else {
          throw new Error('فشل في تحميل بيانات المستخدم');
        }

      } catch (err) {
        console.error('useTelegramData: Error during initialization:', err);
        const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف في تحميل بيانات المستخدم';
        setError(errorMessage);
        setTelegramUser(null);
      } finally {
        setLoading(false);
        console.log('useTelegramData: Initialization complete');
      }
    };

    initTelegramData();
  }, []);

  const updateUserStats = async (coins: number, energy: number) => {
    if (!telegramUser) return;

    try {
      // Calculate the difference in coins to know how much was earned
      const coinsEarned = coins - (telegramUser.bal_a6c3z || 0); // alpha_coins (obfuscated)
      
      const { data: updatedUser, error } = await supabase
        .from('telegram_users')
        .update({
          bal_a6c3z: coins, // alpha_coins (obfuscated)
          energy: energy,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', telegramUser.telegram_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user stats:', error);
        // Fallback to local update
        setTelegramUser(prev => prev ? { ...prev, bal_a6c3z: coins, energy } : null);
        return;
      }

      if (updatedUser) {
        setTelegramUser(updatedUser);
      }
    } catch (err) {
      console.error('Error updating user stats:', err);
      // Fallback to local update
      setTelegramUser(prev => prev ? { ...prev, bal_a6c3z: coins, energy } : null);
    }
  };


  const purchaseUpgrade = async (upgradeType: string, cost: number) => {
    if (!telegramUser) return false;

    if (telegramUser.coins < cost) {
      return false;
    }

    if (telegramUser.telegram_id === 0) {
      // Handle web users locally
      let updateData: any = { coins: telegramUser.coins - cost };
      
      switch (upgradeType) {
        case 'coins_per_tap':
          updateData.coins_per_tap = telegramUser.coins_per_tap + 1;
          break;
        case 'energy_limit':
          updateData.energy_limit = telegramUser.energy_limit + 500;
          break;
        case 'energy_recharge_rate':
          updateData.energy_recharge_rate = telegramUser.energy_recharge_rate + 1;
          break;
      }

      setTelegramUser(prev => prev ? { ...prev, ...updateData } : null);
      return true;
    }

    try {
      const response = await supabase.functions.invoke('game-api', {
        body: {
          action: 'upgrade',
          telegram_id: telegramUser.telegram_id,
          upgrade_type: upgradeType,
          cost: cost,
        },
      });

      if (response.error) {
        throw new Error('Failed to purchase upgrade');
      }

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setTelegramUser(updatedUser);
        return true;
      }
    } catch (err) {
      console.error('Error purchasing upgrade:', err);
    }

    return false;
  };

  const completeTask = async (taskType: string, reward: number) => {
    if (!telegramUser) return false;

    if (telegramUser.telegram_id === 0) {
      // Handle web users locally
      setTelegramUser(prev => prev ? { ...prev, coins: prev.coins + reward } : null);
      return true;
    }

    try {
      const response = await supabase.functions.invoke('game-api', {
        body: {
          action: 'task-complete',
          telegram_id: telegramUser.telegram_id,
          task_type: taskType,
          reward: reward,
        },
      });

      if (response.error) {
        throw new Error('Failed to complete task');
      }

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setTelegramUser(updatedUser);
        return true;
      }
    } catch (err) {
      console.error('Error completing task:', err);
    }

    return false;
  };

  const refreshUserData = async () => {
    if (!telegramUser?.id) {
      console.log('useTelegramData: No telegramUser.id available for refresh');
      return;
    }
    
    console.log('useTelegramData: Refreshing user data for ID:', telegramUser.id, 'Current coins:', telegramUser.coins);
    try {
      const { data: userData, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('id', telegramUser.id)
        .maybeSingle();
      
      if (userData && !error) {
        console.log('useTelegramData: OLD data - coins:', telegramUser.coins, 'gcoin_v4:', telegramUser.bal_g4v7y);
        console.log('useTelegramData: NEW data - coins:', userData.coins, 'gcoin_v4:', userData.bal_g4v7y);
        setTelegramUser(userData);
        console.log('useTelegramData: User data refreshed successfully');
      } else {
        console.error('useTelegramData: Error refreshing user data:', error);
      }
    } catch (err) {
      console.error('useTelegramData: Error refreshing user data:', err);
    }
  };

  return {
    telegramUser,
    loading,
    error,
    updateUserStats,
    purchaseUpgrade,
    completeTask,
    refreshUserData,
  };
};