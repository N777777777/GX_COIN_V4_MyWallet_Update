import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { transaction_hash, wallet_address, amount, telegram_user_id } = await req.json()

    console.log('Instant verification request received:', {
      transaction_hash: transaction_hash?.substring(0, 20) + '...',
      wallet_address: wallet_address?.substring(0, 20) + '...',
      amount,
      telegram_user_id: telegram_user_id?.substring(0, 8) + '...'
    })

    // التحقق الفوري من المعاملة
    const isValid = await verifyTonTransactionInstant(transaction_hash, wallet_address, amount)
    
    if (isValid) {
      // إضافة الإيداع مباشرة إلى pending_ton_deposits مع حالة verified
      const { data: depositData, error: depositError } = await supabase
        .from('pending_ton_deposits')
        .insert({
          telegram_user_id,
          transaction_hash,
          wallet_address,
          amount,
          status: 'verified',
          verified_at: new Date().toISOString()
        })
        .select()
        .single()

      if (depositError) {
        console.error('Error creating verified deposit:', depositError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create deposit record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // معالجة الإيداع فوراً (إضافة الرصيد للمستخدم)
      const { error: processError } = await supabase
        .rpc('process_verified_deposit', { deposit_id: depositData.id })

      if (processError) {
        console.error('Error processing deposit:', processError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to process deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Instant deposit processed successfully for user ${telegram_user_id}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم التحقق من الإيداع وإضافة الرصيد فوراً',
          amount: amount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // فشل التحقق
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'فشل في التحقق من صحة المعاملة. تأكد من إرسال المبلغ الصحيح للعنوان الصحيح.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Instant verification error:', error)
    
    // إضافة تفاصيل أكثر عن الخطأ
    const errorDetails = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorDetails)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'حدث خطأ أثناء التحقق من المعاملة',
        details: errorDetails 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// دالة التحقق الفوري من معاملة TON
async function verifyTonTransactionInstant(
  txHash: string, 
  expectedFromAddress: string, 
  expectedAmount: number
): Promise<boolean> {
  try {
    const tonApiUrl = 'https://tonapi.io/v2'
    const TON_WALLET_ADDRESS = Deno.env.get('TON_WALLET_ADDRESS')
    
    if (!TON_WALLET_ADDRESS) {
      console.error('TON_WALLET_ADDRESS environment variable not set')
      return false
    }
    
    // استخدام العنوان المحدد في الكود كبديل إذا لم يكن محدد في المتغيرات
    const targetAddress = TON_WALLET_ADDRESS || "UQC4lt5vMjeAVhUIrg0JQqqnd0yuDJeyV_5AZTNx9yl7mRkz"
    console.log(`Instant verification for transaction ${txHash} to address ${targetAddress}`)
    
    // محاولة للتحقق من المعاملة عدة مرات (حتى 30 ثانية)
    let attempts = 0
    const maxAttempts = 6
    const delay = 5000 // 5 ثواني بين كل محاولة

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${tonApiUrl}/blockchain/transactions/${txHash}`, {
          headers: {
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const transaction = await response.json()
          
          // التحقق من الرسائل الصادرة
          const messages = transaction.out_msgs || []
          
          for (const message of messages) {
            if (message.destination?.address === targetAddress) {
              const amountNano = parseInt(message.value || '0')
              const amountTon = amountNano / 1000000000
              
              // التحقق من المبلغ (مع هامش خطأ صغير)
              if (Math.abs(amountTon - expectedAmount) < 0.001) {
                console.log(`Transaction ${txHash} verified instantly`)
                return true
              }
            }
          }
        }
      } catch (attemptError) {
        console.log(`Attempt ${attempts + 1} failed:`, attemptError.message)
      }

      attempts++
      if (attempts < maxAttempts) {
        console.log(`Waiting ${delay}ms before next attempt...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    console.log(`Transaction ${txHash} verification failed after ${maxAttempts} attempts`)
    return false
    
  } catch (error) {
    console.error(`Error verifying transaction ${txHash}:`, error)
    return false
  }
}