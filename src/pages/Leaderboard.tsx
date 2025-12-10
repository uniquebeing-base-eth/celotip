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
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  // Fetch top earners (users who received the most tips)
  const { data: topEarners, isLoading: earnersLoading } = useQuery({
    queryKey: ["topEarners", timeFilter],
    queryFn: async (): Promise<LeaderboardUser[]> => {
      const fromDate = getTimeFilterDate();
      
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("to_fid, amount")
        .eq("status", "completed")
        .gte("created_at", fromDate);

      if (error) throw error;

      // Aggregate by to_fid
      const earnerMap = new Map<number, { fid: number; amount: number; count: number }>();
      transactions?.forEach((tx) => {
        const existing = earnerMap.get(tx.to_fid);
        if (existing) {
          existing.amount += Number(tx.amount);
          existing.count += 1;
        } else {
          earnerMap.set(tx.to_fid, {
            fid: tx.to_fid,
            amount: Number(tx.amount),
            count: 1,
          });
        }
      });

      // Sort by amount and take top 20
      const sortedEarners = Array.from(earnerMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 20);

      // Fetch profiles
      const fids = sortedEarners.map((e) => e.fid);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("fid, username, display_name, pfp_url")
        .in("fid", fids);

      const profileMap = new Map(profiles?.map((p) => [p.fid, p]) || []);

      return sortedEarners.map((earner, index): LeaderboardUser => {
        const profile = profileMap.get(earner.fid);
        return {
          rank: index + 1,
          fid: earner.fid,
          username: profile?.username || `fid:${earner.fid}`,
          displayName: profile?.display_name || undefined,
          pfpUrl: profile?.pfp_url || undefined,
          amount: earner.amount,
          count: earner.count,
        };
      });
    },
    staleTime: 30000,
  });

  // Fetch top tippers (users who sent the most tips)
  const { data: topTippers, isLoading: tippersLoading } = useQuery({
    queryKey: ["topTippers", timeFilter],
    queryFn: async (): Promise<LeaderboardUser[]> => {
      const fromDate = getTimeFilterDate();
      
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("from_fid, amount")
        .eq("status", "completed")
        .gte("created_at", fromDate);

      if (error) throw error;

      // Aggregate by from_fid
      const tipperMap = new Map<number, { fid: number; amount: number; count: number }>();
      transactions?.forEach((tx) => {
        const existing = tipperMap.get(tx.from_fid);
        if (existing) {
          existing.amount += Number(tx.amount);
          existing.count += 1;
        } else {
          tipperMap.set(tx.from_fid, {
            fid: tx.from_fid,
            amount: Number(tx.amount),
            count: 1,
          });
        }
      });

      // Sort by amount and take top 20
      const sortedTippers = Array.from(tipperMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 20);

      // Fetch profiles
      const fids = sortedTippers.map((t) => t.fid);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("fid, username, display_name, pfp_url")
        .in("fid", fids);

      const profileMap = new Map(profiles?.map((p) => [p.fid, p]) || []);

      return sortedTippers.map((tipper, index): LeaderboardUser => {
        const profile = profileMap.get(tipper.fid);
        return {
          rank: index + 1,
          fid: tipper.fid,
          username: profile?.username || `fid:${tipper.fid}`,
          displayName: profile?.display_name || undefined,
          pfpUrl: profile?.pfp_url || undefined,
          amount: tipper.amount,
          count: tipper.count,
        };
      });
    },
    staleTime: 30000,
  });

  const isLoading = earnersLoading || tippersLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Top performers in the CeloTip community</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={timeFilter === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("24h")}
            className="whitespace-nowrap"
          >
            24 Hours
          </Button>
          <Button
            variant={timeFilter === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("7d")}
            className="whitespace-nowrap"
          >
            7 Days
          </Button>
          <Button
            variant={timeFilter === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("30d")}
            className="whitespace-nowrap"
          >
            30 Days
          </Button>
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

          <TabsContent value="earners" className="space-y-3 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : topEarners && topEarners.length > 0 ? (
              topEarners.map((user) => (
                <LeaderboardItem 
                  key={`earner-${user.fid}`} 
                  user={{
                    rank: user.rank,
                    username: user.username,
                    displayName: user.displayName,
                    pfpUrl: user.pfpUrl,
                    amount: user.amount,
                    tipCount: user.count,
                  }} 
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No earners data yet for this period.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tippers" className="space-y-3 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : topTippers && topTippers.length > 0 ? (
              topTippers.map((user) => (
                <LeaderboardItem 
                  key={`tipper-${user.fid}`} 
                  user={{
                    rank: user.rank,
                    username: user.username,
                    displayName: user.displayName,
                    pfpUrl: user.pfpUrl,
                    amount: user.amount,
                    tipCount: user.count,
                  }} 
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tippers data yet for this period.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
