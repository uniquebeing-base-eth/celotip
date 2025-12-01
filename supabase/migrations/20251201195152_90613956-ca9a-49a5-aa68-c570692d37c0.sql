-- Create user profiles table (using Farcaster FID as primary key)
CREATE TABLE public.profiles (
  fid BIGINT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  pfp_url TEXT,
  custody_address TEXT,
  connected_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tip configurations table
CREATE TABLE public.tip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL REFERENCES public.profiles(fid) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'recast', 'quote', 'follow')),
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fid, interaction_type)
);

-- Create super tip configurations table
CREATE TABLE public.super_tip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL REFERENCES public.profiles(fid) ON DELETE CASCADE UNIQUE,
  trigger_phrase TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  amount DECIMAL(20, 6) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_tip_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (public read, self write)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (true);

-- RLS Policies for tip_configs (users can only manage their own)
CREATE POLICY "Users can view their own tip configs"
ON public.tip_configs FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own tip configs"
ON public.tip_configs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own tip configs"
ON public.tip_configs FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own tip configs"
ON public.tip_configs FOR DELETE
USING (true);

-- RLS Policies for super_tip_configs (users can only manage their own)
CREATE POLICY "Users can view their own super tip config"
ON public.super_tip_configs FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own super tip config"
ON public.super_tip_configs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own super tip config"
ON public.super_tip_configs FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own super tip config"
ON public.super_tip_configs FOR DELETE
USING (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tip_configs_updated_at
BEFORE UPDATE ON public.tip_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_super_tip_configs_updated_at
BEFORE UPDATE ON public.super_tip_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();