// Script للرد على أمر /start في تليجرام بوت
const TelegramBot = require('node-telegram-bot-api');

// ضع التوكن الخاص بالبوت هنا
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// الرد على أمر /start
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || 'Friend';
  
  // الرسالة الترحيبية
  const welcomeMessage = `💎 Welcome to G Coin, ${firstName}!

The fun and rewards platform built on the TON network.

Accumulate G Coin points by playing games and inviting friends.

The more points you collect, the closer you are to great rewards!

Share the fun and win with your friends`;

  // إرسال الرسالة
  try {
    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎮 Play Game', web_app: { url: 'https://your-app-url.com' } }
          ],
          [
            { text: '👥 Invite Friends', callback_data: 'invite_friends' },
            { text: '📊 My Stats', callback_data: 'my_stats' }
          ]
        ]
      }
    });
    
    console.log(`Welcome message sent to user ${userId} (${firstName})`);
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

// معالجة الأزرار
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data === 'invite_friends') {
    const inviteText = `🚀 Join me on G Coin and earn rewards together!
    
Click here to start: https://t.me/your_bot_username?start=${callbackQuery.from.id}`;
    
    await bot.sendMessage(chatId, inviteText);
  }
  
  if (data === 'my_stats') {
    const statsText = `📊 Your G Coin Stats:
    
💰 Total Coins: 0
👥 Referrals: 0
🏆 Level: Beginner`;
    
    await bot.sendMessage(chatId, statsText);
  }
  
  // إزالة loading من الزر
  await bot.answerCallbackQuery(callbackQuery.id);
});

console.log('Bot is running...');