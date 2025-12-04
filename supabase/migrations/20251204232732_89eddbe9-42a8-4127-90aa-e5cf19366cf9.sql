-- Allow public read access to completed transactions for trending/leaderboard
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

-- Anyone can view completed transactions (for leaderboard and trending casts)
CREATE POLICY "Anyone can view completed transactions"
ON public.transactions
FOR SELECT
USING (status = 'completed');

-- System can still insert/update
-- (existing policies for INSERT and UPDATE remain)