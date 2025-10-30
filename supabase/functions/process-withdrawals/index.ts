import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TonClient, WalletContractV4, internal } from 'https://esm.sh/@ton/ton@15.3.1'
import { mnemonicToWalletKey } from 'https://esm.sh/@ton/crypto@3.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// إعدادات محفظة TON
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

    console.log('Processing pending withdrawals...')

    // الخطوة 2: جلب طلبات السحب المعلقة
    const { data: pendingWithdrawals, error: fetchError } = await supabase
      .from('pending_ton_withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // معالجة 10 طلبات في المرة الواحدة

    if (fetchError) {
      console.error('Error fetching pending withdrawals:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'فشل في جلب طلبات السحب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
      console.log('No pending withdrawals found')
      return new Response(
        JSON.stringify({ success: true, message: 'لا توجد طلبات سحب معلقة', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let failed = 0

    // معالجة كل طلب سحب
    for (const withdrawal of pendingWithdrawals) {
      try {
        console.log(`Processing withdrawal ${withdrawal.id} for ${withdrawal.amount} TON`)

        // تحديث حالة الطلب إلى "قيد المعالجة"
        await supabase
          .from('pending_ton_withdrawals')
          .update({ status: 'processing' })
          .eq('id', withdrawal.id)

        // الخطوة 3: إرسال المعاملة
        const transactionHash = await sendTonTransaction(withdrawal.wallet_address, withdrawal.amount)

        if (transactionHash) {
          // نجح الإرسال - نقل إلى الطلبات المكتملة
          await supabase
            .from('completed_ton_withdrawals')
            .insert({
              telegram_user_id: withdrawal.telegram_user_id,
              wallet_address: withdrawal.wallet_address,
              amount: withdrawal.amount,
              status: 'completed',
              transaction_hash: transactionHash,
              created_at: withdrawal.created_at,
              completed_at: new Date().toISOString()
            })

          // حذف من الطلبات المعلقة
          await supabase
            .from('pending_ton_withdrawals')
            .delete()
            .eq('id', withdrawal.id)

          console.log(`Withdrawal ${withdrawal.id} completed successfully: ${transactionHash}`)
          processed++
        } else {
          // فشل الإرسال - تحديث الحالة إلى فاشل
          await supabase
            .from('pending_ton_withdrawals')
            .update({ 
              status: 'failed',
              reviewer_notes: 'فشل في إرسال المعاملة'
            })
            .eq('id', withdrawal.id)

          // إرجاع الرصيد للمستخدم
          await supabase
            .from('telegram_users')
            .update({
              ton_balance: supabase.raw(`ton_balance + ${withdrawal.amount}`)
            })
            .eq('id', withdrawal.telegram_user_id)

          console.log(`Withdrawal ${withdrawal.id} failed`)
          failed++
        }
      } catch (error) {
        console.error(`Error processing withdrawal ${withdrawal.id}:`, error)
        
        // تحديث الحالة إلى فاشل
        await supabase
          .from('pending_ton_withdrawals')
          .update({ 
            status: 'failed',
            reviewer_notes: `خطأ: ${error.message}`
          })
          .eq('id', withdrawal.id)

        // إرجاع الرصيد للمستخدم
        await supabase
          .from('telegram_users')
          .update({
            ton_balance: supabase.raw(`ton_balance + ${withdrawal.amount}`)
          })
          .eq('id', withdrawal.telegram_user_id)

        failed++
      }
    }

    console.log(`Processing complete. Processed: ${processed}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم معالجة ${processed} طلب سحب بنجاح و ${failed} فشل`,
        processed,
        failed
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process withdrawals error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'حدث خطأ أثناء معالجة طلبات السحب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// دالة إرسال معاملة TON
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
          body: "Withdrawal from TON Bot",
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