-- Enable realtime for global_market_value table
ALTER TABLE public.global_market_value REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_market_value;