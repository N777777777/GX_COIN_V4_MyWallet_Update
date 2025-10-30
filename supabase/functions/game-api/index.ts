import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/user') {
      const telegramId = url.searchParams.get('telegram_id')
      
      if (!telegramId) {
        return new Response(JSON.stringify({ error: 'telegram_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const user = await getUser(parseInt(telegramId))
      
      return new Response(JSON.stringify({ user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST' && path === '/tap') {
      const { telegram_id, coins_earned, energy_used } = await req.json()
      
      if (!telegram_id) {
        return new Response(JSON.stringify({ error: 'telegram_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const user = await getUser(telegram_id)
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update coins and energy
      const newCoins = (user.coins || 0) + (coins_earned || 1)
      const newEnergy = Math.max(0, (user.energy || 1000) - (energy_used || 1))

      const updatedUser = await updateUserStats(telegram_id, newCoins, newEnergy)

      return new Response(JSON.stringify({ user: updatedUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { action, telegram_id, upgrade_type, cost, task_type, reward, referred_user_id, referrer_telegram_id } = body

      // Handle upgrade action
      if (action === 'upgrade') {
      
        if (!telegram_id || !upgrade_type || !cost) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const user = await getUser(telegram_id)
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if ((user.coins || 0) < cost) {
          return new Response(JSON.stringify({ error: 'Insufficient coins' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Apply upgrade
        const updatedUser = await applyUpgrade(telegram_id, upgrade_type, cost)

        return new Response(JSON.stringify({ user: updatedUser }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Handle task completion action
      if (action === 'task-complete') {
      
        if (!telegram_id || !task_type) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const user = await getUser(telegram_id)
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Save task completion
        await saveTaskCompletion(user.id, task_type, reward || 0)
        
        // Add reward to user
        const newCoins = (user.coins || 0) + (reward || 0)
        const updatedUser = await updateUserCoins(telegram_id, newCoins)

        return new Response(JSON.stringify({ user: updatedUser }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Handle process referral action
      if (action === 'process_referral') {
        console.log('Processing referral:', { referred_user_id, referrer_telegram_id })
        
        if (!referred_user_id || !referrer_telegram_id) {
          return new Response(JSON.stringify({ error: 'Missing referred_user_id or referrer_telegram_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get referred user data
        const { data: referredUser, error: referredUserError } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('id', referred_user_id)
          .single()

        if (referredUserError || !referredUser) {
          console.error('Error getting referred user:', referredUserError)
          return new Response(JSON.stringify({ error: 'Referred user not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get referrer user data
        const { data: referrerUser, error: referrerUserError } = await supabase
          .from('telegram_users')
          .select('*')
          .eq('telegram_id', referrer_telegram_id)
          .single()

        if (referrerUserError || !referrerUser) {
          console.error('Error getting referrer user:', referrerUserError)
          return new Response(JSON.stringify({ error: 'Referrer user not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Check if referral already exists
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('*')
          .eq('referred_telegram_id', referredUser.telegram_id)
          .single()

        if (existingReferral) {
          return new Response(JSON.stringify({ error: 'User already has a referrer' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Use process_referral function from database instead of manual creation
        const { data: processResult, error: processError } = await supabase
          .rpc('process_referral', {
            referred_user_id: referredUser.id,
            referrer_telegram_id_param: referrer_telegram_id
          });

        if (processError) {
          console.error('Error processing referral:', processError);
          return new Response(JSON.stringify({ error: 'Failed to create referral' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const resultData = processResult as any;
        console.log('Referral process result:', resultData);
        
        if (resultData?.success) {
          return new Response(JSON.stringify({ 
            success: true,
            message: resultData.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          return new Response(JSON.stringify({ error: resultData?.message || 'Failed to process referral' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    if (req.method === 'GET' && path === '/referrals') {
      const telegramId = url.searchParams.get('telegram_id')
      
      if (!telegramId) {
        return new Response(JSON.stringify({ error: 'telegram_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const referrals = await getUserReferrals(parseInt(telegramId))
      
      return new Response(JSON.stringify({ referrals }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Database functions
async function getUser(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

async function updateUserStats(telegramId: number, coins: number, energy: number) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .update({ 
        coins: coins,
        energy: energy,
        last_active: new Date().toISOString()
      })
      .eq('telegram_id', telegramId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user stats:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateUserStats:', error)
    return null
  }
}

async function updateUserCoins(telegramId: number, coins: number) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .update({ 
        coins: coins,
        last_active: new Date().toISOString()
      })
      .eq('telegram_id', telegramId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user coins:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateUserCoins:', error)
    return null
  }
}

async function applyUpgrade(telegramId: number, upgradeType: string, cost: number) {
  try {
    const user = await getUser(telegramId)
    if (!user) return null

    const newCoins = (user.coins || 0) - cost
    let updateData: any = { 
      coins: newCoins,
      last_active: new Date().toISOString()
    }

    // Apply upgrade effects
    switch (upgradeType) {
      case 'coins_per_tap':
        updateData.coins_per_tap = (user.coins_per_tap || 1) + 1
        break
      case 'energy_limit':
        updateData.energy_limit = (user.energy_limit || 1000) + 500
        break
      case 'energy_recharge_rate':
        updateData.energy_recharge_rate = (user.energy_recharge_rate || 1) + 1
        break
    }

    const { data, error } = await supabase
      .from('telegram_users')
      .update(updateData)
      .eq('telegram_id', telegramId)
      .select()
      .single()

    if (error) {
      console.error('Error applying upgrade:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in applyUpgrade:', error)
    return null
  }
}

async function saveTaskCompletion(userId: string, taskType: string, reward: number) {
  try {
    const { data, error } = await supabase
      .from('user_tasks')
      .insert({
        telegram_user_id: userId,
        task_type: taskType,
        task_data: { reward },
        completed: true,
        reward_claimed: true,
        completed_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error saving task completion:', error)
      return null
    }

    return data?.[0]
  } catch (error) {
    console.error('Error in saveTaskCompletion:', error)
    return null
  }
}

async function getUserReferrals(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:telegram_users!referrals_referred_user_id_fkey(
          telegram_id,
          username,
          first_name,
          created_at
        )
      `)
      .eq('referrer_telegram_id', telegramId)

    if (error) {
      console.error('Error getting user referrals:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserReferrals:', error)
    return []
  }
}