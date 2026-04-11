import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, CheckCircle2, ArrowLeft, Wallet, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SendTip = () => {
  const navigate = useNavigate();
  const { walletAddress, fid, isConnected } = useWalletAuth();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

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

  const amount = tipConfig?.amount || 0;
  const tokenSymbol = tipConfig?.token_symbol || "cUSD";
  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSend = async () => {
    if (!walletAddress || !fid) return;

    if (!tipConfig) {
      toast({ title: "Set up tipping first", description: "Go to Settings to configure your tip amount.", variant: "destructive" });
      return;
    }

    if (!isValidAddress(recipientAddress)) {
      toast({ title: "Invalid Address", description: "Enter a valid Celo wallet address.", variant: "destructive" });
      return;
    }
    if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
      toast({ title: "Can't tip yourself", variant: "destructive" });
      return;
    }

    setIsSending(true);
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

      setTxSuccess(data.txHash);
      toast({ title: "Tip Sent! 🎉", description: `${amount} ${tokenSymbol} sent successfully.` });
    } catch (error: any) {
      console.error("Send tip failed:", error);
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (txSuccess) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center border-border shadow-card">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tip Sent!</h2>
            <p className="text-muted-foreground mb-2">
              {amount} {tokenSymbol} → {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
            </p>
            <a href={`https://celoscan.io/tx/${txSuccess}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline mb-6 block">
              View on Celoscan →
            </a>
            <div className="flex gap-3">
              <Button onClick={() => { setTxSuccess(null); setRecipientAddress(""); }} variant="outline" className="flex-1">Send Another</Button>
              <Button onClick={() => navigate("/")} className="flex-1">Back Home</Button>
            </div>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Send Tip</h2>
            <p className="text-sm text-muted-foreground">Tip any wallet address directly</p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="p-8 text-center border-border shadow-card">
            <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Connect your wallet to send tips</p>
          </Card>
        ) : !tipConfig ? (
          <Card className="p-6 text-center border-border shadow-card">
            <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No tip config set</p>
            <p className="text-xs text-muted-foreground mb-4">Set your tip amount and approve tokens in Settings first.</p>
            <Button onClick={() => navigate("/settings")} variant="outline">Go to Settings</Button>
          </Card>
        ) : (
          <Card className="p-6 border-border shadow-card space-y-5">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-center">
              <p className="text-primary font-medium">Tip: {tipConfig.amount} {tipConfig.token_symbol} per tap</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Recipient Address</Label>
              <Input
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`font-mono text-sm ${recipientAddress && !isValidAddress(recipientAddress) ? "border-destructive" : ""}`}
              />
            </div>

            {recipientAddress && isValidAddress(recipientAddress) && (
              <div className="p-4 bg-secondary/50 border border-border rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sending</span>
                  <span className="font-medium text-foreground">{amount} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono text-xs text-foreground">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSend}
              className="w-full h-14 text-lg"
              disabled={isSending || !isValidAddress(recipientAddress)}
            >
              {isSending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sending...</>
              ) : (
                <><DollarSign className="h-5 w-5 mr-2" />Send {amount} {tokenSymbol}</>
              )}
            </Button>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default SendTip;
