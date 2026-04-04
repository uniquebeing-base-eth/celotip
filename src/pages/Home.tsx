
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useWallet } from "@/hooks/useWallet";
import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { TOKEN_ADDRESSES } from "@/lib/contracts";
import { 
  Send, ArrowUpRight, ArrowDownLeft, Coins, TrendingUp, 
  Wallet, Loader2, Clock 
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const TOKENS = [
  { symbol: "cUSD", address: TOKEN_ADDRESSES.cUSD },
  { symbol: "CELO", address: TOKEN_ADDRESSES.CELO },
  { symbol: "cEUR", address: TOKEN_ADDRESSES.cEUR },
];

const Home = () => {
  const navigate = useNavigate();
  const { walletAddress, fid, isConnected, connect, isLoading: authLoading } = useWalletAuth();
  const { balance } = useWallet();

  // Fetch token balances
  const { data: tokenBalances } = useQuery({
    queryKey: ["homeTokenBalances", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const results = [];
      for (const token of TOKENS) {
        try {
          const bal = await (publicClient.readContract as any)({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          }) as bigint;
          const decimals = await (publicClient.readContract as any)({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          }) as number;
          results.push({
            symbol: token.symbol,
            balance: parseFloat(formatUnits(bal, decimals)),
          });
        } catch {
          results.push({ symbol: token.symbol, balance: 0 });
        }
      }
      return results;
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });

  // Fetch recent transactions for this user
  const { data: recentTips, isLoading: tipsLoading } = useQuery({
    queryKey: ["recentTips", fid],
    queryFn: async () => {
      if (!fid) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .or(`from_fid.eq.${fid},to_fid.eq.${fid}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch profiles for all FIDs
      const allFids = [...new Set(data?.flatMap(tx => [tx.from_fid, tx.to_fid]) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("fid, username, display_name")
        .in("fid", allFids);
      const profileMap = new Map(profiles?.map(p => [p.fid, p]) || []);

      return data?.map(tx => {
        const isSent = tx.from_fid === fid;
        const counterpartyFid = isSent ? tx.to_fid : tx.from_fid;
        const counterpartyProfile = profileMap.get(counterpartyFid);
        return {
          ...tx,
          isSent,
          counterpartyName: counterpartyProfile?.display_name || counterpartyProfile?.username || `User`,
        };
      }) || [];
    },
    enabled: !!fid,
    staleTime: 15000,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["userStats", fid],
    queryFn: async () => {
      if (!fid) return { sent: 0, received: 0, sentCount: 0, receivedCount: 0 };
      const [{ data: sentData }, { data: recvData }] = await Promise.all([
        supabase.from("transactions").select("amount").eq("from_fid", fid).eq("status", "completed"),
        supabase.from("transactions").select("amount").eq("to_fid", fid).eq("status", "completed"),
      ]);
      return {
        sent: sentData?.reduce((s, t) => s + Number(t.amount), 0) || 0,
        received: recvData?.reduce((s, t) => s + Number(t.amount), 0) || 0,
        sentCount: sentData?.length || 0,
        receivedCount: recvData?.length || 0,
      };
    },
    enabled: !!fid,
    staleTime: 30000,
  });

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!isConnected ? (
          /* Connect CTA */
          <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Welcome to CeloTip</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Send and receive tips instantly on the Celo network. Connect your wallet to get started.
            </p>
            <Button onClick={connect} className="bg-gradient-primary hover:opacity-90 px-8">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </Card>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="p-6 bg-gradient-primary text-primary-foreground border-0 shadow-elevated relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-6 -translate-x-6" />
              
              <p className="text-sm opacity-80 mb-1">Total Balance</p>
              <h2 className="text-3xl font-bold mb-1">
                {balance ? `${parseFloat(balance).toFixed(4)} CELO` : "0.0000 CELO"}
              </h2>
              {walletAddress && (
                <p className="text-xs opacity-60 font-mono">{formatAddr(walletAddress)}</p>
              )}

              <div className="flex gap-3 mt-5">
                <Button 
                  onClick={() => navigate("/send")}
                  variant="secondary"
                  className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Tip
                </Button>
                <Button 
                  onClick={() => navigate("/settings")}
                  variant="secondary"
                  className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </div>
            </Card>

            {/* Token Balances */}
            <div className="grid grid-cols-3 gap-3">
              {(tokenBalances || TOKENS.map(t => ({ symbol: t.symbol, balance: 0 }))).map(token => (
                <Card key={token.symbol} className="p-4 bg-gradient-card border-border shadow-card text-center">
                  <Avatar className="h-10 w-10 mx-auto mb-2 bg-primary/10">
                    <AvatarFallback className="text-xs font-bold text-primary">
                      {token.symbol.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold text-foreground">{token.balance.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{token.symbol}</p>
                </Card>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-gradient-card border-border shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Sent</span>
                </div>
                <p className="text-lg font-bold text-foreground">${stats?.sent.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-muted-foreground">{stats?.sentCount || 0} tips</p>
              </Card>
              <Card className="p-4 bg-gradient-card border-border shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <ArrowDownLeft className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs text-muted-foreground">Received</span>
                </div>
                <p className="text-lg font-bold text-foreground">${stats?.received.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-muted-foreground">{stats?.receivedCount || 0} tips</p>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/leaderboard")}>
                  View All
                </Button>
              </div>

              {tipsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : recentTips && recentTips.length > 0 ? (
                <div className="space-y-2">
                  {recentTips.map((tip) => {
                    const isSent = tip.from_fid === fid;
                    return (
                      <Card key={tip.id} className="p-4 bg-gradient-card border-border shadow-card">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSent ? 'bg-destructive/10' : 'bg-primary/10'
                          }`}>
                            {isSent ? (
                              <ArrowUpRight className="h-5 w-5 text-destructive" />
                            ) : (
                              <ArrowDownLeft className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {isSent ? "Sent" : "Received"} tip
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isSent ? "To" : "From"}: {tip.counterpartyName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isSent ? 'text-destructive' : 'text-primary'}`}>
                              {isSent ? '-' : '+'}{Number(tip.amount).toFixed(2)} {tip.token_symbol}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(tip.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tips yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Send your first tip to get started!</p>
                  <Button onClick={() => navigate("/send")} variant="outline" size="sm" className="mt-4">
                    <Send className="h-3 w-3 mr-2" />
                    Send a Tip
                  </Button>
                </Card>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
