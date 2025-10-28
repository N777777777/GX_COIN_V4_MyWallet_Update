import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting restoration of user balances from backup...')

    // Get the latest backup data
    const { data: backups, error: backupError } = await supabase
      .from('balance_backups')
      .select('*')
      .order('backup_timestamp', { ascending: false })
      .limit(1000)

    if (backupError) {
      console.error('Error fetching backup data:', backupError)
      throw backupError
    }

    if (!backups || backups.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No backup data found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log(`Found ${backups.length} user backups to restore`)

    let restoredCount = 0
    let errorCount = 0
    const errors: any[] = []

    // Group backups by telegram_id and get the latest one for each user
    const latestBackups = new Map()
    backups.forEach(backup => {
      const existing = latestBackups.get(backup.telegram_id)
      if (!existing || new Date(backup.backup_timestamp) > new Date(existing.backup_timestamp)) {
        latestBackups.set(backup.telegram_id, backup)
      }
    })

    // Restore each user's balance
    for (const backup of latestBackups.values()) {
      try {
        // Map old column names to new obfuscated names
        const updateData: any = {
          updated_at: new Date().toISOString()
        }

        // Handle both old and new column names
        if (backup.bal_x7k9m !== undefined) {
          updateData.bal_x7k9m = backup.bal_x7k9m
        } else if (backup.pepe_balance !== undefined) {
          updateData.bal_x7k9m = backup.pepe_balance
        }

        if (backup.bal_j3n8q !== undefined) {
          updateData.bal_j3n8q = backup.bal_j3n8q
        } else if (backup.pepe_advertising_balance !== undefined) {
          updateData.bal_j3n8q = backup.pepe_advertising_balance
        }

        if (backup.bal_w5r2t !== undefined) {
          updateData.bal_w5r2t = backup.bal_w5r2t
        } else if (backup.pepe_withdrawable_balance !== undefined) {
          updateData.bal_w5r2t = backup.pepe_withdrawable_balance
        }

        if (backup.bal_g4v7y !== undefined) {
          updateData.bal_g4v7y = backup.bal_g4v7y
        } else if (backup.gcoin_v4_balance !== undefined) {
          updateData.bal_g4v7y = backup.gcoin_v4_balance
        }

        if (backup.bal_a6c3z !== undefined) {
          updateData.bal_a6c3z = backup.bal_a6c3z
        } else if (backup.alpha_coins !== undefined) {
          updateData.bal_a6c3z = backup.alpha_coins
        }

        if (backup.ton_balance !== undefined) {
          updateData.ton_balance = backup.ton_balance
        }

        if (backup.coins !== undefined) {
          updateData.coins = backup.coins
        }

        const { error: updateError } = await supabase
          .from('telegram_users')
          .update(updateData)
          .eq('telegram_id', backup.telegram_id)

        if (updateError) {
          console.error(`Error restoring user ${backup.telegram_id}:`, updateError)
          errorCount++
          errors.push({
            telegram_id: backup.telegram_id,
            error: updateError.message
          })
        } else {
          restoredCount++
          console.log(`Restored balances for user ${backup.telegram_id}`)
        }
      } catch (error) {
        console.error(`Error processing user ${backup.telegram_id}:`, error)
        errorCount++
        errors.push({
          telegram_id: backup.telegram_id,
          error: error.message
        })
      }
    }

    console.log(`Restoration completed: ${restoredCount} successful, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Restoration completed',
        users_restored: restoredCount,
        errors: errorCount,
        error_details: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Restoration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
