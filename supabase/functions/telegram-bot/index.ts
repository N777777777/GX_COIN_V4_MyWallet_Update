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

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    web_app_data?: {
      data: string;
      button_text: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      const update: TelegramUpdate = await req.json()
      
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id
        const text = update.message.text
        const telegramUser = update.message.from
        const username = telegramUser.username || telegramUser.first_name

        // Register or update user data
        await upsertUser(telegramUser)

        // Check new pending tasks
        await checkNewPendingTasks()

        // Handle different commands
        if (text.startsWith('/start')) {
          // Extract referrer ID from start parameters FIRST
          const startParams = text.replace('/start', '').trim()
          let referrerId = null
          
          if (startParams) {
            if (!startParams.includes('startapp=')) {
              referrerId = parseInt(startParams)
            } else {
              const match = startParams.match(/startapp[=_](\d+)/)
              if (match) {
                referrerId = parseInt(match[1])
              }
            }
            
            // Save referrer ID temporarily for later processing
            if (referrerId && !isNaN(referrerId) && referrerId !== telegramUser.id) {
              console.log('💾 Saving pending referrer:', { referrerId, referredId: telegramUser.id })
              
              // Save pending referrer in database
              await supabase
                .from('telegram_users')
                .update({ pending_referrer_id: referrerId })
                .eq('telegram_id', telegramUser.id)
            }
          }
          
          // Mandatory channel membership check
          const channelMembership = await checkChannelMembership(telegramUser.id, 'G_COIN_V3')
          if (!channelMembership.is_member) {
            await sendMessage(chatId, `📢 You must join the official channel first!

Join the G COIN channel to continue:`, {
              reply_markup: {
                inline_keyboard: [
                  [{
                    text: "📢 Join Channel",
                    url: "https://t.me/G_COIN_V3"
                  }],
                  [{
                    text: "✅ Check Membership",
                    callback_data: "check_membership"
                  }]
                ]
              }
            })
            return new Response(JSON.stringify({ status: 'channel_subscription_required' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          // Register or update user data
          await upsertUser(telegramUser)
          const user = await getUser(telegramUser.id)
          
          // Process referral after channel verification
          // Check if there's a pending referrer OR from start params
          referrerId = user?.pending_referrer_id || null
          
          if (referrerId && !isNaN(referrerId) && referrerId !== telegramUser.id) {
            console.log('🎉 Processing referral after channel join:', { referrerId, referredId: telegramUser.id })
            
            // Call process_referral_on_channel_join function
            const { data: referralResult, error: referralError } = await supabase.rpc('process_referral_on_channel_join', {
              p_referred_telegram_id: telegramUser.id,
              p_referrer_telegram_id: referrerId
            })
            
            if (!referralError && referralResult) {
              const result = referralResult as any
              console.log('✅ Referral result:', result)
              
              if (result.success) {
                // Clear pending referrer
                await supabase
                  .from('telegram_users')
                  .update({ pending_referrer_id: null })
                  .eq('telegram_id', telegramUser.id)
                
                // Send notification to referrer
                try {
                  await sendMessage(referrerId, `🎉 Congratulations!
                    
A new user joined via your referral link!

👤 Name: ${telegramUser.first_name}

You will earn commissions from their earnings:
• 35% from PEPE 
• 3% from ALPHA
• 5% from G COIN V4

Keep sharing your link and increase your earnings! 💰`)
                } catch (e) {
                  console.log('⚠️ Failed to send notification to referrer:', e)
                }
              }
            }
          }
          
          let welcomeMessage = `💎 Welcome to G Coin, ${telegramUser.first_name}!

Platform for fun and rewards built on the TON network.

Collect G Coin points by playing and inviting friends.

The more points you collect, the closer you get to amazing rewards!

Share the fun with your friends and earn together 🎉

🔒 The bot is now completely secure after fixing all issues!`

          // Add alert if in emergency mode
          if (user?.id === 'offline_user') {
            welcomeMessage += `

⚠️ Alert: The bot is currently operating in emergency mode
All data will be restored when connection is back`
          }
          
          await sendPhoto(chatId, "https://2d7cfa04-9267-4cc8-9b9c-7b0a2531b69d.lovableproject.com/lovable-uploads/7a5eafb7-3634-408a-a9ba-57938699ae23.png", welcomeMessage, {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: "Launch App",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }],
                [{
                  text: "📢 Channel",
                  url: "https://t.me/G_COIN_V3"
                }]
              ]
            }
          })
        }
        else if (text.startsWith('/play')) {
          const user = await getUser(telegramUser.id)
          
          await sendMessage(chatId, `🎮 Click to start playing!

Your balance: ${user?.coins || 0} points
Your energy: ${user?.energy || 1000}/${user?.energy_limit || 1000}`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🎮 Play Now",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else if (text.startsWith('/help')) {
          await sendMessage(chatId, `Bot Commands:

/start - Start using the bot
/play - Play the game 🎮
/balance - Show your balance 💰
/tasks - Show available tasks 📋
/daily - Daily login to get 0.1 coin 🎁
/surveys - Go to surveys and earn money 📊
/referral - Invitation link 👥
Use the app to submit tasks

For additional help, contact support.`)
        }
        else if (text.startsWith('/balance')) {
          const user = await getUser(telegramUser.id)
          await sendMessage(chatId, `💰 Your current balance: ${user?.coins || 0} points 🪙
⚡ Your energy: ${user?.energy || 1000}/${user?.energy_limit || 1000}
🔄 Recharge rate: ${user?.energy_recharge_rate || 1} point/second

To earn more points, use the app and complete tasks!`)
        }
        else if (text.startsWith('/tasks')) {
          const user = await getUser(telegramUser.id)
          if (user) {
            const tasksStatus = await getUserTasksStatus(user.id)
            await sendMessage(chatId, tasksStatus)
          } else {
            await sendMessage(chatId, `Error loading user data. Please try again.`)
          }
        }
        else if (text.startsWith('/referral')) {
          // Use both patterns for compatibility
          const referralLinkStartApp = `https://t.me/G3_COIN_V3_BOT?startapp=${telegramUser.id}`
          const referralLinkDirect = `https://t.me/G3_COIN_V3_BOT?start=${telegramUser.id}`
          
          await sendMessage(chatId, `👥 Your referral links:

🔗 Main link (recommended):
${referralLinkStartApp}

🔗 Alternative link:
${referralLinkDirect}

Share these links with your friends and get 2 coins for each qualified friend! 

⚡ Conditions:
• Friend must complete KuCoin task to get the reward
• Reward is added automatically when friend becomes qualified`)
        }
        else if (text.startsWith('/daily')) {
          await sendMessage(chatId, `🎁 Daily Login
          
Get 0.1 coin daily through daily login!

📱 Click the button below to get your daily reward:`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🎁 Daily Login - 0.1 coin",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else if (text.startsWith('/surveys')) {
          await sendMessage(chatId, `📊 Surveys and Paid Tasks

Earn money by solving surveys and watching ads!

💰 Benefits:
• Earn real money
• Various surveys
• Instant payments
• Safe and guaranteed

📱 Start now and earn money:`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "📊 Start Surveys",
                  web_app: { url: `https://g-coin-bot-1r3s.vercel.app/surveys?user_id=${telegramUser.id}&username=${telegramUser.username || telegramUser.first_name}&email=${telegramUser.username || telegramUser.first_name}@telegram.com` }
                }
              ]]
            }
          })
        }
        // Verification commands removed
        else if (text.startsWith('/submit')) {
          await sendMessage(chatId, `🚫 Task submission via bot has been disabled.

📱 To submit all tasks, please go to the app:

There you will be able to submit UID and tasks correctly.`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open App", 
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else if (text.toLowerCase().includes('task') || text.toLowerCase().includes('submit') || text.toLowerCase().includes('uid')) {
          await sendMessage(chatId, `📋 Task Submission

📱 To submit any task or UID, please go to the app:

There you will be able to submit all tasks correctly.`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open App", 
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else if (text.startsWith('APPROVE ') && telegramUser.id === 138370) {
          // Admin commands to approve tasks
          const taskId = text.replace('APPROVE ', '').trim()
          const result = await approveTask(taskId)
          await sendMessage(chatId, result.message)
        }
        else if (text.startsWith('REJECT ') && telegramUser.id === 138370) {
          // Admin commands to reject tasks  
          const parts = text.replace('REJECT ', '').trim().split(' ')
          const taskId = parts[0]
          const reason = parts.slice(1).join(' ') || 'No reason specified'
          const result = await rejectTask(taskId, reason)
          await sendMessage(chatId, result.message)
        }
        else if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi') || text.toLowerCase().includes('hey')) {
          const user = await getUser(telegramUser.id)
          await sendMessage(chatId, `Hello ${telegramUser.first_name}! 👋
          
How can I help you today?

💰 Your current balance: ${user?.coins || 0} points
⚡ Your energy: ${user?.energy || 1000}/${user?.energy_limit || 1000}

Use /help to view all available commands.`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open App",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else if (text.toLowerCase().includes('how') || text.toLowerCase().includes('what')) {
          await sendMessage(chatId, `📖 How to use the bot:

🎮 **To play:**
• Use /play or click "Open App"
• Click on the coin to collect points
• Complete tasks for more rewards

💰 **To view your balance:**
• Use /balance

📋 **For tasks:**
• Use /tasks to view available tasks
• Use the app to submit tasks

👥 **For referrals:**
• Use /referral to get invitation link

Do you need help with something specific?`)
        }
        else if (text.toLowerCase().includes('problem') || text.toLowerCase().includes('error') || text.toLowerCase().includes('not working')) {
          await sendMessage(chatId, `😔 Sorry to hear that!

If you encounter a problem, try these solutions:

🔄 **Restart:**
• Click /start to restart the bot

🌐 **App:**
• Make sure you have internet connection
• Try closing and reopening the app

📞 **Contact:**
If the problem persists, contact technical support.

Would you like to try again?`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🔄 Restart",
                  callback_data: "restart"
                },
                {
                  text: "🚀 Open App",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ]]
            }
          })
        }
        else {
          // More friendly response for unknown messages
          await sendMessage(chatId, `Hello ${telegramUser.first_name}! 👋

I didn't quite understand your message, but I can help you with these commands:

🎮 /play - To start playing
💰 /balance - Show your balance  
📋 /tasks - Show tasks
👥 /referral - Invitation link
❓ /help - All commands

Or you can open the app directly:`, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "🚀 Open App",
                  web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                }
              ], [
                {
                  text: "❓ Show Commands",
                  callback_data: "help"
                }
              ]]
            }
          })
        }
      } 
      
      // Handle callback queries (interactive buttons)
      if (update.callback_query) {
        const callbackQuery = update.callback_query
        const chatId = callbackQuery.from.id
        const data = callbackQuery.data
        
        if (data === 'check_membership') {
          // Check channel membership again
          const channelMembership = await checkChannelMembership(callbackQuery.from.id, 'G_COIN_V3')
          
          if (channelMembership.is_member) {
            // User joined the channel, send welcome
            await answerCallbackQuery(callbackQuery.id, '✅ Verification successful!')
            
            // Get user to check for pending referrer
            const user = await getUser(callbackQuery.from.id)
            
            // Process pending referral if exists
            if (user?.pending_referrer_id) {
              const referrerId = user.pending_referrer_id
              console.log('🎉 Processing pending referral:', { referrerId, referredId: callbackQuery.from.id })
              
              const { data: referralResult, error: referralError } = await supabase.rpc('process_referral_on_channel_join', {
                p_referred_telegram_id: callbackQuery.from.id,
                p_referrer_telegram_id: referrerId
              })
              
              if (!referralError && referralResult) {
                const result = referralResult as any
                console.log('✅ Referral result:', result)
                
                if (result.success) {
                  // Clear pending referrer
                  await supabase
                    .from('telegram_users')
                    .update({ pending_referrer_id: null })
                    .eq('telegram_id', callbackQuery.from.id)
                  
                  // Send notification to referrer
                  try {
                    await sendMessage(referrerId, `🎉 Congratulations!
                    
A new user joined via your referral link!

👤 Name: ${callbackQuery.from.first_name}

You will earn commissions from their earnings:
• 35% from PEPE 
• 3% from ALPHA
• 5% from G COIN V4

Keep sharing your link and increase your earnings! 💰`)
                  } catch (e) {
                    console.log('⚠️ Failed to send notification to referrer:', e)
                  }
                }
              }
            }
            
            await sendMessage(chatId, `✅ Excellent! Your channel membership has been verified.
            
🎉 Welcome to G Coin!`)
            
            // Send full welcome message
            await sendPhoto(chatId, "https://2d7cfa04-9267-4cc8-9b9c-7b0a2531b69d.lovableproject.com/lovable-uploads/7a5eafb7-3634-408a-a9ba-57938699ae23.png", 
              `💎 Welcome to G Coin!

Platform for fun and rewards built on the TON network.

Collect G Coin points by playing and inviting friends.`, {
              reply_markup: {
                inline_keyboard: [
                  [{
                    text: "Launch App",
                    web_app: { url: "https://g-coin-bot-1r3s.vercel.app/" }
                  }]
                ]
              }
            })
          } else {
            await answerCallbackQuery(callbackQuery.id, '❌ You must join the channel first!')
            await sendMessage(chatId, `❌ Your membership in the channel was not found.

Make sure you join: @G_COIN_V3`)
          }
        }
        
        // معالجة دعوات الشراكة
        if (data?.startsWith('accept_partnership_') || data?.startsWith('reject_partnership_')) {
          const invitationId = data.split('_')[2]
          const isAccepted = data.startsWith('accept_partnership_')
          
          try {
            const { data: result, error } = await supabase.rpc('respond_to_partnership_invitation', {
              p_invitation_id: invitationId,
              p_accepted: isAccepted
            })
            
            if (error) throw error
            
            const response = result as any
            
            if (response?.success) {
              await answerCallbackQuery(callbackQuery.id, isAccepted ? '✅ تم القبول!' : '❌ تم الرفض')
              
              if (isAccepted) {
                await sendMessage(chatId, `🎉 *مبروك! أصبحت شريكاً*

تم قبول دعوة الشراكة بنجاح!

*نسب العمولة الخاصة بك:*
• 60% من عملات PEPE من فريقك
• 6% من عملات ALPHA من فريقك  
• 10% من عملات G COIN V4 من فريقك

ابدأ الآن في بناء فريقك وزيادة أرباحك! 💰`, {
                  parse_mode: 'Markdown'
                })
              } else {
                await sendMessage(chatId, `❌ تم رفض دعوة الشراكة.

يمكنك قبول دعوة أخرى في المستقبل إذا أردت.`)
              }
            } else {
              await answerCallbackQuery(callbackQuery.id, response?.message || 'حدث خطأ')
            }
          } catch (error) {
            console.error('Error processing partnership response:', error)
            await answerCallbackQuery(callbackQuery.id, 'حدث خطأ في معالجة الدعوة')
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Database functions
async function upsertUser(telegramUser: any) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
        is_bot: telegramUser.is_bot,
        last_active: new Date().toISOString()
      }, {
        onConflict: 'telegram_id'
      })
      .select()

    if (error) {
      console.error('Error upserting user:', error)
      return {
        id: 'offline_user',
        telegram_id: telegramUser.id,
        coins: 0,
        energy: 1000
      }
    }

    return data?.[0]
  } catch (error) {
    console.error('Database connection failed, using offline mode:', error)
    return {
      id: 'offline_user',
      telegram_id: telegramUser.id,
      coins: 0,
      energy: 1000
    }
  }
}

