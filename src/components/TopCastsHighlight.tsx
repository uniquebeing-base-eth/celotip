

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Coins, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface TopCast {
  cast_hash: string;
  to_fid: number;
  total_tips: number;
  tip_count: number;
  token_symbol: string;
  recipient_username?: string;
  recipient_display_name?: string;
  recipient_pfp_url?: string;
  cast_text?: string;
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

export const TopCastsHighlight = () => {
  const { data: topCasts, isLoading } = useQuery({
    queryKey: ["topCastsHighlight"],
    queryFn: async (): Promise<TopCast[]> => {
      // Get all completed transactions with cast_hash
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("cast_hash, to_fid, amount, token_symbol")
        .eq("status", "completed")
        .not("cast_hash", "is", null);

      if (error) throw error;

      // Aggregate by cast_hash
      const castMap = new Map<string, {
        cast_hash: string;
        to_fid: number;
        total_tips: number;
        tip_count: number;
        token_symbol: string;
      }>();

      transactions?.forEach((tx) => {
        if (!tx.cast_hash) return;
        
        const existing = castMap.get(tx.cast_hash);
        if (existing) {
          existing.total_tips += Number(tx.amount);
          existing.tip_count += 1;
        } else {
          castMap.set(tx.cast_hash, {
            cast_hash: tx.cast_hash,
            to_fid: tx.to_fid,
            total_tips: Number(tx.amount),
            tip_count: 1,
            token_symbol: tx.token_symbol,
          });
        }
      });

      // Sort by total tips and get top 3
      const sortedCasts = Array.from(castMap.values())
        .sort((a, b) => b.total_tips - a.total_tips)
        .slice(0, 3);

      // Fetch profile info
      const fids = [...new Set(sortedCasts.map((c) => c.to_fid))];
      let profileMap = new Map<number, { fid: number; username: string; display_name: string | null; pfp_url: string | null }>();
      
      if (fids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("fid, username, display_name, pfp_url")
          .in("fid", fids);
        profileMap = new Map(profiles?.map((p) => [p.fid, p]) || []);
      }

      // Fetch cast text from Neynar
      const castHashes = sortedCasts.map((c) => c.cast_hash);
      let castTextMap = new Map<string, string>();
      
      if (castHashes.length > 0) {
        try {
          const { data: castDetails } = await supabase.functions.invoke('get-cast-details', {
            body: { castHashes },
          });
          
          if (castDetails?.casts) {
            for (const [hash, details] of Object.entries(castDetails.casts)) {
              castTextMap.set(hash, (details as { text: string }).text || '');
            }
          }
        } catch (err) {
          console.error("Failed to fetch cast details:", err);
        }
      }

      return sortedCasts.map((cast): TopCast => {
        const profile = profileMap.get(cast.to_fid);
        return {
          ...cast,
          recipient_username: profile?.username || undefined,
          recipient_display_name: profile?.display_name || undefined,
          recipient_pfp_url: profile?.pfp_url || undefined,
          cast_text: castTextMap.get(cast.cast_hash) || undefined,
        };
      });
    },
    staleTime: FIVE_HOURS_MS,
    refetchInterval: FIVE_HOURS_MS,
  });

  const rankColors = [
    "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    "from-slate-300/20 to-slate-400/10 border-slate-400/30", 
    "from-amber-600/20 to-amber-700/10 border-amber-600/30",
  ];

  const rankIcons = ["🥇", "🥈", "🥉"];

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Top Tipped Casts</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="min-w-[200px] h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!topCasts || topCasts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-foreground">Top Tipped Casts</h3>
        <span className="text-xs text-muted-foreground ml-auto">Updates every 5h</span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {topCasts.map((cast, index) => {
          const warpcastUrl = `https://warpcast.com/~/conversations/${cast.cast_hash}`;
          const truncatedText = cast.cast_text 
            ? cast.cast_text.length > 60 
              ? cast.cast_text.substring(0, 60) + '...' 
              : cast.cast_text
            : null;
          
          return (
            <a
              key={cast.cast_hash}
              href={warpcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-w-[220px] flex-shrink-0 p-4 rounded-xl bg-gradient-to-br ${rankColors[index]} border backdrop-blur-sm hover:scale-105 transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{rankIcons[index]}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-7 w-7 border border-border/50">
                  <AvatarImage src={cast.recipient_pfp_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cast.to_fid}`} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {cast.recipient_username?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {cast.recipient_display_name || cast.recipient_username || `User ${cast.to_fid}`}
                  </p>
                </div>
              </div>

              {truncatedText && (
                <p className="text-xs text-foreground/80 mb-2 line-clamp-2 leading-relaxed">
                  {truncatedText}
                </p>
              )}
              
              <div className="flex items-center gap-1.5 mt-auto">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">${cast.total_tips.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">• {cast.tip_count} tips</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
