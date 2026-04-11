import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ProfileCard } from "@/components/ProfileCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Wallet, Users, Sparkles } from "lucide-react";

const Home = () => {
  const { isConnected, connect, walletAddress, fid, isLoading: authLoading } = useWalletAuth();
  const queryClient = useQueryClient();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Get user's tip config for instant tipping
  const { data: tipConfig } = useQuery({
    queryKey: ["tipConfig", fid],
    queryFn: async () => {
      if (!fid) return null;
      const { data } = await supabase
        .from("tip_configs")
        .select("*")
        .eq("fid", fid)
        .eq("interaction_type", "tip")
        .eq("is_enabled", true)
        .maybeSingle();
      return data;
    },
    enabled: !!fid,
  });

  // Fetch featured profiles: boosted first, then all by total tips
  const { data: featuredProfiles, isLoading } = useQuery({
    queryKey: ["featuredProfiles"],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Get boosted profiles first
      const { data: boosted } = await supabase
        .from("profiles")
        .select("*")
        .gt("boost_end", now)
        .order("total_tips_received", { ascending: false })
        .limit(10);

      const boostedFids = new Set((boosted || []).map(p => p.fid));
      const remaining = 10 - (boosted?.length || 0);

      let topProfiles: typeof boosted = [];
      if (remaining > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .not("connected_address", "is", null)
          .order("total_tips_received", { ascending: false })
          .limit(remaining + 20);

        topProfiles = (data || []).filter(
          p => !boostedFids.has(p.fid)
        ).slice(0, remaining);
      }

      return [
        ...(boosted || []).map(p => ({ ...p, isBoosted: true })),
        ...topProfiles.map(p => ({ ...p, isBoosted: false })),
      ];
    },
    staleTime: 15000,
  });

  // Instant tip handler - no modal, just send
  const handleInstantTip = async (recipientAddress: string, recipientName: string) => {
    if (!walletAddress || !fid) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }

    if (!tipConfig) {
      toast({
        title: "Set up tipping first",
        description: "Go to Settings to set your tip amount and approve tokens.",
        variant: "destructive",
      });
      return;
    }

    if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
      toast({ title: "Can't tip yourself", variant: "destructive" });
      return;
    }

    setSendingTo(recipientAddress);

    try {
      const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
        p_wallet_address: recipientAddress.toLowerCase(),
      });

      const { data, error } = await supabase.functions.invoke("process-tip", {
        body: {
          fromFid: fid,
          toFid: recipientFid || 0,
          interactionType: "tip",
          castHash: "",
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Tip failed");

      toast({
        title: "Tip sent! 🎉",
        description: `${tipConfig.amount} ${tipConfig.token_symbol} sent to ${recipientName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["featuredProfiles"] });
    } catch (error: any) {
      console.error("Tip failed:", error);
      toast({
        title: "Tip Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

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
        {/* Hero */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Discover & Tip</h2>
          <p className="text-sm text-muted-foreground">
            Support builders, creators & businesses on Celo
          </p>
        </div>

        {!isConnected && (
          <Card className="p-6 text-center border-border shadow-card">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to start tipping
            </p>
            <Button onClick={connect} className="px-8">
              <Wallet className="h-4 w-4 mr-2" /> Connect Wallet
            </Button>
          </Card>
        )}

        {/* Featured Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Featured</h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : featuredProfiles && featuredProfiles.length > 0 ? (
            <div className="space-y-3">
              {featuredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.connected_address || profile.fid}
                  walletAddress={profile.connected_address || ""}
                  name={profile.display_name || profile.username}
                  description={profile.description}
                  imageUrl={profile.image_url}
                  totalTipsReceived={Number(profile.total_tips_received) || 0}
                  isBoosted={profile.isBoosted}
                  isSending={sendingTo === profile.connected_address}
                  onTip={handleInstantTip}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-border shadow-card">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No profiles yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your profile in Settings to get listed!
              </p>
            </Card>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
