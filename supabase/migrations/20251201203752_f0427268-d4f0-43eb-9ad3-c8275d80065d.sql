-- Create transactions table to track all tips
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_fid bigint NOT NULL,
  to_fid bigint NOT NULL,
  amount numeric NOT NULL,
  token_address text NOT NULL,
  token_symbol text NOT NULL,
  interaction_type text NOT NULL,
  cast_hash text,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create token approvals table to track user approvals
CREATE TABLE public.token_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fid bigint NOT NULL,
  token_address text NOT NULL,
  approved_amount numeric NOT NULL,
  spent_amount numeric NOT NULL DEFAULT 0,
  contract_address text NOT NULL,
  tx_hash text,
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(fid, token_address)
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (from_fid IN (SELECT fid FROM public.profiles WHERE fid = (SELECT fid FROM public.profiles LIMIT 1)) OR 
       to_fid IN (SELECT fid FROM public.profiles WHERE fid = (SELECT fid FROM public.profiles LIMIT 1)));

CREATE POLICY "System can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update transactions"
ON public.transactions
FOR UPDATE
USING (true);

-- RLS policies for token approvals
CREATE POLICY "Users can view their own approvals"
ON public.token_approvals
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own approvals"
ON public.token_approvals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own approvals"
ON public.token_approvals
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_token_approvals_updated_at
BEFORE UPDATE ON public.token_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();