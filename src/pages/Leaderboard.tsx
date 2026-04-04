
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LeaderboardItem } from "@/components/LeaderboardItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  amount: number;
  count: number;
}

const Leaderboard = () => {
  const [timeFilter, setTimeFilter] = useState<"24h" | "7d" | "30d">("7d");

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const fetchLeaderboard = async (field: "to_fid" | "from_fid"): Promise<LeaderboardUser[]> => {
    const fromDate = getTimeFilterDate();
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(`${field}, amount`)
      .eq("status", "completed")
      .gte("created_at", fromDate);

    if (error) throw error;

    const map = new Map<number, { fid: number; amount: number; count: number }>();
    transactions?.forEach((tx: any) => {
      const fid = tx[field];
      const existing = map.get(fid);
      if (existing) {
        existing.amount += Number(tx.amount);
        existing.count += 1;
      } else {
        map.set(fid, { fid, amount: Number(tx.amount), count: 1 });
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 20);
    const fids = sorted.map(e => e.fid);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("fid, username, display_name, pfp_url")
      .in("fid", fids);

    const profileMap = new Map(profiles?.map(p => [p.fid, p]) || []);
    return sorted.map((entry, i): LeaderboardUser => {
      const profile = profileMap.get(entry.fid);
      return {
        rank: i + 1,
        fid: entry.fid,
        username: profile?.username || `User`,
        displayName: profile?.display_name || undefined,
        pfpUrl: profile?.pfp_url || undefined,
        amount: entry.amount,
        count: entry.count,
      };
    });
  };

  const { data: topEarners, isLoading: earnersLoading } = useQuery({
    queryKey: ["topEarners", timeFilter],
    queryFn: () => fetchLeaderboard("to_fid"),
    staleTime: 30000,
  });

  const { data: topTippers, isLoading: tippersLoading } = useQuery({
    queryKey: ["topTippers", timeFilter],
    queryFn: () => fetchLeaderboard("from_fid"),
    staleTime: 30000,
  });

  const isLoading = earnersLoading || tippersLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Top tippers and earners on CeloTip</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["24h", "7d", "30d"] as const).map(f => (
            <Button
              key={f}
              variant={timeFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter(f)}
            >
              {f === "24h" ? "24h" : f === "7d" ? "7 Days" : "30 Days"}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="earners" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="earners" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Top Earners
            </TabsTrigger>
            <TabsTrigger value="tippers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Top Tippers
            </TabsTrigger>
          </TabsList>

          {["earners", "tippers"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (tab === "earners" ? topEarners : topTippers)?.length ? (
                (tab === "earners" ? topEarners : topTippers)!.map(user => (
                  <LeaderboardItem key={`${tab}-${user.fid}`} user={{
                    rank: user.rank, username: user.username, displayName: user.displayName,
                    pfpUrl: user.pfpUrl, amount: user.amount, tipCount: user.count,
                  }} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No data for this period yet.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
