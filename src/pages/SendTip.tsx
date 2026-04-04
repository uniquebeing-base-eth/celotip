
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TokenSelector } from "@/components/TokenSelector";
import { TOKEN_ADDRESSES, CELOTIP_CONTRACT_ADDRESS, CELOTIP_ABI, ERC20_ABI } from "@/lib/contracts";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { useQuery } from "@tanstack/react-query";
import { 
  Send, ChevronDown, Loader2, CheckCircle2, ArrowLeft, Wallet 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const BALANCE_ABI = [
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

const AVAILABLE_TOKENS: Token[] = [
  { symbol: "cUSD", name: "Celo Dollar", address: TOKEN_ADDRESSES.cUSD, balance: "0.00" },
  { symbol: "CELO", name: "Celo", address: TOKEN_ADDRESSES.CELO, balance: "0.00" },
  { symbol: "cEUR", name: "Celo Euro", address: TOKEN_ADDRESSES.cEUR, balance: "0.00" },
  { symbol: "cREAL", name: "Celo Real", address: TOKEN_ADDRESSES.cREAL, balance: "0.00" },
];

const QUICK_AMOUNTS = ["0.50", "1.00", "5.00", "10.00"];

const SendTip = () => {
  const navigate = useNavigate();
  const { walletAddress, fid, isConnected, getProvider } = useWalletAuth();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("1.00");
  const [selectedToken, setSelectedToken] = useState<Token>(AVAILABLE_TOKENS[0]);
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  // Fetch token balances
  const { data: tokenBalances } = useQuery({
    queryKey: ["sendTokenBalances", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return {};
      const balances: Record<string, string> = {};
      for (const token of AVAILABLE_TOKENS) {
        try {
          const bal = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          });
          const decimals = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: BALANCE_ABI,
            functionName: "decimals",
          });
          balances[token.address] = formatUnits(bal, decimals);
        } catch {
          balances[token.address] = "0";
        }
      }
      return balances;
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });

  const getTokenWithBalance = (t: Token): Token => ({
    ...t,
    balance: `${parseFloat(tokenBalances?.[t.address] || "0").toFixed(2)} ${t.symbol}`,
  });

  const currentBalance = parseFloat(tokenBalances?.[selectedToken.address] || "0");

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSend = async () => {
    if (!walletAddress || !fid) return;
    
    if (!isValidAddress(recipientAddress)) {
      toast({ title: "Invalid Address", description: "Please enter a valid Celo wallet address.", variant: "destructive" });
      return;
    }

    if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
      toast({ title: "Can't tip yourself", description: "Enter a different recipient address.", variant: "destructive" });
      return;
    }

    const tipAmount = parseFloat(amount);
    if (tipAmount <= 0 || tipAmount > currentBalance) {
      toast({ title: "Invalid Amount", description: tipAmount > currentBalance ? "Insufficient balance." : "Enter a valid amount.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error("No wallet provider available");

      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
      });

      // First approve the token to the contract
      const decimals = await publicClient.readContract({
        address: selectedToken.address as `0x${string}`,
        abi: BALANCE_ABI,
        functionName: "decimals",
      });
      const amountInWei = parseUnits(amount, decimals);

      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: selectedToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress as `0x${string}`, CELOTIP_CONTRACT_ADDRESS as `0x${string}`],
      });

      if ((currentAllowance as bigint) < amountInWei) {
        // Need to approve first
        const approveTx = await walletClient.writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, amountInWei],
          account: walletAddress as `0x${string}`,
          chain: celo,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Look up or create recipient profile
      const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
        p_wallet_address: recipientAddress.toLowerCase(),
      });

      // Send the tip via the contract
      const txHash = await walletClient.writeContract({
        address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
        abi: CELOTIP_ABI,
        functionName: "sendTip",
        args: [
          walletAddress as `0x${string}`,
          recipientAddress as `0x${string}`,
          selectedToken.address as `0x${string}`,
          amountInWei,
          "direct",
          "",
        ],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === "success") {
        // Record in DB
        await supabase.from("transactions").insert({
          from_fid: fid,
          to_fid: recipientFid || 0,
          amount: tipAmount,
          token_address: selectedToken.address,
          token_symbol: selectedToken.symbol,
          interaction_type: "direct",
          status: "completed",
          tx_hash: txHash,
        });

        setTxSuccess(txHash);
        toast({ title: "Tip Sent! 🎉", description: `${amount} ${selectedToken.symbol} sent successfully.` });
      } else {
        throw new Error("Transaction reverted");
      }
    } catch (error: any) {
      console.error("Send tip failed:", error);
      toast({ title: "Transaction Failed", description: error.shortMessage || error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (txSuccess) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tip Sent!</h2>
            <p className="text-muted-foreground mb-2">
              {amount} {selectedToken.symbol} sent to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
            </p>
            <a
              href={`https://celoscan.io/tx/${txSuccess}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline mb-6 block"
            >
              View on Celoscan →
            </a>
            <div className="flex gap-3">
              <Button onClick={() => { setTxSuccess(null); setRecipientAddress(""); setAmount("1.00"); }} variant="outline" className="flex-1">
                Send Another
              </Button>
              <Button onClick={() => navigate("/")} className="flex-1 bg-gradient-primary hover:opacity-90">
                Back Home
              </Button>
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
            <p className="text-sm text-muted-foreground">Send tokens to any Celo address</p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
            <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Connect your wallet to send tips</p>
          </Card>
        ) : (
          <Card className="p-6 bg-gradient-card border-border shadow-card space-y-5">
            {/* Recipient */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Recipient Address</Label>
              <Input
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`font-mono text-sm ${recipientAddress && !isValidAddress(recipientAddress) ? 'border-destructive' : ''}`}
              />
              {recipientAddress && !isValidAddress(recipientAddress) && (
                <p className="text-xs text-destructive mt-1">Enter a valid Celo address</p>
              )}
            </div>

            {/* Token Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Token</Label>
              <button
                onClick={() => setTokenSelectorOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="text-xs font-bold text-primary">
                      {selectedToken.symbol.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground">{selectedToken.symbol}</span>
                    <p className="text-xs text-muted-foreground">Balance: {currentBalance.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-2xl font-bold h-14"
                placeholder="0.00"
              />
              {parseFloat(amount) > currentBalance && (
                <p className="text-xs text-destructive mt-1">Exceeds your balance</p>
              )}
              
              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {QUICK_AMOUNTS.map(qa => (
                  <Button
                    key={qa}
                    variant={amount === qa ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setAmount(qa)}
                  >
                    {qa}
                  </Button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {recipientAddress && isValidAddress(recipientAddress) && parseFloat(amount) > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sending</span>
                  <span className="font-medium text-foreground">{amount} {selectedToken.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono text-xs text-foreground">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground">Celo</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSend}
              className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90"
              disabled={isSending || !isValidAddress(recipientAddress) || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send {amount} {selectedToken.symbol}
                </>
              )}
            </Button>
          </Card>
        )}
      </main>

      <TokenSelector
        open={tokenSelectorOpen}
        onClose={() => setTokenSelectorOpen(false)}
        onSelectToken={(t) => { setSelectedToken(t); setTokenSelectorOpen(false); }}
        selectedToken={selectedToken}
        tokens={AVAILABLE_TOKENS.map(getTokenWithBalance)}
      />

      <BottomNav />
    </div>
  );
};

export default SendTip;