async function getUser(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (error) {
      console.error('Error getting user:', error)
      return {
        id: 'offline_user',
        telegram_id: telegramId,
        coins: 0,
        energy: 1000,
        energy_limit: 1000
      }
    }

    return data
  } catch (error) {
    console.error('Database connection failed in getUser, using offline mode:', error)
    return {
      id: 'offline_user',
      telegram_id: telegramId,
      coins: 0,
      energy: 1000,
      energy_limit: 1000
    }
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

    if (error) {
      console.error('Error updating user coins:', error)
      return null
    }

    return data?.[0]
  } catch (error) {
    console.error('Error in updateUserCoins:', error)
    return null
  }
}

async function updateUserEnergy(telegramId: number, energy: number) {
  try {
    const { data, error } = await supabase
      .from('telegram_users')
      .update({ 
        energy: energy,
        last_active: new Date().toISOString()
      })
      .eq('telegram_id', telegramId)
      .select()

    if (error) {
      console.error('Error updating user energy:', error)
      return null
    }

    return data?.[0]
  } catch (error) {
    console.error('Error in updateUserEnergy:', error)
    return null
  }
}

async function saveTaskSubmission(telegramId: number, taskType: string, taskData: any) {
  try {
    // Get user first
    const user = await getUser(telegramId)
    if (!user || user.id === 'offline_user') {
      console.log('User not found or in offline mode, task submission saved temporarily')
      return { 
        id: 'temp_task', 
        status: 'temporarily_saved',
        message: 'Your request has been saved temporarily. It will be processed when connection is restored.'
      }
    }

    const { data, error } = await supabase
      .from('user_tasks')
      .insert({
        telegram_user_id: user.id,
        task_type: taskType,
        task_data: taskData,
        completed: false,
        reward_claimed: false
      })
      .select()

    if (error) {
      console.error('Error saving task submission:', error)
      return { 
        id: 'temp_task', 
        status: 'temporarily_saved',
        message: 'Your request has been saved temporarily. It will be processed when connection is restored.'
      }
    }

    return data?.[0]
  } catch (error) {
    console.error('Database connection failed in saveTaskSubmission:', error)
    return { 
      id: 'temp_task', 
      status: 'temporarily_saved',
      message: 'Your request has been saved temporarily. It will be processed when connection is restored.'
    }
  }
}

