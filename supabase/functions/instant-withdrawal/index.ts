import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TonClient, WalletContractV4, internal } from 'https://esm.sh/@ton/ton@15.3.1'
import { mnemonicToWalletKey } from 'https://esm.sh/@ton/crypto@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// يجب إضافة مفاتيح TON للمحفظة الرئيسية في secrets
const TON_WALLET_SEED = Deno.env.get('TON_WALLET_SEED') || 'error elephant food illegal moment decrease report invite job use orphan traffic solve crawl spread swamp hill seek heavy run salad deal exhaust tank'
const TON_WALLET_ADDRESS = Deno.env.get('TON_WALLET_ADDRESS') || 'UQC4lt5vMjeAVhUIrg0JQqqnd0yuDJeyV_5AZTNx9yl7mRkz'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { telegram_user_id, wallet_address, amount } = await req.json()

    console.log('Instant withdrawal request:', {
      telegram_user_id,
      wallet_address,
      amount
    })

    // التحقق من صحة البيانات
    if (!telegram_user_id || !wallet_address || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'بيانات غير صحيحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // التحقق من رصيد المستخدم
    const { data: userData, error: userError } = await supabase
      .from('telegram_users')
      .select('ton_balance')
      .eq('id', telegram_user_id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'المستخدم غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (userData.ton_balance < amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'الرصيد غير كافي' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 0.1) {
      return new Response(
        JSON.stringify({ success: false, error: 'الحد الأدنى للسحب 0.1 TON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // خصم المبلغ من رصيد المستخدم فوراً
    const { error: balanceError } = await supabase
      .from('telegram_users')
      .update({
        ton_balance: userData.ton_balance - amount
      })
      .eq('id', telegram_user_id)

    if (balanceError) {
      console.error('Error updating balance:', balanceError)
      return new Response(
        JSON.stringify({ success: false, error: 'فشل في تحديث الرصيد' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // الخطوة 1: حفظ طلب السحب في قاعدة البيانات كطلب معلق
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from('pending_ton_withdrawals')
      .insert({
        telegram_user_id,
        wallet_address,
        amount,
        status: 'pending'
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('Error creating withdrawal request:', withdrawalError)
      // إرجاع المبلغ للمستخدم في حالة فشل إنشاء الطلب
      await supabase
        .from('telegram_users')
        .update({
          ton_balance: userData.ton_balance // إرجاع الرصيد الأصلي
        })
        .eq('id', telegram_user_id)
        
      return new Response(
        JSON.stringify({ success: false, error: 'فشل في إنشاء طلب السحب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Withdrawal request created for user ${telegram_user_id}`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إنشاء طلب السحب بنجاح. سيتم معالجة ${amount} TON قريباً`,
        withdrawal_id: withdrawalRequest.id,
        amount: amount,
        status: 'pending'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Instant withdrawal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'حدث خطأ أثناء معالجة السحب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// دالة إرسال معاملة TON الحقيقية
async function sendTonTransaction(recipientAddress: string, amount: number): Promise<string | null> {
  try {
    console.log(`Sending ${amount} TON to ${recipientAddress}`)
    
    if (!TON_WALLET_SEED || !TON_WALLET_ADDRESS) {
      console.error('TON wallet credentials not configured')
      return null
    }

    // إنشاء عميل TON
    const client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    })

    // تحويل seed إلى مفاتيح المحفظة
    const keyPair = await mnemonicToWalletKey(TON_WALLET_SEED.split(' '))
    
    // إنشاء محفظة V4
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
    const contract = client.open(wallet)

    // التحقق من رصيد المحفظة المرسلة
    const balance = await contract.getBalance()
    const amountNano = BigInt(Math.floor(amount * 1000000000)) // تحويل إلى nanotons
    
    if (balance < amountNano + BigInt(50000000)) { // +0.05 TON رسوم
      console.error('Insufficient balance in sender wallet')
      return null
    }

    // إنشاء وإرسال المعاملة
    const seqno = await contract.getSeqno()
    
    const transfer = contract.createTransfer({
      secretKey: keyPair.secretKey,
      seqno: seqno,
      messages: [
        internal({
          to: recipientAddress,
          value: amountNano,
          body: "Instant withdrawal from TON Bot",
          bounce: false,
        })
      ]
    })

    await contract.send(transfer)
    
    // انتظار تأكيد المعاملة
    let currentSeqno = seqno
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      currentSeqno = await contract.getSeqno()
      if (currentSeqno > seqno) {
        break
      }
    }

    if (currentSeqno > seqno) {
      // إنشاء hash المعاملة
      const txHash = transfer.hash().toString('hex')
      console.log(`Transaction sent successfully: ${txHash}`)
      return txHash
    } else {
      console.error('Transaction confirmation timeout')
      return null
    }
    
  } catch (error) {
    console.error('Error sending TON transaction:', error)
    return null
  }
}