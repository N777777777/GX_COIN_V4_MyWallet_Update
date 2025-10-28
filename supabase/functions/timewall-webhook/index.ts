import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// المفتاح السري لـ TimeWall
const TIMEWALL_SECRET = 'eeb52eb830c42bbcf333d7ff6c30d052'

// دالة لحساب SHA256 hash
async function calculateHash(userID: string, revenue: string, secret: string): Promise<string> {
  const data = userID + revenue + secret
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

Deno.serve(async (req) => {
  // معالجة CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // التحقق من أن الطلب هو GET
    if (req.method !== 'GET') {
      console.log('Invalid method:', req.method)
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    // استخراج البيانات من URL parameters
    const url = new URL(req.url)
    const userID = url.searchParams.get('userID')
    const transactionID = url.searchParams.get('transactionID')
    const revenue = url.searchParams.get('revenue')
    const currencyAmount = url.searchParams.get('currencyAmount')
    const hash = url.searchParams.get('hash')
    const ip = url.searchParams.get('ip')
    const type = url.searchParams.get('type')
    const withdrawalID = url.searchParams.get('withdrawalID')

    console.log('TimeWall webhook received:', {
      userID,
      transactionID,
      revenue,
      currencyAmount,
      type,
      hash
    })

    // التحقق من وجود البيانات المطلوبة
    if (!userID || !transactionID || !revenue || !currencyAmount || !hash) {
      console.log('Missing required parameters')
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // التحقق من صحة الـ hash
    const computedHash = await calculateHash(userID, revenue, TIMEWALL_SECRET)
    if (computedHash !== hash) {
      console.log('Invalid hash. Expected:', computedHash, 'Received:', hash)
      return new Response('Invalid hash', { 
        status: 403, 
        headers: corsHeaders 
      })
    }

    // التحقق من عدم تكرار المعاملة
    const { data: existingTransaction } = await supabase
      .from('timewall_transactions')
      .select('id')
      .eq('transaction_id', transactionID)
      .single()

    if (existingTransaction) {
      console.log('Transaction already processed:', transactionID)
      return new Response('Transaction already processed', { 
        status: 409, 
        headers: corsHeaders 
      })
    }

    // تحويل القيم إلى أرقام
    const revenueAmount = parseFloat(revenue)
    const currencyAmountNum = parseFloat(currencyAmount)

    // البحث عن المستخدم في قاعدة البيانات
    const { data: user, error: userError } = await supabase
      .from('telegram_users')
      .select('id, coins, telegram_id, first_name')
      .eq('telegram_id', parseInt(userID))
      .single()

    if (userError || !user) {
      console.log('User not found:', userID, userError)
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // حفظ المعاملة في قاعدة البيانات
    const { error: transactionError } = await supabase
      .from('timewall_transactions')
      .insert({
        user_id: userID,
        transaction_id: transactionID,
        revenue: revenueAmount,
        currency_amount: currencyAmountNum,
        transaction_type: type || 'credit',
        withdrawal_id: withdrawalID,
        user_ip: ip,
        hash_received: hash
      })

    if (transactionError) {
      console.error('Error saving transaction:', transactionError)
      return new Response('Error processing transaction', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // تحديث رصيد المستخدم (إضافة العملات)
    const newCoinsBalance = user.coins + currencyAmountNum

    const { error: updateError } = await supabase
      .from('telegram_users')
      .update({ 
        coins: newCoinsBalance,
        last_active: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user balance:', updateError)
      return new Response('Error updating user balance', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Update TimeWall qualification progress
    try {
      const { data: qualificationResult, error: qualificationError } = await supabase
        .rpc('update_timewall_qualification_progress', {
          user_telegram_id: parseInt(userID),
          coins_received: currencyAmountNum
        });

      if (qualificationError) {
        console.error('Error updating qualification progress:', qualificationError);
      } else if (qualificationResult?.qualification_achieved) {
        console.log(`User ${userID} achieved TimeWall qualification!`);
      }
    } catch (error) {
      console.error('Error calling qualification function:', error);
    }

    // Process referral commission for coins earned
    try {
      const { error: commissionError } = await supabase
        .rpc('process_referral_commission', {
          p_referred_telegram_id: parseInt(userID),
          p_commission_type: 'gcoin_v4',
          p_amount: currencyAmountNum
        });

      if (commissionError) {
        console.error('Error processing referral commission:', commissionError);
      } else {
        console.log(`Referral commission processed for user ${userID}`);
      }
    } catch (error) {
      console.error('Error calling commission function:', error);
    }

    console.log(`Successfully processed TimeWall transaction:
      User: ${user.first_name} (${userID})
      Transaction ID: ${transactionID}
      Revenue: $${revenueAmount}
      Currency Added: ${currencyAmountNum} coins
      New Balance: ${newCoinsBalance} coins
    `)

    // إرسال استجابة نجاح
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('TimeWall webhook error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})