// Process referral in webhook
async function processReferralInWebhook(referrerTelegramId: number, referredTelegramId: number) {
  try {
    console.log('🔄 Processing referral in webhook:', { referrerTelegramId, referredTelegramId });
    
    // Get referrer and referred user data
    const referrerUser = await getUser(referrerTelegramId)
    const referredUser = await getUser(referredTelegramId)
    
    if (!referrerUser || !referredUser) {
      console.error('❌ Referrer or referred user not found')
      return false
    }

    // Check if user is in offline mode
    if (referrerUser.id === 'offline_user' || referredUser.id === 'offline_user') {
      console.log('⚠️ User in offline mode, skipping referral')
      return false
    }

    // Check if referral doesn't already exist
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_telegram_id', referredTelegramId)
      .single()

    if (existingReferral) {
      console.log('ℹ️ User already has a referrer')
      return false
    }

    // Use process_referral function from database
    const { data: processResult, error: processError } = await supabase
      .rpc('process_referral', {
        referred_user_id: referredUser.id,
        referrer_telegram_id_param: referrerTelegramId
      });

    if (processError) {
      console.error('❌ Error processing referral:', processError);
      return false;
    }

    const resultData = processResult as any;
    console.log('📊 Referral process result:', resultData);
    
    if (resultData?.success) {
      console.log('✅ Referral processed successfully:', resultData.message);
      
      // No immediate notification - user will be notified when friend completes tasks
      // Notification will be sent via notify-referrer-reward edge function
      
      return true;
    } else {
      console.log('ℹ️ Referral not processed:', resultData?.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error in processReferralInWebhook:', error)
    return false
  }
}

async function createReferral(referrerTelegramId: number, referredTelegramId: number) {
  return await processReferralInWebhook(referrerTelegramId, referredTelegramId);
}

async function getUserTasksStatus(userId: string): Promise<string> {
  try {
    // If user is in offline mode, show alternative message
    if (userId === 'offline_user') {
      return `📋 Available Tasks (Offline Mode):

🎯 Basic Tasks:
🏪 KUCOIN - 25 coins
👥 Invite 5 friends - 50 coins  
📱 Share the game - 5 coins
📺 Join Telegram channel - 3 coins

⚠️ Bot is running in emergency mode
All data will be restored when connection is back

📱 Use the app to complete tasks!`
    }

    // Get completed tasks
    const { data: completedTasks, error: completedError } = await supabase
      .from('completed_tasks')
      .select('*')
      .eq('telegram_user_id', userId)

    if (completedError) {
      console.error('Error fetching completed tasks:', completedError)
    }

    // Get pending tasks
    const { data: pendingTasks, error: pendingError } = await supabase
      .from('pending_tasks')
      .select('*')
      .eq('telegram_user_id', userId)

    if (pendingError) {
      console.error('Error fetching pending tasks:', pendingError)
    }

    // Get default tasks from database
    const { data: defaultTasks, error: defaultError } = await supabase
      .from('default_tasks')
      .select('*')
      .eq('is_active', true)

    if (defaultError) {
      console.error('Error fetching default tasks:', defaultError)
    }

    const availableTasks = defaultTasks || [
      { task_id: '1', title: 'KUCOIN', reward_amount: 25, task_type: 'platform' },
      { task_id: '2', title: 'Invite 5 friends', reward_amount: 50, task_type: 'referral' },
      { task_id: '3', title: 'Share the game', reward_amount: 5, task_type: 'social' },
      { task_id: '4', title: 'Join Telegram channel', reward_amount: 3, task_type: 'channel' }
    ]

    // Prepare text
    let message = '📋 Task Status:\n\n'

    // Completed tasks
    if (completedTasks && completedTasks.length > 0) {
      message += '✅ Completed Tasks:\n'
      completedTasks.forEach(task => {
        message += `✅ ${task.task_title} - ${task.reward_amount} coins\n`
      })
      message += '\n'
    }

    // Pending tasks
    if (pendingTasks && pendingTasks.length > 0) {
      message += '⏳ Tasks Under Review:\n'
      pendingTasks.forEach(task => {
        const statusEmoji = task.status === 'pending' ? '⏳' : 
                           task.status === 'reviewing' ? '🔍' : 
                           task.status === 'rejected' ? '❌' : '⏳'
        message += `${statusEmoji} ${task.task_title} - ${task.status === 'rejected' ? 'Rejected' : 'Under Review'}\n`
      })
      message += '\n'
    }

    // Available tasks
    const completedTaskIds = completedTasks?.map(t => t.task_id) || []
    const pendingTaskIds = pendingTasks?.map(t => t.task_id) || []
    const availableTasksToShow = availableTasks.filter(task => 
      !completedTaskIds.includes(task.task_id) && !pendingTaskIds.includes(task.task_id)
    )

    if (availableTasksToShow.length > 0) {
      message += '🎯 Available Tasks:\n'
      availableTasksToShow.forEach(task => {
        const emoji = task.task_type === 'platform' ? '🏪' :
                     task.task_type === 'referral' ? '👥' :
                     task.task_type === 'social' ? '📱' : '🎯'
        if (task.task_id === '6' || task.title === 'KUCOIN') {
          message += `${emoji} ${task.title} - ${task.reward_amount} coins (submit via website)\n`
        } else {
          message += `${emoji} ${task.title} - ${task.reward_amount} coins\n`
        }
      })
      message += '\n'
    }

    message += `📱 To submit tasks, use the app directly`

    return message
  } catch (error) {
    console.error('Database connection failed in getUserTasksStatus, using offline mode:', error)
    return `📋 Available Tasks (Emergency Mode):

🎯 Basic Tasks:
🏪 KUCOIN - 25 coins
👥 Invite 5 friends - 50 coins  
📱 Share the game - 5 coins
📺 Join Telegram channel - 3 coins

⚠️ System is running in emergency mode
All data will be restored when connection is back

📱 To submit tasks, use the app directly`
  }
}

async function sendPhoto(chatId: number, photo: string, caption: string, extra: any = {}) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photo,
        caption: caption,
        parse_mode: 'HTML',
        ...extra
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error sending photo:', errorText)
    }
  } catch (error) {
    console.error('Failed to send photo:', error)
  }
}

