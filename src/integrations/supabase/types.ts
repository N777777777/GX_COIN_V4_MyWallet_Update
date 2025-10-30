export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_first_name: string | null
          admin_password: string
          admin_telegram_id: number | null
          admin_username: string | null
          created_at: string | null
          details: Json | null
          id: string
          performed_at: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_first_name?: string | null
          admin_password: string
          admin_telegram_id?: number | null
          admin_username?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_at?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_first_name?: string | null
          admin_password?: string
          admin_telegram_id?: number | null
          admin_username?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_at?: string | null
        }
        Relationships: []
      }
      balance_audit_log: {
        Row: {
          additional_data: Json | null
          amount_changed: number
          balance_type: string
          created_at: string | null
          edge_function_name: string | null
          id: string
          ip_address: string | null
          new_balance: number
          old_balance: number
          operation_type: string
          source: string
          telegram_id: number
          telegram_user_id: string
          user_agent: string | null
        }
        Insert: {
          additional_data?: Json | null
          amount_changed: number
          balance_type: string
          created_at?: string | null
          edge_function_name?: string | null
          id?: string
          ip_address?: string | null
          new_balance: number
          old_balance: number
          operation_type: string
          source: string
          telegram_id: number
          telegram_user_id: string
          user_agent?: string | null
        }
        Update: {
          additional_data?: Json | null
          amount_changed?: number
          balance_type?: string
          created_at?: string | null
          edge_function_name?: string | null
          id?: string
          ip_address?: string | null
          new_balance?: number
          old_balance?: number
          operation_type?: string
          source?: string
          telegram_id?: number
          telegram_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_audit_log_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          binance_id: string | null
          campaign_id: string
          id: string
          joined_at: string
          participation_type: string
          referrer_id: string | null
          referrer_telegram_id: number | null
          reward_amount: number | null
          reward_distributed: boolean | null
          ton_wallet_address: string | null
          user_id: string
          user_telegram_id: number
          verified_channel_membership: boolean | null
        }
        Insert: {
          binance_id?: string | null
          campaign_id: string
          id?: string
          joined_at?: string
          participation_type: string
          referrer_id?: string | null
          referrer_telegram_id?: number | null
          reward_amount?: number | null
          reward_distributed?: boolean | null
          ton_wallet_address?: string | null
          user_id: string
          user_telegram_id: number
          verified_channel_membership?: boolean | null
        }
        Update: {
          binance_id?: string | null
          campaign_id?: string
          id?: string
          joined_at?: string
          participation_type?: string
          referrer_id?: string | null
          referrer_telegram_id?: number | null
          reward_amount?: number | null
          reward_distributed?: boolean | null
          ton_wallet_address?: string | null
          user_id?: string
          user_telegram_id?: number
          verified_channel_membership?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          campaign_image_url: string
          campaign_name: string
          channel_id: number | null
          channel_username: string
          created_at: string
          creator_id: string
          creator_telegram_id: number
          distribution_completed: boolean | null
          ends_at: string | null
          id: string
          liquidity_amount: number
          payment_type: string
          starts_at: string | null
          status: string
          total_participants: number | null
          total_referrals: number | null
        }
        Insert: {
          approved_at?: string | null
          campaign_image_url: string
          campaign_name: string
          channel_id?: number | null
          channel_username: string
          created_at?: string
          creator_id: string
          creator_telegram_id: number
          distribution_completed?: boolean | null
          ends_at?: string | null
          id?: string
          liquidity_amount: number
          payment_type: string
          starts_at?: string | null
          status?: string
          total_participants?: number | null
          total_referrals?: number | null
        }
        Update: {
          approved_at?: string | null
          campaign_image_url?: string
          campaign_name?: string
          channel_id?: number | null
          channel_username?: string
          created_at?: string
          creator_id?: string
          creator_telegram_id?: number
          distribution_completed?: boolean | null
          ends_at?: string | null
          id?: string
          liquidity_amount?: number
          payment_type?: string
          starts_at?: string | null
          status?: string
          total_participants?: number | null
          total_referrals?: number | null
        }
        Relationships: []
      }
      coin_claim_requests: {
        Row: {
          amount: number
          burned_amount: number
          claim_type: string
          created_at: string
          id: string
          notes: string | null
          status: string
          telegram_id: number
          telegram_user_id: string
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          amount: number
          burned_amount?: number
          claim_type: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          burned_amount?: number
          claim_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      coins_restore_24_july_23utc_backup: {
        Row: {
          coins_after_restore_24_23utc: number | null
          coins_before_restore_24_23utc: number | null
          first_name: string | null
          id: string | null
          restore_reason: string | null
          restore_timestamp: string | null
          telegram_id: number | null
          ton_balance_unchanged: number | null
          username: string | null
        }
        Insert: {
          coins_after_restore_24_23utc?: number | null
          coins_before_restore_24_23utc?: number | null
          first_name?: string | null
          id?: string | null
          restore_reason?: string | null
          restore_timestamp?: string | null
          telegram_id?: number | null
          ton_balance_unchanged?: number | null
          username?: string | null
        }
        Update: {
          coins_after_restore_24_23utc?: number | null
          coins_before_restore_24_23utc?: number | null
          first_name?: string | null
          id?: string | null
          restore_reason?: string | null
          restore_timestamp?: string | null
          telegram_id?: number | null
          ton_balance_unchanged?: number | null
          username?: string | null
        }
        Relationships: []
      }
      commission_earnings: {
        Row: {
          amount: number
          commission_type: string
          created_at: string
          earner_type: string
          id: string
          manager_telegram_id: number | null
          partner_id: string | null
          source_user_telegram_id: number
        }
        Insert: {
          amount: number
          commission_type: string
          created_at?: string
          earner_type: string
          id?: string
          manager_telegram_id?: number | null
          partner_id?: string | null
          source_user_telegram_id: number
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string
          earner_type?: string
          id?: string
          manager_telegram_id?: number | null
          partner_id?: string | null
          source_user_telegram_id?: number
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          commission_rate: number
          commission_type: string
          created_at: string | null
          currency_type: string
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number
          commission_type: string
          created_at?: string | null
          currency_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number
          commission_type?: string
          created_at?: string | null
          currency_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      completed_tasks: {
        Row: {
          attempt_number: number | null
          campaign_link: string | null
          completed_at: string
          created_at: string
          id: string
          is_latest_attempt: boolean | null
          reward_amount: number
          task_id: string
          task_title: string
          task_type: string
          telegram_user_id: string
          uid: string | null
        }
        Insert: {
          attempt_number?: number | null
          campaign_link?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          is_latest_attempt?: boolean | null
          reward_amount?: number
          task_id: string
          task_title: string
          task_type: string
          telegram_user_id: string
          uid?: string | null
        }
        Update: {
          attempt_number?: number | null
          campaign_link?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          is_latest_attempt?: boolean | null
          reward_amount?: number
          task_id?: string
          task_title?: string
          task_type?: string
          telegram_user_id?: string
          uid?: string | null
        }
        Relationships: []
      }
      current_state_backup_emergency: {
        Row: {
          backup_reason: string | null
          backup_timestamp: string | null
          coins_before_restore: number | null
          first_name: string | null
          id: string | null
          telegram_id: number | null
          ton_balance_before_restore: number | null
          username: string | null
        }
        Insert: {
          backup_reason?: string | null
          backup_timestamp?: string | null
          coins_before_restore?: number | null
          first_name?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_before_restore?: number | null
          username?: string | null
        }
        Update: {
          backup_reason?: string | null
          backup_timestamp?: string | null
          coins_before_restore?: number | null
          first_name?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_before_restore?: number | null
          username?: string | null
        }
        Relationships: []
      }
      custom_task_completions: {
        Row: {
          completed_at: string
          id: string
          task_id: string
          user_id: string
          user_telegram_id: number
          verified: boolean | null
        }
        Insert: {
          completed_at?: string
          id?: string
          task_id: string
          user_id: string
          user_telegram_id: number
          verified?: boolean | null
        }
        Update: {
          completed_at?: string
          id?: string
          task_id?: string
          user_id?: string
          user_telegram_id?: number
          verified?: boolean | null
        }
        Relationships: []
      }
      daily_ad_rewards: {
        Row: {
          ads_watched: number | null
          created_at: string
          date: string
          id: string
          total_pepe_earned: number | null
          updated_at: string
          user_id: string
          user_telegram_id: number
        }
        Insert: {
          ads_watched?: number | null
          created_at?: string
          date?: string
          id?: string
          total_pepe_earned?: number | null
          updated_at?: string
          user_id: string
          user_telegram_id: number
        }
        Update: {
          ads_watched?: number | null
          created_at?: string
          date?: string
          id?: string
          total_pepe_earned?: number | null
          updated_at?: string
          user_id?: string
          user_telegram_id?: number
        }
        Relationships: []
      }
      daily_ad_views: {
        Row: {
          created_at: string
          id: string
          telegram_id: number
          telegram_user_id: string
          updated_at: string
          view_date: string
          views_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
          view_date?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
          view_date?: string
          views_count?: number
        }
        Relationships: []
      }
      daily_logins: {
        Row: {
          created_at: string
          id: string
          login_date: string
          reward_amount: number
          telegram_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_date?: string
          reward_amount?: number
          telegram_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_date?: string
          reward_amount?: number
          telegram_user_id?: string
        }
        Relationships: []
      }
      daily_puzzles: {
        Row: {
          correct_answer: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          option_1: string
          option_2: string
          option_3: string
          puzzle_date: string | null
          question: string
          updated_at: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          option_1: string
          option_2: string
          option_3: string
          puzzle_date?: string | null
          question: string
          updated_at?: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          option_1?: string
          option_2?: string
          option_3?: string
          puzzle_date?: string | null
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_puzzles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stars_participants: {
        Row: {
          ad_duration_seconds: number
          ad_viewed_at: string
          created_at: string
          id: string
          participation_date: string
          status: string
          telegram_id: number
          telegram_user_id: string
          updated_at: string
        }
        Insert: {
          ad_duration_seconds?: number
          ad_viewed_at?: string
          created_at?: string
          id?: string
          participation_date?: string
          status?: string
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
        }
        Update: {
          ad_duration_seconds?: number
          ad_viewed_at?: string
          created_at?: string
          id?: string
          participation_date?: string
          status?: string
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_stars_winners: {
        Row: {
          announced_at: string | null
          created_at: string
          draw_date: string
          first_name: string | null
          id: string
          message_sent: boolean | null
          stars_won: number
          telegram_id: number
          telegram_user_id: string
          username: string | null
        }
        Insert: {
          announced_at?: string | null
          created_at?: string
          draw_date?: string
          first_name?: string | null
          id?: string
          message_sent?: boolean | null
          stars_won?: number
          telegram_id: number
          telegram_user_id: string
          username?: string | null
        }
        Update: {
          announced_at?: string | null
          created_at?: string
          draw_date?: string
          first_name?: string | null
          id?: string
          message_sent?: boolean | null
          stars_won?: number
          telegram_id?: number
          telegram_user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      daily_wheel_spins: {
        Row: {
          created_at: string
          id: string
          prize_amount: number
          prize_type: string
          spin_date: string
          telegram_id: number
          telegram_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prize_amount?: number
          prize_type: string
          spin_date?: string
          telegram_id: number
          telegram_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prize_amount?: number
          prize_type?: string
          spin_date?: string
          telegram_id?: number
          telegram_user_id?: string
        }
        Relationships: []
      }
      default_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          requirements: Json | null
          reward_amount: number
          task_id: string
          task_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          requirements?: Json | null
          reward_amount?: number
          task_id: string
          task_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          requirements?: Json | null
          reward_amount?: number
          task_id?: string
          task_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deployed_tokens: {
        Row: {
          contract_address: string | null
          created_at: string
          creator_telegram_id: number
          creator_user_id: string | null
          deployed_at: string | null
          deployment_hash: string | null
          error_message: string | null
          id: string
          status: string
          token_description: string | null
          token_name: string
          token_supply: number
          token_symbol: string
        }
        Insert: {
          contract_address?: string | null
          created_at?: string
          creator_telegram_id: number
          creator_user_id?: string | null
          deployed_at?: string | null
          deployment_hash?: string | null
          error_message?: string | null
          id?: string
          status?: string
          token_description?: string | null
          token_name: string
          token_supply: number
          token_symbol: string
        }
        Update: {
          contract_address?: string | null
          created_at?: string
          creator_telegram_id?: number
          creator_user_id?: string | null
          deployed_at?: string | null
          deployment_hash?: string | null
          error_message?: string | null
          id?: string
          status?: string
          token_description?: string | null
          token_name?: string
          token_supply?: number
          token_symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployed_tokens_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dex_liquidity_operations: {
        Row: {
          created_at: string | null
          id: string
          lp_tokens: number
          operation_type: string
          pool_id: string
          status: string | null
          token0_amount: number
          token1_amount: number
          transaction_hash: string | null
          user_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lp_tokens: number
          operation_type: string
          pool_id: string
          status?: string | null
          token0_amount: number
          token1_amount: number
          transaction_hash?: string | null
          user_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lp_tokens?: number
          operation_type?: string
          pool_id?: string
          status?: string | null
          token0_amount?: number
          token1_amount?: number
          transaction_hash?: string | null
          user_address?: string
        }
        Relationships: []
      }
      dex_swaps: {
        Row: {
          amount_in: number
          amount_out: number
          created_at: string | null
          id: string
          pool_id: string
          price_impact: number | null
          status: string | null
          token_in: string
          token_out: string
          transaction_hash: string | null
          user_address: string
        }
        Insert: {
          amount_in: number
          amount_out: number
          created_at?: string | null
          id?: string
          pool_id: string
          price_impact?: number | null
          status?: string | null
          token_in: string
          token_out: string
          transaction_hash?: string | null
          user_address: string
        }
        Update: {
          amount_in?: number
          amount_out?: number
          created_at?: string | null
          id?: string
          pool_id?: string
          price_impact?: number | null
          status?: string | null
          token_in?: string
          token_out?: string
          transaction_hash?: string | null
          user_address?: string
        }
        Relationships: []
      }
      final_coins_fix_backup: {
        Row: {
          coins_after_fix: number | null
          coins_before_fix: number | null
          first_name: string | null
          fix_reason: string | null
          fix_timestamp: string | null
          id: string | null
          telegram_id: number | null
          ton_balance_unchanged: number | null
          username: string | null
        }
        Insert: {
          coins_after_fix?: number | null
          coins_before_fix?: number | null
          first_name?: string | null
          fix_reason?: string | null
          fix_timestamp?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_unchanged?: number | null
          username?: string | null
        }
        Update: {
          coins_after_fix?: number | null
          coins_before_fix?: number | null
          first_name?: string | null
          fix_reason?: string | null
          fix_timestamp?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_unchanged?: number | null
          username?: string | null
        }
        Relationships: []
      }
      final_restoration_current_backup: {
        Row: {
          backup_reason: string | null
          backup_timestamp: string | null
          coins_before_final_restore: number | null
          created_at: string | null
          first_name: string | null
          id: string | null
          telegram_id: number | null
          ton_balance_before_final_restore: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          backup_reason?: string | null
          backup_timestamp?: string | null
          coins_before_final_restore?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_before_final_restore?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          backup_reason?: string | null
          backup_timestamp?: string | null
          coins_before_final_restore?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          telegram_id?: number | null
          ton_balance_before_final_restore?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      frozen_balances: {
        Row: {
          amount: number
          balance_type: string
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_type: string
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_type?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      gcoin_mining: {
        Row: {
          created_at: string
          id: string
          last_mining_date: string
          telegram_user_id: string
          total_gcoin_mined: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_mining_date?: string
          telegram_user_id: string
          total_gcoin_mined?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_mining_date?: string
          telegram_user_id?: string
          total_gcoin_mined?: number
          updated_at?: string
        }
        Relationships: []
      }
      global_market_value: {
        Row: {
          created_at: string
          id: string
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      jettons: {
        Row: {
          created_at: string | null
          decimals: number
          description: string | null
          id: string
          image_url: string | null
          minter_address: string
          name: string
          symbol: string
          total_supply: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          decimals?: number
          description?: string | null
          id?: string
          image_url?: string | null
          minter_address: string
          name: string
          symbol: string
          total_supply?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          decimals?: number
          description?: string | null
          id?: string
          image_url?: string | null
          minter_address?: string
          name?: string
          symbol?: string
          total_supply?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      lucky_draw_participants: {
        Row: {
          draw_id: string
          id: string
          joined_at: string | null
          participant_id: string
          telegram_user_id: number
        }
        Insert: {
          draw_id: string
          id?: string
          joined_at?: string | null
          participant_id: string
          telegram_user_id: number
        }
        Update: {
          draw_id?: string
          id?: string
          joined_at?: string | null
          participant_id?: string
          telegram_user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lucky_draw_participants_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "lucky_draws"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_draw_winners: {
        Row: {
          draw_id: string
          id: string
          prize_position: number
          selected_at: string | null
          telegram_user_id: number
          winner_id: string
        }
        Insert: {
          draw_id: string
          id?: string
          prize_position: number
          selected_at?: string | null
          telegram_user_id: number
          winner_id: string
        }
        Update: {
          draw_id?: string
          id?: string
          prize_position?: number
          selected_at?: string | null
          telegram_user_id?: number
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_draw_winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "lucky_draws"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_draws: {
        Row: {
          channel_id: number | null
          channel_username: string
          completed_at: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          ends_at: string | null
          entry_fee: number | null
          id: string
          image_url: string | null
          mandatory_channel_id: number | null
          mandatory_channel_username: string | null
          max_participants: number | null
          prize_description: string | null
          require_channel_subscription: boolean | null
          starts_at: string | null
          status: string | null
          title: string
          total_participants: number | null
          updated_at: string | null
          winner_count: number | null
        }
        Insert: {
          channel_id?: number | null
          channel_username: string
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          id?: string
          image_url?: string | null
          mandatory_channel_id?: number | null
          mandatory_channel_username?: string | null
          max_participants?: number | null
          prize_description?: string | null
          require_channel_subscription?: boolean | null
          starts_at?: string | null
          status?: string | null
          title: string
          total_participants?: number | null
          updated_at?: string | null
          winner_count?: number | null
        }
        Update: {
          channel_id?: number | null
          channel_username?: string
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          id?: string
          image_url?: string | null
          mandatory_channel_id?: number | null
          mandatory_channel_username?: string | null
          max_participants?: number | null
          prize_description?: string | null
          require_channel_subscription?: boolean | null
          starts_at?: string | null
          status?: string | null
          title?: string
          total_participants?: number | null
          updated_at?: string | null
          winner_count?: number | null
        }
        Relationships: []
      }
      main_tasks: {
        Row: {
          created_at: string | null
          created_by_email: string | null
          created_by_telegram_id: number | null
          id: string
          task_link: string
          task_name: string
        }
        Insert: {
          created_at?: string | null
          created_by_email?: string | null
          created_by_telegram_id?: number | null
          id?: string
          task_link: string
          task_name: string
        }
        Update: {
          created_at?: string | null
          created_by_email?: string | null
          created_by_telegram_id?: number | null
          id?: string
          task_link?: string
          task_name?: string
        }
        Relationships: []
      }
      manager_commissions: {
        Row: {
          alpha_commission_rate: number
          created_at: string
          gcoin_v4_commission_rate: number
          id: string
          manager_telegram_id: number
          manager_username: string
          partner_id: string | null
          pepe_commission_rate: number
          updated_at: string
        }
        Insert: {
          alpha_commission_rate?: number
          created_at?: string
          gcoin_v4_commission_rate?: number
          id?: string
          manager_telegram_id: number
          manager_username: string
          partner_id?: string | null
          pepe_commission_rate?: number
          updated_at?: string
        }
        Update: {
          alpha_commission_rate?: number
          created_at?: string
          gcoin_v4_commission_rate?: number
          id?: string
          manager_telegram_id?: number
          manager_username?: string
          partner_id?: string | null
          pepe_commission_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      manager_referral_commission_rates: {
        Row: {
          alpha_commission_rate: number
          created_at: string | null
          gcoin_v4_commission_rate: number
          id: string
          is_active: boolean | null
          manager_telegram_username: string
          pepe_commission_rate: number
          updated_at: string | null
        }
        Insert: {
          alpha_commission_rate?: number
          created_at?: string | null
          gcoin_v4_commission_rate?: number
          id?: string
          is_active?: boolean | null
          manager_telegram_username: string
          pepe_commission_rate?: number
          updated_at?: string | null
        }
        Update: {
          alpha_commission_rate?: number
          created_at?: string | null
          gcoin_v4_commission_rate?: number
          id?: string
          is_active?: boolean | null
          manager_telegram_username?: string
          pepe_commission_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      managers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          telegram_user_id: string | null
          telegram_username: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          telegram_user_id?: string | null
          telegram_username: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          telegram_user_id?: string | null
          telegram_username?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managers_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_qualified_users: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          is_active: boolean
          qualification_reason: string | null
          qualified_by_admin_id: string | null
          telegram_id: number
          telegram_user_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          qualification_reason?: string | null
          qualified_by_admin_id?: string | null
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          qualification_reason?: string | null
          qualified_by_admin_id?: string | null
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      offerwall_rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          original_hash: string | null
          project_id: string | null
          reward_id: string
          status: string
          updated_at: string
          user_id: string
          user_telegram_id: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          original_hash?: string | null
          project_id?: string | null
          reward_id: string
          status?: string
          updated_at?: string
          user_id: string
          user_telegram_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          original_hash?: string | null
          project_id?: string | null
          reward_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_telegram_id?: number
        }
        Relationships: []
      }
      p2p_buyers_restoration_backup: {
        Row: {
          buyer_name: string | null
          buyer_telegram_id: number | null
          coins_after_restoration: number | null
          coins_before_restoration: number | null
          restoration_date: string | null
          total_coins_bought_p2p: number | null
          total_purchases: number | null
        }
        Insert: {
          buyer_name?: string | null
          buyer_telegram_id?: number | null
          coins_after_restoration?: number | null
          coins_before_restoration?: number | null
          restoration_date?: string | null
          total_coins_bought_p2p?: number | null
          total_purchases?: number | null
        }
        Update: {
          buyer_name?: string | null
          buyer_telegram_id?: number | null
          coins_after_restoration?: number | null
          coins_before_restoration?: number | null
          restoration_date?: string | null
          total_coins_bought_p2p?: number | null
          total_purchases?: number | null
        }
        Relationships: []
      }
      partner_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          current_participants: number | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          partner_logo_url: string | null
          partner_name: string | null
          requirements: Json | null
          reward_amount: number
          start_date: string | null
          task_type: string
          task_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          partner_logo_url?: string | null
          partner_name?: string | null
          requirements?: Json | null
          reward_amount?: number
          start_date?: string | null
          task_type?: string
          task_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          partner_logo_url?: string | null
          partner_name?: string | null
          requirements?: Json | null
          reward_amount?: number
          start_date?: string | null
          task_type?: string
          task_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          alpha_commission_rate: number | null
          created_at: string | null
          gcoin_v4_commission_rate: number | null
          id: string
          invitation_id: string | null
          is_active: boolean | null
          manager_alpha_commission_rate: number | null
          manager_gcoin_v4_commission_rate: number | null
          manager_pepe_commission_rate: number | null
          manager_telegram_username: string
          manager_user_id: string | null
          partner_telegram_username: string | null
          pepe_commission_rate: number | null
          status: string | null
          telegram_id: number
          telegram_user_id: string
          updated_at: string | null
        }
        Insert: {
          alpha_commission_rate?: number | null
          created_at?: string | null
          gcoin_v4_commission_rate?: number | null
          id?: string
          invitation_id?: string | null
          is_active?: boolean | null
          manager_alpha_commission_rate?: number | null
          manager_gcoin_v4_commission_rate?: number | null
          manager_pepe_commission_rate?: number | null
          manager_telegram_username: string
          manager_user_id?: string | null
          partner_telegram_username?: string | null
          pepe_commission_rate?: number | null
          status?: string | null
          telegram_id: number
          telegram_user_id: string
          updated_at?: string | null
        }
        Update: {
          alpha_commission_rate?: number | null
          created_at?: string | null
          gcoin_v4_commission_rate?: number | null
          id?: string
          invitation_id?: string | null
          is_active?: boolean | null
          manager_alpha_commission_rate?: number | null
          manager_gcoin_v4_commission_rate?: number | null
          manager_pepe_commission_rate?: number | null
          manager_telegram_username?: string
          manager_user_id?: string | null
          partner_telegram_username?: string | null
          pepe_commission_rate?: number | null
          status?: string | null
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "partnership_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: true
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_invitations: {
        Row: {
          created_at: string | null
          id: string
          invited_telegram_id: number | null
          invited_telegram_username: string
          invited_user_id: string | null
          manager_telegram_username: string
          manager_user_id: string | null
          responded_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_telegram_id?: number | null
          invited_telegram_username: string
          invited_user_id?: string | null
          manager_telegram_username: string
          manager_user_id?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_telegram_id?: number | null
          invited_telegram_username?: string
          invited_user_id?: string | null
          manager_telegram_username?: string
          manager_user_id?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_invitations_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_requests: {
        Row: {
          channel_link: string
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          telegram_id: number
          telegram_user_id: string
          updated_at: string
          username: string
        }
        Insert: {
          channel_link: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
          username: string
        }
        Update: {
          channel_link?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_requests_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_commissions: {
        Row: {
          amount: number
          claimed_at: string | null
          commission_type: string
          created_at: string
          id: string
          referral_id: string
          referred_telegram_id: number
          referred_user_id: string
          referrer_telegram_id: number
          referrer_user_id: string
          source_description: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          commission_type: string
          created_at?: string
          id?: string
          referral_id: string
          referred_telegram_id: number
          referred_user_id: string
          referrer_telegram_id: number
          referrer_user_id: string
          source_description?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          commission_type?: string
          created_at?: string
          id?: string
          referral_id?: string
          referred_telegram_id?: number
          referred_user_id?: string
          referrer_telegram_id?: number
          referrer_user_id?: string
          source_description?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_commissions_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_commissions_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_tasks: {
        Row: {
          campaign_link: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          task_id: string
          task_title: string
          telegram_user_id: string
          uid: string
          updated_at: string
        }
        Insert: {
          campaign_link?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id: string
          task_title: string
          telegram_user_id: string
          uid: string
          updated_at?: string
        }
        Update: {
          campaign_link?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id?: string
          task_title?: string
          telegram_user_id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_ton_deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          last_verification_attempt: string | null
          status: string
          telegram_user_id: string
          transaction_hash: string
          verification_attempts: number | null
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          last_verification_attempt?: string | null
          status?: string
          telegram_user_id: string
          transaction_hash: string
          verification_attempts?: number | null
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          last_verification_attempt?: string | null
          status?: string
          telegram_user_id?: string
          transaction_hash?: string
          verification_attempts?: number | null
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      pending_ton_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          telegram_user_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          telegram_user_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          telegram_user_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      pepe_withdrawal_requests: {
        Row: {
          binance_id: string
          completed_at: string | null
          created_at: string
          id: string
          pepe_amount: number
          reviewer_notes: string | null
          status: string
          telegram_id: number
          telegram_user_id: string
          updated_at: string
        }
        Insert: {
          binance_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          pepe_amount: number
          reviewer_notes?: string | null
          status?: string
          telegram_id: number
          telegram_user_id: string
          updated_at?: string
        }
        Update: {
          binance_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          pepe_amount?: number
          reviewer_notes?: string | null
          status?: string
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      premium_purchases: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          payment_amount: number
          payment_type: string
          status: string
          telegram_user_id: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_amount: number
          payment_type?: string
          status?: string
          telegram_user_id: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_amount?: number
          payment_type?: string
          status?: string
          telegram_user_id?: number
        }
        Relationships: []
      }
      puzzle_answers: {
        Row: {
          answer_date: string
          answered_at: string
          coins_spent: number
          id: string
          is_correct: boolean
          puzzle_id: string
          reward_earned: number
          telegram_user_id: string
          user_answer: number
        }
        Insert: {
          answer_date?: string
          answered_at?: string
          coins_spent?: number
          id?: string
          is_correct: boolean
          puzzle_id: string
          reward_earned?: number
          telegram_user_id: string
          user_answer: number
        }
        Update: {
          answer_date?: string
          answered_at?: string
          coins_spent?: number
          id?: string
          is_correct?: boolean
          puzzle_id?: string
          reward_earned?: number
          telegram_user_id?: string
          user_answer?: number
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_answers_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "daily_puzzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puzzle_answers_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commission_settings: {
        Row: {
          created_at: string | null
          description: string | null
          gcoin_v4_commission: number | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gcoin_v4_commission?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gcoin_v4_commission?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          alpha_commission_paid: number | null
          channel_joined_at: string | null
          claimed_at: string | null
          created_at: string
          gcoin_v4_commission_paid: number | null
          id: string
          pepe_commission_paid: number | null
          qualified_at: string | null
          referred_telegram_id: number
          referred_user_id: string
          referrer_telegram_id: number
          referrer_user_id: string
          reward_claimed: boolean | null
          reward_gcoin: number | null
          status: string
        }
        Insert: {
          alpha_commission_paid?: number | null
          channel_joined_at?: string | null
          claimed_at?: string | null
          created_at?: string
          gcoin_v4_commission_paid?: number | null
          id?: string
          pepe_commission_paid?: number | null
          qualified_at?: string | null
          referred_telegram_id: number
          referred_user_id: string
          referrer_telegram_id: number
          referrer_user_id: string
          reward_claimed?: boolean | null
          reward_gcoin?: number | null
          status?: string
        }
        Update: {
          alpha_commission_paid?: number | null
          channel_joined_at?: string | null
          claimed_at?: string | null
          created_at?: string
          gcoin_v4_commission_paid?: number | null
          id?: string
          pepe_commission_paid?: number | null
          qualified_at?: string | null
          referred_telegram_id?: number
          referred_user_id?: string
          referrer_telegram_id?: number
          referrer_user_id?: string
          reward_claimed?: boolean | null
          reward_gcoin?: number | null
          status?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          access_source: string
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_address: unknown
          is_blocked: boolean | null
          security_flags: string[] | null
          session_token: string | null
          telegram_id: number | null
          telegram_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_source: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: unknown
          is_blocked?: boolean | null
          security_flags?: string[] | null
          session_token?: string | null
          telegram_id?: number | null
          telegram_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_source?: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: unknown
          is_blocked?: boolean | null
          security_flags?: string[] | null
          session_token?: string | null
          telegram_id?: number | null
          telegram_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      star_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payload: Json | null
          status: string | null
          telegram_charge_id: string
          telegram_user_id: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payload?: Json | null
          status?: string | null
          telegram_charge_id: string
          telegram_user_id: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payload?: Json | null
          status?: string | null
          telegram_charge_id?: string
          telegram_user_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      swap_transactions: {
        Row: {
          created_at: string
          exchange_rate: number
          from_amount: number
          from_currency: string
          id: string
          status: string
          to_amount: number
          to_currency: string
          transaction_hash: string | null
          user_id: string
          user_telegram_id: number
        }
        Insert: {
          created_at?: string
          exchange_rate: number
          from_amount: number
          from_currency: string
          id?: string
          status?: string
          to_amount: number
          to_currency: string
          transaction_hash?: string | null
          user_id: string
          user_telegram_id: number
        }
        Update: {
          created_at?: string
          exchange_rate?: number
          from_amount?: number
          from_currency?: string
          id?: string
          status?: string
          to_amount?: number
          to_currency?: string
          transaction_hash?: string | null
          user_id?: string
          user_telegram_id?: number
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          addr_t9w2x: string | null
          bal_a6c3z: number | null
          bal_g4v7y: number | null
          bal_j3n8q: number | null
          bal_w5r2t: number | null
          bal_x7k9m: number | null
          coins: number | null
          coins_per_tap: number | null
          created_at: string | null
          energy: number | null
          energy_limit: number | null
          energy_recharge_rate: number | null
          first_name: string | null
          gcoin_referral_commission_rate: number
          id: string
          is_blocked: boolean | null
          is_bot: boolean | null
          is_premium: boolean | null
          is_verified: boolean | null
          language_code: string | null
          last_active: string | null
          last_name: string | null
          last_verification_at: string | null
          pending_referrer_id: number | null
          referral_tier: string | null
          referrer_telegram_id: number | null
          stars_balance: number
          status: string | null
          suspicious_activity_count: number | null
          telegram_id: number
          ton_balance: number | null
          total_referral_earnings: number | null
          total_referrals_count: number | null
          updated_at: string | null
          username: string | null
          verification_required: boolean | null
          verification_source: string | null
        }
        Insert: {
          addr_t9w2x?: string | null
          bal_a6c3z?: number | null
          bal_g4v7y?: number | null
          bal_j3n8q?: number | null
          bal_w5r2t?: number | null
          bal_x7k9m?: number | null
          coins?: number | null
          coins_per_tap?: number | null
          created_at?: string | null
          energy?: number | null
          energy_limit?: number | null
          energy_recharge_rate?: number | null
          first_name?: string | null
          gcoin_referral_commission_rate?: number
          id?: string
          is_blocked?: boolean | null
          is_bot?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          language_code?: string | null
          last_active?: string | null
          last_name?: string | null
          last_verification_at?: string | null
          pending_referrer_id?: number | null
          referral_tier?: string | null
          referrer_telegram_id?: number | null
          stars_balance?: number
          status?: string | null
          suspicious_activity_count?: number | null
          telegram_id: number
          ton_balance?: number | null
          total_referral_earnings?: number | null
          total_referrals_count?: number | null
          updated_at?: string | null
          username?: string | null
          verification_required?: boolean | null
          verification_source?: string | null
        }
        Update: {
          addr_t9w2x?: string | null
          bal_a6c3z?: number | null
          bal_g4v7y?: number | null
          bal_j3n8q?: number | null
          bal_w5r2t?: number | null
          bal_x7k9m?: number | null
          coins?: number | null
          coins_per_tap?: number | null
          created_at?: string | null
          energy?: number | null
          energy_limit?: number | null
          energy_recharge_rate?: number | null
          first_name?: string | null
          gcoin_referral_commission_rate?: number
          id?: string
          is_blocked?: boolean | null
          is_bot?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          language_code?: string | null
          last_active?: string | null
          last_name?: string | null
          last_verification_at?: string | null
          pending_referrer_id?: number | null
          referral_tier?: string | null
          referrer_telegram_id?: number | null
          stars_balance?: number
          status?: string | null
          suspicious_activity_count?: number | null
          telegram_id?: number
          ton_balance?: number | null
          total_referral_earnings?: number | null
          total_referrals_count?: number | null
          updated_at?: string | null
          username?: string | null
          verification_required?: boolean | null
          verification_source?: string | null
        }
        Relationships: []
      }
      user_referral_commissions: {
        Row: {
          created_at: string | null
          description: string | null
          gcoin_v4_commission: number
          id: string
          is_active: boolean | null
          telegram_id: number
          telegram_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gcoin_v4_commission?: number
          id?: string
          is_active?: boolean | null
          telegram_id: number
          telegram_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gcoin_v4_commission?: number
          id?: string
          is_active?: boolean | null
          telegram_id?: number
          telegram_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_referral_commissions_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          telegram_id: number
          telegram_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          telegram_id: number
          telegram_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          telegram_id?: number
          telegram_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_participants: {
        Row: {
          completed_at: string
          id: string
          participant_id: string
          participant_telegram_id: number
          reward_claimed: boolean
          submission_data: Json | null
          task_id: string
          verification_status: string
        }
        Insert: {
          completed_at?: string
          id?: string
          participant_id: string
          participant_telegram_id: number
          reward_claimed?: boolean
          submission_data?: Json | null
          task_id: string
          verification_status?: string
        }
        Update: {
          completed_at?: string
          id?: string
          participant_id?: string
          participant_telegram_id?: number
          reward_claimed?: boolean
          submission_data?: Json | null
          task_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          reward_claimed: boolean | null
          task_data: Json | null
          task_type: string
          telegram_user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reward_claimed?: boolean | null
          task_data?: Json | null
          task_type: string
          telegram_user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reward_claimed?: boolean | null
          task_data?: Json | null
          task_type?: string
          telegram_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_telegram_user_id_fkey"
            columns: ["telegram_user_id"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      safe_user_profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: number | null
          telegram_id: number | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: number | null
          telegram_id?: number | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: number | null
          telegram_id?: number | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_alpha_coins_to_user: {
        Args: { p_amount: number; p_telegram_user_id: string }
        Returns: Json
      }
      add_balance: {
        Args: { amount: number; user_id: string }
        Returns: boolean
      }
      add_gcoin_referral_commission: {
        Args: {
          earned_amount: number
          referred_user_telegram_id: number
          referrer_telegram_id: number
        }
        Returns: Json
      }
      add_manual_qualified_user: {
        Args: { reason?: string; user_telegram_id: number }
        Returns: Json
      }
      add_pending_commission: {
        Args: {
          p_amount: number
          p_commission_type: string
          p_referral_id: string
          p_referred_telegram_id: number
          p_referred_user_id: string
          p_referrer_telegram_id: number
          p_referrer_user_id: string
          p_source_description?: string
        }
        Returns: Json
      }
      add_withdrawable_pepe: {
        Args: {
          pepe_amount: number
          source_description?: string
          user_telegram_id: number
        }
        Returns: Json
      }
      analyze_user_balance_sources: {
        Args: { user_id_param: string }
        Returns: {
          first_transaction: string
          last_transaction: string
          source_description: string
          source_type: string
          total_amount: number
          transaction_count: number
        }[]
      }
      auto_distribute_expired_campaigns: { Args: never; Returns: Json }
      calculate_referral_commission: {
        Args: {
          p_amount: number
          p_currency_type: string
          p_referrer_username: string
        }
        Returns: number
      }
      can_complete_task: {
        Args: { task_id_param: string; user_telegram_id: number }
        Returns: boolean
      }
      cancel_order: {
        Args: { order_id_param: string; user_telegram_id: number }
        Returns: Json
      }
      check_user_puzzle_answer: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      check_user_verification_status: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      claim_all_commissions: {
        Args: { p_user_telegram_id: number }
        Returns: Json
      }
      claim_referral_rewards: {
        Args: { p_referrer_telegram_id: number }
        Returns: {
          claimed_count: number
          message: string
          success: boolean
          total_gcoin: number
        }[]
      }
      cleanup_old_verification_records: { Args: never; Returns: undefined }
      create_buy_order: {
        Args: {
          buyer_telegram_id: number
          coin_amount_param: number
          ton_amount_param: number
        }
        Returns: Json
      }
      create_coin_claim_request: {
        Args: {
          p_telegram_id: number
          p_user_id: string
          p_wallet_address: string
        }
        Returns: Json
      }
      create_partner_task: {
        Args: {
          creator_telegram_id: number
          end_date?: string
          max_participants?: number
          partner_logo_url?: string
          partner_name?: string
          reward_amount?: number
          task_description?: string
          task_title: string
          task_url?: string
        }
        Returns: Json
      }
      create_partnership_invitation: {
        Args: { p_invited_username: string; p_manager_username: string }
        Returns: Json
      }
      create_secure_session: {
        Args: {
          device_fingerprint_param: string
          ip_address_param?: unknown
          telegram_id_param: number
          user_agent_param?: string
          verification_source_param?: string
        }
        Returns: Json
      }
      create_sell_order: {
        Args: {
          coin_amount_param: number
          seller_telegram_id: number
          ton_amount_param: number
        }
        Returns: Json
      }
      deduct_referral_rewards: { Args: never; Returns: Json }
      distribute_campaign_rewards: {
        Args: { campaign_id_param: string }
        Returns: Json
      }
      execute_trade: {
        Args: {
          buyer_telegram_id: number
          order_id_param: string
          trade_amount: number
        }
        Returns: Json
      }
      get_active_partner_tasks: { Args: never; Returns: Json }
      get_all_qualified_users: {
        Args: never
        Returns: {
          first_name: string
          qualification_date: string
          qualification_reason: string
          qualification_type: string
          telegram_id: number
          username: string
        }[]
      }
      get_coins_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          first_name: string
          telegram_id: number
          total_balance: number
          username: string
        }[]
      }
      get_commission_rate: {
        Args: { p_commission_type: string }
        Returns: number
      }
      get_custom_referral_rate: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      get_daily_puzzle: { Args: never; Returns: Json }
      get_market_value: { Args: never; Returns: number }
      get_qualified_users_list: {
        Args: never
        Returns: {
          first_name: string
          id: string
          is_active: boolean
          qualification_date: string
          qualification_type: string
          telegram_id: number
          telegram_user_id: string
          username: string
        }[]
      }
      get_referral_commission: { Args: never; Returns: number }
      get_referral_leaderboard:
        | {
            Args: never
            Returns: {
              first_name: string
              referral_count: number
              telegram_id: number
              username: string
            }[]
          }
        | {
            Args: { limit_count?: number }
            Returns: {
              first_name: string
              referral_count: number
              telegram_id: number
              username: string
            }[]
          }
      get_request_header: { Args: { header_name: string }; Returns: string }
      get_unclaimed_referrals_count: {
        Args: { p_referrer_telegram_id: number }
        Returns: {
          total_referrals: number
          total_reward: number
          unclaimed_count: number
        }[]
      }
      get_unread_notifications: {
        Args: { user_telegram_id: number }
        Returns: Json
      }
      get_user_balance_history: {
        Args: {
          p_balance_type?: string
          p_limit?: number
          p_telegram_id: number
        }
        Returns: Json
      }
      get_user_balance_summary: {
        Args: { user_telegram_id_param: number }
        Returns: Json
      }
      get_user_financial_transactions: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      get_user_mining_record: {
        Args: { p_telegram_user_id: string }
        Returns: Json
      }
      get_user_referral_commission: {
        Args: { p_telegram_id: number }
        Returns: number
      }
      get_user_suspicious_activities: {
        Args: { p_limit?: number; p_telegram_id: number }
        Returns: Json
      }
      give_tier_bonus_rewards: { Args: never; Returns: Json }
      handle_ad_view_and_check_qualification: {
        Args: { user_telegram_id: number }
        Returns: Json
      }
      handle_daily_login: { Args: { user_telegram_id: string }; Returns: Json }
      has_active_session_for_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      increment_draw_participants: {
        Args: { draw_id_param: string }
        Returns: undefined
      }
      increment_market_value: { Args: { amount?: number }; Returns: number }
      increment_ton_balance: {
        Args: { amount: number; user_id: string }
        Returns: number
      }
      is_user_qualified: { Args: { p_user_id: string }; Returns: boolean }
      list_custom_commissions: {
        Args: never
        Returns: {
          commission: number
          created_at: string
          description: string
          first_name: string
          telegram_id: number
          username: string
        }[]
      }
      list_custom_referral_rates: {
        Args: never
        Returns: {
          alpha_rate: number
          created_at: string
          first_name: string
          gcoin_v4_rate: number
          notes: string
          pepe_rate: number
          telegram_id: number
          updated_at: string
          username: string
        }[]
      }
      mark_notifications_as_read: {
        Args: { notification_ids?: string[]; user_telegram_id: number }
        Returns: Json
      }
      mine_gcoin: { Args: { p_telegram_user_id: string }; Returns: Json }
      participate_in_daily_stars: {
        Args: { ad_duration_seconds: number; user_telegram_id: number }
        Returns: Json
      }
      process_referral: {
        Args: { referred_user_id: string; referrer_telegram_id_param: number }
        Returns: Json
      }
      process_referral_commission: {
        Args: {
          p_amount: number
          p_commission_type: string
          p_referred_telegram_id: number
        }
        Returns: Json
      }
      process_referral_on_channel_join: {
        Args: { p_referred_telegram_id: number; p_referrer_telegram_id: number }
        Returns: Json
      }
      process_verification_webhook:
        | {
            Args: {
              p_captcha_status: boolean
              p_telegram_id: number
              p_user_hash: string
              p_vpn_detected: boolean
            }
            Returns: Json
          }
        | {
            Args: {
              p_captcha_status: string
              p_telegram_id: number
              p_user_hash: string
              p_vpn_detected: string
            }
            Returns: Json
          }
      process_verified_deposit: {
        Args: { deposit_id: string }
        Returns: boolean
      }
      remove_custom_referral_rate: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      remove_manual_qualified_user: {
        Args: { user_telegram_id: number }
        Returns: Json
      }
      remove_user_referral_commission: {
        Args: { p_telegram_id: number }
        Returns: Json
      }
      reset_all_user_tasks: {
        Args: { user_telegram_id: number }
        Returns: Json
      }
      reset_user_task: {
        Args: { task_id_param: string; user_telegram_id: number }
        Returns: Json
      }
      respond_to_partnership_invitation: {
        Args: { p_accepted: boolean; p_invitation_id: string }
        Returns: Json
      }
      return_frozen_p2p_balances: { Args: never; Returns: Json }
      reward_active_referrers: { Args: never; Returns: Json }
      secure_add_balance: {
        Args: {
          p_additional_data?: Json
          p_amount: number
          p_balance_type: string
          p_edge_function?: string
          p_source: string
          p_telegram_user_id: string
        }
        Returns: Json
      }
      select_daily_stars_winner: { Args: never; Returns: Json }
      set_custom_referral_rate: {
        Args: {
          p_alpha_rate?: number
          p_gcoin_v4_rate?: number
          p_notes?: string
          p_pepe_rate?: number
          p_telegram_id: number
        }
        Returns: Json
      }
      set_user_referral_commission: {
        Args: { commission_rate: number; user_telegram_id: number }
        Returns: Json
      }
      spin_wheel: { Args: { user_telegram_id: number }; Returns: Json }
      submit_puzzle_answer: {
        Args: {
          p_puzzle_id: string
          p_telegram_id: number
          p_user_answer: number
        }
        Returns: Json
      }
      swap_pepe_to_ton: {
        Args: { pepe_amount: number; user_telegram_id: number }
        Returns: Json
      }
      swap_ton_to_pepe: {
        Args: { ton_amount: number; user_telegram_id: number }
        Returns: Json
      }
      sync_qualified_users: { Args: never; Returns: number }
      update_alpha_coins: {
        Args: { p_amount: number; p_telegram_user_id: string }
        Returns: Json
      }
      update_gcoin_v4_balance: {
        Args: { p_amount: number; p_telegram_user_id: string }
        Returns: Json
      }
      update_referral_commission: {
        Args: { p_new_commission: number }
        Returns: Json
      }
      update_referral_stats: { Args: never; Returns: undefined }
      update_timewall_qualification_progress: {
        Args: { coins_received: number; user_telegram_id: number }
        Returns: Json
      }
      update_user_stats: {
        Args: {
          p_coins_earned: number
          p_energy_used: number
          p_telegram_user_id: string
        }
        Returns: Json
      }
      validate_user_session: {
        Args: {
          ip_address_param?: unknown
          session_token_param: string
          telegram_id_param: number
          user_agent_param?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
