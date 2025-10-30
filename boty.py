import json
import os
import asyncio
import aiohttp
import time
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes, ConversationHandler

# عنوان محفظة TON1
TON_WALLET = "UQBzaQtkHo4RTDOGeYIb53_B_ksm2FZtDXFL-Rgh_c8O5GZo"
MIN_DEPOSIT = 0.1

# TON API للتحقق
TON_API_URL = "https://toncenter.com/api/v2/getTransactions"
TON_API_KEY = "968d2d69e2d847251b83d04c4fca46becaa0f7d725634a7ea78e1b33dd5f25bc"

# رابط صفحة الإيداع
DEPOSIT_PAGE_URL = "https://g-coin-bot-1r3s.vercel.app"

# ملف حفظ البيانات
DATA_FILE = "users_data.json"

# تخزين المعاملات المنتظرة للتحقق التلقائي
pending_verifications = {}

# قراءة البيانات
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# حفظ البيانات
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# التحقق من وصول المعاملة
async def check_transaction(user_id: int, expected_amount: float):
    """
    التحقق من المعاملة على البلوكشين بدون comment
    """
    try:
        params = {
            'address': TON_WALLET,
            'limit': 50,
        }
        
        headers = {
            'X-API-Key': TON_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(TON_API_URL, params=params, headers=headers) as response:
                if response.status != 200:
                    return False, 0
                
                data = await response.json()
                
                if not data.get('ok'):
                    return False, 0
                
                transactions = data.get('result', [])
                
                # البحث عن معاملات حديثة (آخر 10 دقائق)
                current_time = time.time()
                ten_minutes_ago = current_time - 600
                
                for tx in transactions:
                    in_msg = tx.get('in_msg', {})
                    
                    if not in_msg:
                        continue
                    
                    # التحقق من الوقت
                    tx_time = tx.get('utime', 0)
                    if tx_time < ten_minutes_ago:
                        continue
                    
                    # المبلغ
                    value = int(in_msg.get('value', 0))
                    amount_ton = value / 1_000_000_000
                    
                    # التحقق من المبلغ (هامش 5% للرسوم)
                    if amount_ton >= expected_amount * 0.95:
                        return True, amount_ton
                
                return False, 0
    
    except Exception as e:
        print(f"خطأ في التحقق: {e}")
        return False, 0

# لوحة المفاتيح الرئيسية
def main_keyboard():
    keyboard = [
        [KeyboardButton("💰 إيداع"), KeyboardButton("💳 رصيدي")],
        [KeyboardButton("📊 سجل الإيداعات")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

# أمر البداية
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    data = load_data()
    
    if str(user.id) not in data:
        data[str(user.id)] = {
            "username": user.username or user.first_name,
            "balance": 0.0,
            "deposits": []
        }
        save_data(data)
    
    welcome_msg = f"""
🎉 أهلاً بك {user.first_name}!

💎 بوت إيداع TON - نظام الدفع المباشر
━━━━━━━━━━━━━━━
✅ الحد الأدنى للإيداع: {MIN_DEPOSIT} TON
🔗 وصّل محفظتك وادفع مباشرة
⚡️ إضافة الرصيد تلقائياً

استخدم الأزرار بالأسفل:
💰 إيداع - لإضافة رصيد
💳 رصيدي - لعرض رصيدك
📊 سجل الإيداعات - لعرض سجلك
"""
    await update.message.reply_text(welcome_msg, reply_markup=main_keyboard())
    return ConversationHandler.END

# بداية الإيداع - إرسال رابط الصفحة كـ Web App
async def deposit_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    # إضافة user_id للرابط
    deposit_link = f"{DEPOSIT_PAGE_URL}?user_id={user.id}"
    
    keyboard = [
        [InlineKeyboardButton("💎 فتح صفحة الإيداع", web_app={"url": deposit_link})],
        [InlineKeyboardButton("✅ تحققت من الدفع", callback_data=f"check_deposit_{user.id}")],
        [InlineKeyboardButton("❌ إلغاء", callback_data="deposit_cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    msg = f"""
💰 إيداع TON
━━━━━━━━━━━━━━━

📝 الخطوات:
1️⃣ اضغط "فتح صفحة الإيداع" (تفتح جوا التليجرام)
2️⃣ اضغط "ربط المحفظة" واختر محفظتك
   (Tonkeeper أو MyTonWallet)
3️⃣ اختر المبلغ من القائمة أو أدخل مبلغ مخصص
4️⃣ اضغط "إيداع الآن" وأكد من المحفظة
5️⃣ ارجع هنا واضغط "تحققت من الدفع"

⏰ انتظر 30-60 ثانية بعد الدفع قبل التحقق

⚡️ الرصيد سيضاف تلقائياً بعد التأكيد!
"""
    
    await update.message.reply_text(msg, reply_markup=reply_markup)
    return ConversationHandler.END

# التحقق اليدوي من الإيداع
async def manual_check_deposit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer("🔍 جاري البحث عن معاملات جديدة...")
    
    user_id = query.from_user.id
    
    try:
        # البحث عن معاملات هذا المستخدم
        await query.edit_message_text("🔍 جاري التحقق من البلوكشين...\n⏳ قد يستغرق بضع ثوانٍ...")
        
        params = {
            'address': TON_WALLET,
            'limit': 20,
        }
        
        headers = {
            'X-API-Key': TON_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(TON_API_URL, params=params, headers=headers) as response:
                if response.status != 200:
                    await query.edit_message_text("❌ خطأ في الاتصال بالشبكة\n\nحاول مرة أخرى بعد قليل")
                    return
                
                result = await response.json()
                
                if not result.get('ok'):
                    await query.edit_message_text("❌ خطأ في قراءة البيانات\n\nحاول مرة أخرى")
                    return
                
                transactions = result.get('result', [])
                data = load_data()
                user_str = str(user_id)
                
                # البحث عن معاملات حديثة (آخر 10 دقائق)
                current_time = time.time()
                ten_minutes_ago = current_time - 600
                found_transactions = []
                
                for tx in transactions:
                    in_msg = tx.get('in_msg', {})
                    if not in_msg:
                        continue
                    
                    # التحقق من الوقت
                    tx_time = tx.get('utime', 0)
                    if tx_time < ten_minutes_ago:
                        continue
                    
                    value = int(in_msg.get('value', 0))
                    amount_ton = value / 1_000_000_000
                    
                    if amount_ton >= MIN_DEPOSIT:
                        # التحقق من عدم تكرار المعاملة
                        tx_hash = tx.get('transaction_id', {}).get('hash', '')
                        
                        is_duplicate = False
                        if user_str in data:
                            for dep in data[user_str].get('deposits', []):
                                if dep.get('tx_hash') == tx_hash:
                                    is_duplicate = True
                                    break
                        
                        if not is_duplicate:
                            found_transactions.append({
                                'amount': amount_ton,
                                'hash': tx_hash,
                                'time': tx_time
                            })
                
                if found_transactions:
                    # إضافة المعاملات
                    if user_str not in data:
                        data[user_str] = {
                            "username": query.from_user.username or query.from_user.first_name,
                            "balance": 0.0,
                            "deposits": []
                        }
                    
                    total_added = 0
                    for tx in found_transactions:
                        data[user_str]['balance'] += tx['amount']
                        data[user_str]['deposits'].append({
                            "amount": tx['amount'],
                            "tx_hash": tx['hash'],
                            "status": "completed"
                        })
                        total_added += tx['amount']
                    
                    save_data(data)
                    
                    success_msg = f"""
✅ تم العثور على {len(found_transactions)} معاملة!

💰 إجمالي المبلغ: {total_added} TON
💳 رصيدك الحالي: {data[user_str]['balance']} TON

🎉 شكراً لك!
"""
                    await query.edit_message_text(success_msg)
                    await context.bot.send_message(
                        chat_id=user_id,
                        text="استخدم الأزرار للمتابعة:",
                        reply_markup=main_keyboard()
                    )
                else:
                    retry_keyboard = [
                        [InlineKeyboardButton("🔄 إعادة التحقق", callback_data=f"check_deposit_{user_id}")],
                        [InlineKeyboardButton("❌ إلغاء", callback_data="deposit_cancel")]
                    ]
                    
                    await query.edit_message_text(
                        """
⏳ لم يتم العثور على معاملات جديدة

الأسباب المحتملة:
• لم تكمل عملية الدفع
• المعاملة قيد المعالجة (انتظر 1-2 دقيقة)
• مشكلة في الشبكة

💡 تأكد من:
✓ أنك دفعت من صفحة الإيداع
✓ مرت 30-60 ثانية على الدفع
✓ المعاملة تمت بنجاح

حاول مرة أخرى بعد دقيقة
""",
                        reply_markup=InlineKeyboardMarkup(retry_keyboard)
                    )
    
    except Exception as e:
        print(f"خطأ: {e}")
        await query.edit_message_text("❌ حدث خطأ\n\nحاول مرة أخرى")

# إلغاء
async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query:
        await query.answer()
        await query.edit_message_text("❌ تم إلغاء العملية")
    else:
        await update.message.reply_text(
            "❌ تم إلغاء العملية",
            reply_markup=main_keyboard()
        )
    return ConversationHandler.END

# عرض الرصيد
async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    data = load_data()
    user_id = str(user.id)
    
    if user_id not in data:
        balance_amount = 0.0
        total_deposits = 0
    else:
        balance_amount = data[user_id]['balance']
        total_deposits = len(data[user_id]['deposits'])
    
    msg = f"""
💳 رصيدك الحالي
━━━━━━━━━━━━━━━

💰 الرصيد: {balance_amount} TON
📊 عدد الإيداعات: {total_deposits}
👤 المستخدم: {user.first_name}
"""
    await update.message.reply_text(msg, reply_markup=main_keyboard())

# عرض سجل الإيداعات
async def history(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    data = load_data()
    user_id = str(user.id)
    
    if user_id not in data or not data[user_id]['deposits']:
        await update.message.reply_text(
            "📊 لا توجد إيداعات حتى الآن",
            reply_markup=main_keyboard()
        )
        return
    
    deposits = data[user_id]['deposits']
    msg = "📊 سجل الإيداعات (آخر 10)\n━━━━━━━━━━━━━━━\n\n"
    
    for i, dep in enumerate(reversed(deposits[-10:]), 1):
        msg += f"{i}. {dep['amount']} TON\n"
        msg += f"   ✅ {dep['status']}\n\n"
    
    await update.message.reply_text(msg, reply_markup=main_keyboard())

# معالج الرسائل النصية
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    
    if text == "💰 إيداع":
        return await deposit_start(update, context)
    elif text == "💳 رصيدي":
        return await balance(update, context)
    elif text == "📊 سجل الإيداعات":
        return await history(update, context)
    else:
        await update.message.reply_text(
            "استخدم الأزرار بالأسفل 👇",
            reply_markup=main_keyboard()
        )

def main():
    TOKEN = "8273495685:AAEvXkIkp4-SwLPTAtrXlzslwkPThtoUvFk"
    
    app = Application.builder().token(TOKEN).job_queue(None).build()
    
    # المعالجات
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("history", history))
    app.add_handler(CommandHandler("deposit", deposit_start))
    
    # معالج أزرار الإيداع
    app.add_handler(CallbackQueryHandler(manual_check_deposit, pattern="^check_deposit_"))
    app.add_handler(CallbackQueryHandler(cancel, pattern="^deposit_cancel$"))
    
    # معالج الرسائل
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("🚀 البوت يعمل الآن...")
    print(f"💎 المحفظة: {TON_WALLET}")
    print(f"💰 الحد الأدنى: {MIN_DEPOSIT} TON")
    print(f"🌐 صفحة الإيداع: {DEPOSIT_PAGE_URL}")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
