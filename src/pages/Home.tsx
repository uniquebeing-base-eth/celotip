  import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CastCard } from "@/components/CastCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  // ------------------------------
  // Fetch trending casts (SQL aggregation in DB)
  // ------------------------------
  const { data: trendingCasts, isLoading, error } = useQuery({
    queryKey: ["trendingCasts"],
    queryFn: async (): Promise<TrendingCast[]> => {
      // Aggregate tip data directly in SQL
      const { data: aggregated, error: aggError } = await supabase
        .from("transactions")
        .select(`
          cast_hash,
          to_fid,
          token_symbol,
          sum(amount) as total_tips,
          count(*) as tip_count,
          max(created_at) as latest_tip_at
        `)
        .eq("status", "completed")
        .not("cast_hash", "is", null)
        .group("cast_hash, to_fid, token_symbol")
        .order("total_tips", { ascending: false })
        .limit(20);

      if (aggError) throw aggError;

      // Fetch profile info for recipients
      const fids = [...new Set(aggregated.map((c) => c.to_fid))];

      let profileMap = new Map<number, any>();
      if (fids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("fid, username, display_name, pfp_url")
          .in("fid", fids);

        profileMap = new Map(profiles?.map((p) => [p.fid, p]) || []);
      }

      // Hydrate response
      return aggregated.map((cast, idx): TrendingCast => {
        const profile = profileMap.get(cast.to_fid);
        return {
          id: `${cast.cast_hash}:${cast.to_fid}:${idx}`,
          ...cast,
          total_tips: Number(cast.total_tips),
          recipient_username: profile?.username,
          recipient_display_name: profile?.display_name,
          recipient_pfp_url: profile?.pfp_url,
        };
      });
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // ------------------------------
  // Memoized search filtering
  // ------------------------------
  const filteredCasts = useMemo(() => {
    if (!trendingCasts) return [];
    if (!debouncedSearch) return trendingCasts;

    const q = debouncedSearch.toLowerCase();
    return trendingCasts.filter((cast) =>
      cast.recipient_username?.toLowerCase().includes(q) ||
      cast.recipient_display_name?.toLowerCase().includes(q) ||
      cast.cast_hash.toLowerCase().includes(q)
    );
  }, [debouncedSearch, trendingCasts]);

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onSearch={setSearch} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Trending Casts</h2>
          <p className="text-sm text-muted-foreground">
            Casts receiving the most tips right now
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            Failed to fetch trending casts.
          </div>
        ) : filteredCasts.length > 0 ? (
          <div className="space-y-4">
            {filteredCasts.map((cast) => (
              <CastCard
                key={cast.id}
                cast={{
                  id: cast.id,
                  hash: cast.cast_hash,
                  author: {
                    fid: cast.to_fid,
                    username: cast.recipient_username || `fid:${cast.to_fid}`,
                    displayName:
                      cast.recipient_display_name ||
                      cast.recipient_username ||
                      `User ${cast.to_fid}`,
                    pfpUrl: cast.recipient_pfp_url,
                  },
                  totalTips: cast.total_tips,
                  tipCount: cast.tip_count,
                  tokenSymbol: cast.token_symbol,
                  latestTipAt: cast.latest_tip_at,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {debouncedSearch
              ? "No casts found matching your search."
              : "No tips recorded yet. Start tipping on Farcaster to see trending casts here!"}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;    
