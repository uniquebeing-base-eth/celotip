import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Shield, Zap, Loader2, ExternalLink, CheckCircle2, HelpCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { supabase } from "@/integrations/supabase/client";
import { CELOTIP_CONTRACT_ADDRESS, CELOTIP_ABI, CUSD_ADDRESS, ERC20_ABI, BOOST_PRICE_CUSD } from "@/lib/contracts";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const publicClient = createPublicClient({ chain: celo, transport: http() });

const Settings = () => {
  const queryClient = useQueryClient();
  const { walletAddress, fid, isConnected, walletSource, getProvider } = useWalletAuth();

  // Profile form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  // Load existing profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("connected_address", walletAddress.toLowerCase())
        .single();
      return data;
    },
    enabled: !!walletAddress,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setDescription(profile.description || "");
      setImageUrl(profile.image_url || "");
      setExternalLink(profile.external_link || "");
    }
  }, [profile]);

  // cUSD balance
  const { data: cusdBalance } = useQuery({
    queryKey: ["cusdBalanceSettings", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return 0;
      const bal = (await publicClient.readContract({
        address: CUSD_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      })) as bigint;
      return parseFloat(formatUnits(bal, 18));
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });

  const isBoosted = profile?.boost_end ? new Date(profile.boost_end) > new Date() : false;

  const handleSaveProfile = async () => {
    if (!fid || !walletAddress) return;
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          external_link: externalLink.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("fid", fid);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["featuredProfiles"] });
      toast({ title: "Profile saved! ✅" });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBoost = async () => {
    if (!walletAddress) return;
    setIsBoosting(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error("No wallet provider");

      const walletClient = createWalletClient({ chain: celo, transport: custom(provider) });
      const boostWei = parseUnits(BOOST_PRICE_CUSD.toString(), 18);

      // Check allowance
      const allowance = (await publicClient.readContract({
        address: CUSD_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress as `0x${string}`, CELOTIP_CONTRACT_ADDRESS as `0x${string}`],
      })) as bigint;

      if (allowance < boostWei) {
        const approveTx = await walletClient.writeContract({
          address: CUSD_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, boostWei],
          account: walletAddress as `0x${string}`,
          chain: celo,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      const txHash = await walletClient.writeContract({
        address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
        abi: CELOTIP_ABI,
        functionName: "boost",
        args: [],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === "success") {
        // Update boost in DB
        const boostEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("profiles")
          .update({
            boost_start: new Date().toISOString(),
            boost_end: boostEnd,
          })
          .eq("connected_address", walletAddress.toLowerCase());

        queryClient.invalidateQueries({ queryKey: ["myProfile"] });
        queryClient.invalidateQueries({ queryKey: ["featuredProfiles"] });
        toast({ title: "Profile Boosted! 🚀", description: "Your profile will be featured for 24 hours." });
      }
    } catch (error: any) {
      console.error("Boost failed:", error);
      toast({ title: "Boost Failed", description: error.shortMessage || error.message, variant: "destructive" });
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
        </div>

        {/* Profile Editor */}
        <Card className="p-6 border-border shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Your Profile</h3>
          </div>

          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect your wallet to edit your profile.</p>
          ) : profileLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or business" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you do? Building on Celo?"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Image URL</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">External Link</Label>
                <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://yoursite.com" className="mt-1" />
              </div>

              {walletAddress && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet</span>
                  <a
                    href={`https://celoscan.io/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary flex items-center gap-1"
                  >
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Button onClick={handleSaveProfile} className="w-full" disabled={isSaving || !name.trim()}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Save Profile</>}
              </Button>
            </div>
          )}
        </Card>

        {/* Boost Profile */}
        {isConnected && (
          <Card className="p-6 border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Boost Profile</h3>
            </div>

            {isBoosted ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">Your profile is boosted!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expires {new Date(profile!.boost_end!).toLocaleString()}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Pay {BOOST_PRICE_CUSD} cUSD to feature your profile at the top of the homepage for 24 hours.
                </p>
                <Button
                  onClick={handleBoost}
                  className="w-full"
                  disabled={isBoosting || (cusdBalance || 0) < BOOST_PRICE_CUSD}
                >
                  {isBoosting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Boost for {BOOST_PRICE_CUSD} cUSD</>
                  )}
                </Button>
                {(cusdBalance || 0) < BOOST_PRICE_CUSD && (
                  <p className="text-xs text-destructive mt-2 text-center">
                    Insufficient cUSD balance ({(cusdBalance || 0).toFixed(2)} available)
                  </p>
                )}
              </>
            )}
          </Card>
        )}

        {/* Connection Info */}
        <Card className="p-6 border-border shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Connection</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium ${isConnected ? "text-primary" : "text-destructive"}`}>
                {isConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium text-foreground capitalize">{walletSource || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contract</span>
              <a
                href={`https://celoscan.io/address/${CELOTIP_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary flex items-center gap-1"
              >
                {CELOTIP_CONTRACT_ADDRESS.slice(0, 6)}...{CELOTIP_CONTRACT_ADDRESS.slice(-4)} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-6 border-border shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">FAQ</h3>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="1">
              <AccordionTrigger className="text-sm">How does CeloTip work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Create a profile, get discovered, and receive tips in cUSD. A 5% platform fee is deducted from each tip to sustain the platform.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger className="text-sm">What is boosting?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Boosting costs {BOOST_PRICE_CUSD} cUSD and features your profile at the top of the homepage for 24 hours, giving you maximum visibility.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger className="text-sm">What tokens are supported?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                CeloTip exclusively uses cUSD (Mento Dollar), the Celo-native stablecoin. No volatile tokens — only stable payments.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger className="text-sm">Works with MiniPay?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes! CeloTip is built for MiniPay. It auto-detects your MiniPay wallet and requires zero setup.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
