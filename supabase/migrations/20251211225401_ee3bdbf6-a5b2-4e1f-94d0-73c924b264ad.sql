-- Create notification_tokens table to store Farcaster notification tokens
CREATE TABLE public.notification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER NOT NULL,
  token TEXT NOT NULL,
  notification_url TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on fid (one token per user)
CREATE UNIQUE INDEX idx_notification_tokens_fid ON public.notification_tokens (fid);

-- Create index for looking up valid tokens
CREATE INDEX idx_notification_tokens_valid ON public.notification_tokens (fid, is_valid) WHERE is_valid = true;

-- Enable Row Level Security
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public insert/update via edge functions (service role)
CREATE POLICY "Service role can manage notification tokens"
ON public.notification_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_tokens_updated_at
BEFORE UPDATE ON public.notification_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();