async function sendMessage(chatId: number, text: string, extra: any = {}) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...extra
      }),
    })

    if (!response.ok) {
      console.error('Failed to send message:', await response.text())
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

// Function to check for new pending tasks and notify admin
async function checkNewPendingTasks() {
  try {
    // Check new pending tasks (created in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: newPendingTasks, error } = await supabase
      .from('pending_tasks')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', fiveMinutesAgo)
    
    if (error) {
      console.error('Error fetching new pending tasks:', error)
      return
    }

    if (newPendingTasks && newPendingTasks.length > 0) {
      // Send admin notification for each new task
      for (const task of newPendingTasks) {
        // Get user data separately
        const { data: user } = await supabase
          .from('telegram_users')
          .select('telegram_id, first_name, username')
          .eq('id', task.telegram_user_id)
          .single()
        
        if (!user) continue
        
        const adminMessage = `🔔 New task needs review:

👤 User: ${user.first_name} (@${user.username || 'Not specified'})
🆔 Telegram ID: ${user.telegram_id}
📋 Task: ${task.task_title}
🔢 UID: ${task.uid}
🔗 Link: ${task.campaign_link || 'Not specified'}
⏰ Submission time: ${new Date(task.created_at).toLocaleString('en-US')}

Please review the task and verify the participation.`

        // Send to admin (you can change this number to the actual admin number)
        const ADMIN_CHAT_ID = 138370 // Admin ID
        await sendMessage(ADMIN_CHAT_ID, adminMessage)

        console.log(`Notified admin about new pending task: ${task.task_title} from user ${user.telegram_id}`)
      }
    }
  } catch (error) {
    console.error('Error in checkNewPendingTasks:', error)
  }
}

// Admin functions to approve and reject tasks
async function approveTask(taskId: string) {
  try {
    console.log(`Approving task: ${taskId}`)
    
    const { data, error } = await supabase
      .from('pending_tasks')
      .update({ 
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        telegram_users!inner(telegram_id, first_name)
      `)
    
    if (error) {
      console.error('Error approving task:', error)
      return { success: false, message: `❌ Error approving task: ${error.message}` }
    }

    if (!data || data.length === 0) {
      return { success: false, message: '❌ Task not found or already processed' }
    }

    const task = data[0]
    const user = task.telegram_users
    
    // Notify user of task approval
    const userMessage = `🎉 Congratulations! Your task "${task.task_title}" has been approved

✅ 10 coins have been added to your balance
💰 Keep completing tasks to earn more!`

    await sendMessage(user.telegram_id, userMessage)
    
    return { 
      success: true, 
      message: `✅ Task approved successfully!\n👤 User: ${user.first_name}\n📋 Task: ${task.task_title}` 
    }
    
  } catch (error) {
    console.error('Error in approveTask:', error)
    return { success: false, message: '❌ System error, please try again' }
  }
}

async function rejectTask(taskId: string, reason: string) {
  try {
    console.log(`Rejecting task: ${taskId} with reason: ${reason}`)
    
    const { data, error } = await supabase
      .from('pending_tasks')
      .update({ 
        status: 'rejected',
        reviewer_notes: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        telegram_users!inner(telegram_id, first_name)
      `)
    
    if (error) {
      console.error('Error rejecting task:', error)
      return { success: false, message: `❌ Error rejecting task: ${error.message}` }
    }

    if (!data || data.length === 0) {
      return { success: false, message: '❌ Task not found or already processed' }
    }

    const task = data[0]
    const user = task.telegram_users
    
    // Notify user of task rejection
    const userMessage = `😔 Sorry, your task "${task.task_title}" has been rejected

❌ Reason: ${reason}

💡 You can try again after fixing the issue
Use the app to submit the task again`

    await sendMessage(user.telegram_id, userMessage)
    
    return { 
      success: true, 
      message: `❌ Task rejected!\n👤 User: ${user.first_name}\n📋 Task: ${task.task_title}\n📝 Reason: ${reason}` 
    }
    
  } catch (error) {
    console.error('Error in rejectTask:', error)
    return { success: false, message: '❌ System error, please try again' }
  }
}

// Function to check channel membership
async function checkChannelMembership(userId: number, channelUsername: string) {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('Bot token not found')
      return { is_member: false, error: 'Bot token not configured' }
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: `@${channelUsername}`,
        user_id: userId
      })
    })

    const result = await response.json()
    
    if (result.ok) {
      const status = result.result.status
      const isMember = ['creator', 'administrator', 'member'].includes(status)
      return { is_member: isMember, status }
    } else {
      console.error('Channel membership check failed:', result.description)
      return { is_member: false, error: result.description }
    }
  } catch (error) {
    console.error('Error checking channel membership:', error)
    return { is_member: false, error: error.message }
  }
}

// Function to respond to callback queries
async function answerCallbackQuery(callbackQueryId: string, text: string) {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('Bot token not found')
      return
    }

    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: false
      })
    })
  } catch (error) {
    console.error('Error answering callback query:', error)
  }
}

// Verification function removed - no longer needed