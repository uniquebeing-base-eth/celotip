
-- Create a sequence for auto-generated FIDs for non-Farcaster users (starting high to avoid collision)
CREATE SEQUENCE IF NOT EXISTS public.auto_fid_seq START WITH 900000000 INCREMENT BY 1;

-- Function to get or create a profile by wallet address
CREATE OR REPLACE FUNCTION public.get_or_create_profile_by_wallet(p_wallet_address TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fid INTEGER;
BEGIN
  -- Try to find existing profile by wallet address
  SELECT fid INTO v_fid FROM public.profiles 
  WHERE connected_address = p_wallet_address
  LIMIT 1;
  
  IF v_fid IS NOT NULL THEN
    RETURN v_fid;
  END IF;
  
  -- Create a new profile with auto-generated FID
  v_fid := nextval('public.auto_fid_seq');
  
  INSERT INTO public.profiles (fid, username, connected_address, display_name)
  VALUES (v_fid, p_wallet_address, p_wallet_address, 'MiniPay User')
  ON CONFLICT (fid) DO NOTHING;
  
  RETURN v_fid;
END;
$$;
