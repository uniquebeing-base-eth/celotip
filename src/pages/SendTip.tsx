import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CELOTIP_CONTRACT_ADDRESS, CELOTIP_ABI, CUSD_ADDRESS, ERC20_ABI, PLATFORM_FEE_BPS } from "@/lib/contracts";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, CheckCircle2, ArrowLeft, Wallet, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const publicClient = createPublicClient({ chain: celo, transport: http() });

const QUICK_AMOUNTS = ["0.10", "0.50", "1.00", "5.00"];

const SendTip = () => {
  const navigate = useNavigate();
  const { walletAddress, fid, isConnected, getProvider } = useWalletAuth();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [isSending, setIsSending] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  // Fetch cUSD balance
  const { data: balance } = useQuery({
    queryKey: ["cusdBalance", walletAddress],
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

  const currentBalance = balance || 0;
  const fee = (parseFloat(amount || "0") * PLATFORM_FEE_BPS) / 10000;
  const recipientGets = parseFloat(amount || "0") - fee;
  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSend = async () => {
    if (!walletAddress || !fid) return;

    if (!isValidAddress(recipientAddress)) {
      toast({ title: "Invalid Address", description: "Enter a valid Celo wallet address.", variant: "destructive" });
      return;
    }
    if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
      toast({ title: "Can't tip yourself", variant: "destructive" });
      return;
    }

    const tipAmount = parseFloat(amount);
    if (tipAmount <= 0 || tipAmount > currentBalance) {
      toast({ title: "Invalid Amount", description: tipAmount > currentBalance ? "Insufficient cUSD." : "Enter a valid amount.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error("No wallet provider");

      const walletClient = createWalletClient({ chain: celo, transport: custom(provider) });
      const amountWei = parseUnits(amount, 18);

      // Check allowance
      const currentAllowance = (await (publicClient.readContract as any)({
        address: CUSD_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress as `0x${string}`, CELOTIP_CONTRACT_ADDRESS as `0x${string}`],
      })) as bigint;

      if (currentAllowance < amountWei) {
        const approveTx = await walletClient.writeContract({
          address: CUSD_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, amountWei],
          account: walletAddress as `0x${string}`,
          chain: celo,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Send tip
      const txHash = await walletClient.writeContract({
        address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
        abi: CELOTIP_ABI,
        functionName: "tip",
        args: [recipientAddress as `0x${string}`, amountWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === "success") {
        const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
          p_wallet_address: recipientAddress.toLowerCase(),
        });

        await supabase.from("transactions").insert({
          from_fid: fid,
          to_fid: recipientFid || 0,
          amount: tipAmount,
          token_address: CUSD_ADDRESS,
          token_symbol: "cUSD",
          interaction_type: "direct",
          status: "completed",
          tx_hash: txHash,
        });

        setTxSuccess(txHash);
        toast({ title: "Tip Sent! 🎉", description: `${amount} cUSD sent successfully.` });
      } else {
        throw new Error("Transaction reverted");
      }
    } catch (error: any) {
      console.error("Send tip failed:", error);
      toast({ title: "Failed", description: error.shortMessage || error.message, variant: "destructive" });
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
              {amount} cUSD → {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
            </p>
            <a href={`https://celoscan.io/tx/${txSuccess}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline mb-6 block">
              View on Celoscan →
            </a>
            <div className="flex gap-3">
              <Button onClick={() => { setTxSuccess(null); setRecipientAddress(""); setAmount("1.00"); }} variant="outline" className="flex-1">Send Another</Button>
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
            <h2 className="text-2xl font-bold text-foreground">Send cUSD</h2>
            <p className="text-sm text-muted-foreground">Tip any wallet address directly</p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="p-8 text-center border-border shadow-card">
            <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Connect your wallet to send tips</p>
          </Card>
        ) : (
          <Card className="p-6 border-border shadow-card space-y-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Recipient Address</Label>
              <Input
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`font-mono text-sm ${recipientAddress && !isValidAddress(recipientAddress) ? "border-destructive" : ""}`}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm font-medium">Amount (cUSD)</Label>
                <span className="text-xs text-muted-foreground">Balance: {currentBalance.toFixed(2)} cUSD</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-2xl font-bold h-14"
                placeholder="0.00"
              />
              <div className="flex gap-2 mt-3">
                {QUICK_AMOUNTS.map((qa) => (
                  <Button key={qa} variant={amount === qa ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setAmount(qa)}>
                    {qa}
                  </Button>
                ))}
              </div>
            </div>

            {recipientAddress && isValidAddress(recipientAddress) && parseFloat(amount) > 0 && (
              <div className="p-4 bg-secondary/50 border border-border rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient gets</span>
                  <span className="font-medium text-foreground">{recipientGets.toFixed(4)} cUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({PLATFORM_FEE_BPS / 100}%)</span>
                  <span className="text-muted-foreground">{fee.toFixed(4)} cUSD</span>
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
              disabled={isSending || !isValidAddress(recipientAddress) || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance}
            >
              {isSending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sending...</>
              ) : (
                <><DollarSign className="h-5 w-5 mr-2" />Send {amount} cUSD</>
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
