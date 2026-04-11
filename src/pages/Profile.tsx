import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign, ExternalLink, Zap, Loader2, Link as LinkIcon } from "lucide-react";

const Profile = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { walletAddress, fid } = useWalletAuth();
  const [isSending, setIsSending] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", address],
    queryFn: async () => {
      if (!address) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("connected_address", address.toLowerCase())
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!address,
  });

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

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const isBoosted = profile?.boost_end ? new Date(profile.boost_end) > new Date() : false;
  const displayName = profile?.display_name || profile?.username || (address ? formatAddr(address) : "User");

  const handleInstantTip = async () => {
    if (!walletAddress || !fid || !address) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }
    if (!tipConfig) {
      toast({ title: "Set up tipping first", description: "Go to Settings to configure your tip amount.", variant: "destructive" });
      return;
    }
    if (address.toLowerCase() === walletAddress.toLowerCase()) {
      toast({ title: "Can't tip yourself", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
        p_wallet_address: address.toLowerCase(),
      });

      const { data, error } = await supabase.functions.invoke("process-tip", {
        body: { fromFid: fid, toFid: recipientFid || 0, interactionType: "tip", castHash: "" },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Tip failed");

      toast({ title: "Tip sent! 🎉", description: `${tipConfig.amount} ${tipConfig.token_symbol} sent to ${displayName}` });
    } catch (error: any) {
      console.error("Tip failed:", error);
      toast({ title: "Tip Failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="p-6 text-center border-border shadow-card">
          <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-primary/20 shadow-md">
            {profile?.image_url && <AvatarImage src={profile.image_url} alt={displayName} />}
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xl font-bold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            {isBoosted && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                <Zap className="h-3 w-3 mr-0.5" /> Boosted
              </Badge>
            )}
          </div>

          {address && (
            <a
              href={`https://celoscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              {formatAddr(address)} <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {profile?.description && (
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{profile.description}</p>
          )}

          {profile?.external_link && (
            <a
              href={profile.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
            >
              <LinkIcon className="h-3 w-3" /> {profile.external_link.replace(/^https?:\/\//, "").slice(0, 30)}
            </a>
          )}

          <div className="flex items-center justify-center gap-1 mt-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-primary">
              {(profile?.total_tips_received ?? 0).toFixed(2)} cUSD
            </span>
            <span className="text-sm text-muted-foreground">received</span>
          </div>

          <Button
            onClick={handleInstantTip}
            className="mt-6 px-8 h-12 text-base"
            disabled={isSending}
          >
            {isSending ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sending...</>
            ) : (
              <><DollarSign className="h-5 w-5 mr-2" />Tip with MiniPay</>
            )}
          </Button>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
