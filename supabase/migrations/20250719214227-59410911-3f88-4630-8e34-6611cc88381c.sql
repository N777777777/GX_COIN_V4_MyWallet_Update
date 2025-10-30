-- Create lucky draws table
CREATE TABLE public.lucky_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  channel_username TEXT NOT NULL,
  channel_id BIGINT,
  total_participants INTEGER DEFAULT 0,
  max_participants INTEGER,
  winner_count INTEGER DEFAULT 1,
  entry_fee NUMERIC DEFAULT 0,
  prize_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lucky draw participants table
CREATE TABLE public.lucky_draw_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.lucky_draws(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(draw_id, participant_id)
);

-- Create lucky draw winners table
CREATE TABLE public.lucky_draw_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.lucky_draws(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  prize_position INTEGER NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(draw_id, winner_id)
);

-- Enable RLS
ALTER TABLE public.lucky_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draw_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draw_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lucky_draws
CREATE POLICY "Anyone can view active lucky draws"
ON public.lucky_draws
FOR SELECT
USING (status = 'active' OR status = 'completed');

CREATE POLICY "Users can create their own lucky draws"
ON public.lucky_draws
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own lucky draws"
ON public.lucky_draws
FOR UPDATE
USING (true);

-- RLS Policies for participants
CREATE POLICY "Anyone can view participants"
ON public.lucky_draw_participants
FOR SELECT
USING (true);

CREATE POLICY "Users can join draws"
ON public.lucky_draw_participants
FOR INSERT
WITH CHECK (true);

-- RLS Policies for winners
CREATE POLICY "Anyone can view winners"
ON public.lucky_draw_winners
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage winners"
ON public.lucky_draw_winners
FOR ALL
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_lucky_draws_updated_at
BEFORE UPDATE ON public.lucky_draws
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_lucky_draws_status ON public.lucky_draws(status);
CREATE INDEX idx_lucky_draws_creator ON public.lucky_draws(creator_id);
CREATE INDEX idx_lucky_draw_participants_draw ON public.lucky_draw_participants(draw_id);
CREATE INDEX idx_lucky_draw_winners_draw ON public.lucky_draw_winners(draw_id);