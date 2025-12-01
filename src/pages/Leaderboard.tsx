import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LeaderboardItem } from "@/components/LeaderboardItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Dummy data
const TOP_EARNERS = [
  { rank: 1, username: "vitalik", amount: 1250.50, casts: 342 },
  { rank: 2, username: "pmarca", amount: 980.25, casts: 256 },
  { rank: 3, username: "balajis", amount: 875.75, casts: 198 },
  { rank: 4, username: "naval", amount: 765.00, casts: 145 },
  { rank: 5, username: "dwr", amount: 640.30, casts: 423 },
  { rank: 6, username: "cdixon", amount: 520.15, casts: 178 },
  { rank: 7, username: "punk6529", amount: 480.90, casts: 267 },
  { rank: 8, username: "elonmusk", amount: 420.50, casts: 89 },
];

const TOP_TIPPERS = [
  { rank: 1, username: "alice", amount: 2340.75, casts: 1543 },
  { rank: 2, username: "bob", amount: 1890.50, casts: 1234 },
  { rank: 3, username: "charlie", amount: 1560.25, casts: 987 },
  { rank: 4, username: "dave", amount: 1230.00, casts: 876 },
  { rank: 5, username: "eve", amount: 980.50, casts: 654 },
  { rank: 6, username: "frank", amount: 845.75, casts: 543 },
  { rank: 7, username: "grace", amount: 720.30, casts: 432 },
  { rank: 8, username: "heidi", amount: 650.90, casts: 321 },
];

const Leaderboard = () => {
  const [timeFilter, setTimeFilter] = useState<"24h" | "7d" | "30d">("7d");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header username="Creator" />
      
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
            {TOP_EARNERS.map((user) => (
              <LeaderboardItem key={user.username} user={user} />
            ))}
          </TabsContent>

          <TabsContent value="tippers" className="space-y-3 mt-0">
            {TOP_TIPPERS.map((user) => (
              <LeaderboardItem key={user.username} user={user} />
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
