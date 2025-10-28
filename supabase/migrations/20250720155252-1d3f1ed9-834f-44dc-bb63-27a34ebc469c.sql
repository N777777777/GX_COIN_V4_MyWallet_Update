-- حذف المهام الجديدة والاحتفاظ بالمهام القديمة فقط
DELETE FROM public.default_tasks 
WHERE task_id IN (
  'follow_twitter',
  'join_discord', 
  'youtube_subscribe',
  'instagram_follow',
  'binance_campaign',
  'bybit_task',
  'okx_challenge',
  'gate_io_task',
  'huobi_mission',
  'daily_check_in',
  'invite_friends',
  'tap_1000_times',
  'reach_level_10',
  'ton_wallet_connect',
  'complete_profile'
);