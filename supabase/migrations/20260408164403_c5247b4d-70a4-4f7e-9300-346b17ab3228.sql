
-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS external_link text,
ADD COLUMN IF NOT EXISTS total_tips_received numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS boost_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS boost_end timestamp with time zone;

-- Create index for featured profiles query (boost status + tips)
CREATE INDEX IF NOT EXISTS idx_profiles_featured 
ON public.profiles (boost_end DESC NULLS LAST, total_tips_received DESC);

-- Create index for ranking
CREATE INDEX IF NOT EXISTS idx_profiles_ranking
ON public.profiles (total_tips_received DESC);
