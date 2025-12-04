import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CastCard } from "@/components/CastCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";


interface TrendingCast {
  id: string;
  cast_hash: string;
  to_fid: number;
  total_tips: number;
  tip_count: number;
  token_symbol: string;
  latest_tip_at: string;
  recipient_username?: string;
  recipient_display_name?: string;
  recipient_pfp_url?: string;
}

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch trending casts (casts receiving the most tips)
  const { data: trendingCasts, isLoading } = useQuery({
    queryKey: ["trendingCasts"],
    queryFn: async (): Promise<TrendingCast[]> => {
      // Get aggregated tip data grouped by cast_hash
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`
          id,
          cast_hash,
          to_fid,
          amount,
          token_symbol,
          created_at,
          status
        `)
        .eq("status", "completed")
        .not("cast_hash", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      
      if (error) throw error;

      
      // Aggregate by cast_hash
      const castMap = new Map<string, {
        cast_hash: string;
        to_fid: number;
        total_tips: number;
        tip_count: number;
        token_symbol: string;
        latest_tip_at: string;
      }>();

      transactions?.forEach((tx) => {
        if (!tx.cast_hash) return;
        
        const existing = castMap.get(tx.cast_hash);
        if (existing) {
          existing.total_tips += Number(tx.amount);
          existing.tip_count += 1;
          if (tx.created_at > existing.latest_tip_at) {
            existing.latest_tip_at = tx.created_at;
          }
        } else {
          castMap.set(tx.cast_hash, {
            cast_hash: tx.cast_hash,
            to_fid: tx.to_fid,
            total_tips: Number(tx.amount),
            tip_count: 1,
            token_symbol: tx.token_symbol,
            latest_tip_at: tx.created_at,
          });
        }
      });

      // Sort by total tips descending
      const sortedCasts = Array.from(castMap.values())
        .sort((a, b) => b.total_tips - a.total_tips)
        .slice(0, 20);

      // Fetch profile info for each recipient
      const fids = [...new Set(sortedCasts.map((c) => c.to_fid))];
      
      if (fids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("fid, username, display_name, pfp_url")
          .in("fid", fids);

        const profileMap = new Map(profiles?.map((p) => [p.fid, p]) || []);

        return sortedCasts.map((cast, index): TrendingCast => {
          const profile = profileMap.get(cast.to_fid);
          return {
            id: `${cast.cast_hash}-${index}`,
            ...cast,
            recipient_username: profile?.username || undefined,
            recipient_display_name: profile?.display_name || undefined,
            recipient_pfp_url: profile?.pfp_url || undefined,
          };
        });
      }

      return sortedCasts.map((cast, index): TrendingCast => ({
        id: `${cast.cast_hash}-${index}`,
        ...cast,
        recipient_username: undefined,
        recipient_display_name: undefined,
        recipient_pfp_url: undefined,
      }));
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Filter by search query
  const filteredCasts = trendingCasts?.filter((cast) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cast.recipient_username?.toLowerCase().includes(query) ||
      cast.recipient_display_name?.toLowerCase().includes(query) ||
      cast.cast_hash.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onSearch={setSearchQuery} />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Trending Casts</h2>
          <p className="text-sm text-muted-foreground">Casts receiving the most tips right now</p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCasts && filteredCasts.length > 0 ? (
            filteredCasts.map((cast) => (
              <CastCard 
                key={cast.id} 
                cast={{
                  id: cast.id,
                  hash: cast.cast_hash,
                  author: {
                    fid: cast.to_fid,
                    username: cast.recipient_username || `fid:${cast.to_fid}`,
                    displayName: cast.recipient_display_name || cast.recipient_username || `User ${cast.to_fid}`,
                    pfpUrl: cast.recipient_pfp_url,
                  },
                  totalTips: cast.total_tips,
                  tipCount: cast.tip_count,
                  tokenSymbol: cast.token_symbol,
                  latestTipAt: cast.latest_tip_at,
                }} 
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No casts found matching your search." 
                  : "No tips recorded yet. Start tipping on Farcaster to see trending casts here!"}
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
