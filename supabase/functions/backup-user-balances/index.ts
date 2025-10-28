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

    console.log('Starting backup of user balances...')

    // Get all users with their balances (using obfuscated column names)
    const { data: users, error: usersError } = await supabase
      .from('telegram_users')
      .select('id, telegram_id, first_name, username, coins, ton_balance, bal_x7k9m, bal_w5r2t, bal_g4v7y')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    console.log(`Backing up ${users?.length || 0} users...`)

    // Store backup in a new table
    const backupData = users?.map(user => ({
      ...user,
      backup_timestamp: new Date().toISOString(),
      backup_reason: 'Security backup before implementing secure balance updates'
    }))

    const { error: backupError } = await supabase
      .from('balance_backups')
      .insert(backupData)

    if (backupError) {
      console.error('Error creating backup:', backupError)
      throw backupError
    }

    console.log('Backup completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup completed',
        users_backed_up: users?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
