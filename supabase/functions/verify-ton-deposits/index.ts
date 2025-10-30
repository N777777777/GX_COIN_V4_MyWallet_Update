import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DepositRecord {
  id: string
  telegram_user_id: string
  transaction_hash: string
  wallet_address: string
  amount: number
  status: string
  created_at: string
  verification_attempts: number
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

    // البحث عن الإيداعات المعلقة التي مر عليها أكثر من 5 دقائق
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    console.log(`Looking for deposits older than: ${fiveMinutesAgo}`)
    
    const { data: pendingDeposits, error: fetchError } = await supabase
      .from('pending_ton_deposits')
      .select('*')
      .eq('status', 'pending_verification')
      .lt('created_at', fiveMinutesAgo)
      .lt('verification_attempts', 5) // حد أقصى 5 محاولات

    if (fetchError) {
      console.error('Error fetching pending deposits:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending deposits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!pendingDeposits || pendingDeposits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending deposits to verify' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${pendingDeposits.length} deposits to verify`)
    
    const results = []
    
    for (const deposit of pendingDeposits as DepositRecord[]) {
      try {
        // تحديث محاولة التحقق
        await supabase
          .from('pending_ton_deposits')
          .update({ 
            verification_attempts: deposit.verification_attempts + 1,
            last_verification_attempt: new Date().toISOString()
          })
          .eq('id', deposit.id)

        // محاولة التحقق من المعاملة باستخدام TON API
        const isValid = await verifyTonTransaction(
          deposit.transaction_hash,
          deposit.wallet_address,
          deposit.amount
        )

        if (isValid) {
          // المعاملة صحيحة - تحديث الحالة
          const { error: updateError } = await supabase
            .from('pending_ton_deposits')
            .update({ 
              status: 'verified',
              verified_at: new Date().toISOString()
            })
            .eq('id', deposit.id)

          if (updateError) {
            console.error('Error updating deposit status:', updateError)
            continue
          }

          // تطبيق الإيداع المُتحقق منه
          const { error: processError } = await supabase
            .rpc('process_verified_deposit', { deposit_id: deposit.id })

          if (processError) {
            console.error('Error processing verified deposit:', processError)
          } else {
            console.log(`Successfully processed deposit ${deposit.id}`)
            results.push({ 
              id: deposit.id, 
              status: 'verified_and_processed',
              amount: deposit.amount 
            })
          }
        } else {
          // فشل التحقق
          if (deposit.verification_attempts >= 4) {
            // بعد 5 محاولات فاشلة، رفض الإيداع ووضع علامة "فشل"
            await supabase
              .from('pending_ton_deposits')
              .update({ 
                status: 'failed',
                verified_at: new Date().toISOString()
              })
              .eq('id', deposit.id)
            
            console.log(`Deposit ${deposit.id} marked as failed after 5 attempts`)
            results.push({ 
              id: deposit.id, 
              status: 'failed',
              reason: 'Transaction not found after 5 verification attempts' 
            })
          } else {
            console.log(`Verification attempt ${deposit.verification_attempts + 1} failed for deposit ${deposit.id}`)
            results.push({ 
              id: deposit.id, 
              status: 'verification_failed',
              attempt: deposit.verification_attempts + 1 
            })
          }
        }
      } catch (error) {
        console.error(`Error verifying deposit ${deposit.id}:`, error)
        results.push({ 
          id: deposit.id, 
          status: 'error', 
          error: error.message 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} deposits`,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Verification function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// دالة التحقق من معاملة TON
async function verifyTonTransaction(
  txHash: string, 
  expectedFromAddress: string, 
  expectedAmount: number
): Promise<boolean> {
  try {
    // استخدام TON API للتحقق من المعاملة
    const tonApiUrl = 'https://tonapi.io/v2'
    const targetAddress = 'UQC4lt5vMjeAVhUIrg0JQqqnd0yuDJeyV_5AZTNx9yl7mRkz'
    
    console.log(`Verifying transaction ${txHash}`)
    
    // البحث عن المعاملة
    const response = await fetch(`${tonApiUrl}/blockchain/transactions/${txHash}`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.log(`Transaction ${txHash} not found or invalid`)
      return false
    }

    const transaction = await response.json()
    
    // التحقق من أن المعاملة موجهة للعنوان الصحيح
    const messages = transaction.out_msgs || []
    
    for (const message of messages) {
      if (message.destination?.address === targetAddress) {
        const amountNano = parseInt(message.value || '0')
        const amountTon = amountNano / 1000000000 // تحويل من nanoton إلى TON
        
        // التحقق من المبلغ (مع هامش خطأ صغير)
        if (Math.abs(amountTon - expectedAmount) < 0.001) {
          console.log(`Transaction ${txHash} verified successfully`)
          return true
        }
      }
    }
    
    console.log(`Transaction ${txHash} verification failed - amount or address mismatch`)
    return false
    
  } catch (error) {
    console.error(`Error verifying transaction ${txHash}:`, error)
    return false
  }
}