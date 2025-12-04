-- Add token_symbol column to token_approvals table if it doesn't exist
ALTER TABLE public.token_approvals ADD COLUMN IF NOT EXISTS token_symbol text;

-- Update existing records to have a default token symbol
UPDATE public.token_approvals SET token_symbol = 'cUSD' WHERE token_symbol IS NULL;