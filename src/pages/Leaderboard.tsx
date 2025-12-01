import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LeaderboardItem } from "@/components/LeaderboardItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const Leaderboard = () => {
  const [timeFilter, setTimeFilter] = useState<"24h" | "7d" | "30d">("7d");
  const topEarners: any[] = [];
  const topTippers: any[] = [];

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
            {topEarners.length > 0 ? (
              topEarners.map((user) => (
                <LeaderboardItem key={user.username} user={user} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No earners data yet. Coming soon!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tippers" className="space-y-3 mt-0">
            {topTippers.length > 0 ? (
              topTippers.map((user) => (
                <LeaderboardItem key={user.username} user={user} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tippers data yet. Coming soon!</p>
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
