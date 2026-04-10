import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Shield, Zap, Loader2, ExternalLink, CheckCircle2, HelpCircle, DollarSign, Settings2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  CELOTIP_CONTRACT_ADDRESS, CUSD_ADDRESS, ERC20_ABI, BOOST_PRICE_CUSD,
  CELOTIP_ABI, CELO_STABLES, DEFAULT_TIP_AMOUNT,
} from "@/lib/contracts";
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

  // Tip config
  const [tipAmount, setTipAmount] = useState(DEFAULT_TIP_AMOUNT.toString());
  const [selectedToken, setSelectedToken] = useState<string>("cUSD");
  const [isSavingTip, setIsSavingTip] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalAmount, setApprovalAmount] = useState("10");

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

  // Load existing tip config
  const { data: tipConfig } = useQuery({
    queryKey: ["tipConfig", fid],
    queryFn: async () => {
      if (!fid) return null;
      const { data } = await supabase
        .from("tip_configs")
        .select("*")
        .eq("fid", fid)
        .eq("interaction_type", "tip")
        .maybeSingle();
      return data;
    },
    enabled: !!fid,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setDescription(profile.description || "");
      setImageUrl(profile.image_url || "");
      setExternalLink(profile.external_link || "");
    }
  }, [profile]);

  useEffect(() => {
    if (tipConfig) {
      setTipAmount(tipConfig.amount.toString());
      setSelectedToken(tipConfig.token_symbol || "cUSD");
    }
  }, [tipConfig]);

  const tokenInfo = CELO_STABLES[selectedToken as keyof typeof CELO_STABLES] || CELO_STABLES.cUSD;

  // Token allowance on the CeloTip contract
  const { data: contractAllowance, refetch: refetchAllowance } = useQuery({
    queryKey: ["contractAllowance", walletAddress, tokenInfo.address],
    queryFn: async () => {
      if (!walletAddress) return 0;
      const allowance = (await (publicClient.readContract as any)({
        address: tokenInfo.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress as `0x${string}`, CELOTIP_CONTRACT_ADDRESS as `0x${string}`],
      })) as bigint;
      return parseFloat(formatUnits(allowance, 18));
    },
    enabled: !!walletAddress,
    staleTime: 15000,
  });

  // cUSD balance
  const { data: cusdBalance } = useQuery({
    queryKey: ["cusdBalanceSettings", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return 0;
      const bal = (await (publicClient.readContract as any)({
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

  const handleSaveTipConfig = async () => {
    if (!fid) return;
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Enter a valid tip amount", variant: "destructive" });
      return;
    }

    setIsSavingTip(true);
    try {
      const { error } = await supabase
        .from("tip_configs")
        .upsert(
          {
            fid,
            interaction_type: "tip",
            amount,
            token_address: tokenInfo.address,
            token_symbol: tokenInfo.symbol,
            is_enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "fid,interaction_type" }
        );

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tipConfig"] });
      toast({ title: "Tip config saved! ✅", description: `You'll tip ${amount} ${tokenInfo.symbol} per tap.` });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingTip(false);
    }
  };

  const handleApproveTokens = async () => {
    if (!walletAddress) return;
    const approveAmt = parseFloat(approvalAmount);
    if (isNaN(approveAmt) || approveAmt <= 0) {
      toast({ title: "Enter a valid approval amount", variant: "destructive" });
      return;
    }

    setIsApproving(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error("No wallet provider");

      const walletClient = createWalletClient({ chain: celo, transport: custom(provider) });
      const amountWei = parseUnits(approvalAmount, 18);

      const approveTx = await walletClient.writeContract({
        address: tokenInfo.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, amountWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Save approval record
      if (fid) {
        await supabase.from("token_approvals").upsert(
          {
            fid,
            token_address: tokenInfo.address,
            token_symbol: tokenInfo.symbol,
            contract_address: CELOTIP_CONTRACT_ADDRESS,
            approved_amount: approveAmt,
            tx_hash: approveTx,
          },
          { onConflict: "fid,token_address,contract_address" }
        );
      }

      refetchAllowance();
      toast({ title: "Tokens approved! ✅", description: `${approvalAmount} ${tokenInfo.symbol} approved for tipping.` });
    } catch (error: any) {
      console.error("Approval failed:", error);
      toast({ title: "Approval Failed", description: error.shortMessage || error.message, variant: "destructive" });
    } finally {
      setIsApproving(false);
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

      // Check allowance for cUSD
      const allowance = (await (publicClient.readContract as any)({
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

      // For boost we do a direct cUSD transfer to platform wallet
      const txHash = await walletClient.writeContract({
        address: CUSD_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve", // We'll use a simple transfer for boost
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, boostWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

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
          <p className="text-sm text-muted-foreground">Manage your profile, tipping, and preferences</p>
        </div>

        {/* Tip Configuration */}
        {isConnected && (
          <Card className="p-6 border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Tip Configuration</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set the amount you want to send each time you tap "Tip" on a profile. Tips are processed automatically by our relayer.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CELO_STABLES).map(([key, token]) => (
                      <SelectItem key={key} value={key}>{token.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Tip Amount per Tap ({tokenInfo.symbol})</Label>
                <div className="flex gap-2 mt-1">
                  {["0.1", "0.5", "1"].map((preset) => (
                    <Button
                      key={preset}
                      variant={tipAmount === preset ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setTipAmount(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="mt-2 text-center text-lg font-bold"
                  placeholder="0.10"
                />
              </div>

              <Button onClick={handleSaveTipConfig} className="w-full" disabled={isSavingTip}>
                {isSavingTip ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Save Tip Config</>
                )}
              </Button>

              {tipConfig && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p className="text-primary font-medium">✓ Active: {tipConfig.amount} {tipConfig.token_symbol} per tip</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Token Approval */}
        {isConnected && (
          <Card className="p-6 border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Token Approval</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Approve {tokenInfo.symbol} so our relayer can send tips on your behalf. You control how much to approve.
            </p>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current allowance</span>
                <span className="font-medium text-foreground">{(contractAllowance || 0).toFixed(2)} {tokenInfo.symbol}</span>
              </div>

              <div>
                <Label className="text-sm font-medium">Approve Amount ({tokenInfo.symbol})</Label>
                <div className="flex gap-2 mt-1">
                  {["5", "10", "50", "100"].map((preset) => (
                    <Button
                      key={preset}
                      variant={approvalAmount === preset ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setApprovalAmount(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  className="mt-2 text-center text-lg font-bold"
                />
              </div>

              <Button onClick={handleApproveTokens} className="w-full" disabled={isApproving}>
                {isApproving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Approving...</>
                ) : (
                  <>Approve {approvalAmount} {tokenInfo.symbol}</>
                )}
              </Button>
            </div>
          </Card>
        )}

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
              <AccordionTrigger className="text-sm">How does tipping work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                1. Set your tip amount in Settings. 2. Approve tokens for the contract. 3. Tap "Tip" on any profile — the relayer sends the tip automatically. A 5% platform fee is deducted.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger className="text-sm">What is the relayer?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The relayer is a backend signer that executes tips on your behalf. You approve tokens once, then every "Tip" tap triggers the relayer to send the configured amount from your wallet.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger className="text-sm">What tokens are supported?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                CeloTip supports Celo stablecoins: cUSD, cEUR, and cREAL. Choose your preferred token in the tip configuration above.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger className="text-sm">What is boosting?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Boosting costs {BOOST_PRICE_CUSD} cUSD and features your profile at the top of the homepage for 24 hours, giving you maximum visibility.
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
