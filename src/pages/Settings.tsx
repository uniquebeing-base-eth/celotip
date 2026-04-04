
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, HelpCircle, Plus, Minus, ChevronDown, Loader2, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TokenSelector } from "@/components/TokenSelector";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { TOKEN_ADDRESSES, CELOTIP_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { useQuery } from "@tanstack/react-query";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

const publicClient = createPublicClient({ chain: celo, transport: http() });

const ERC20_BALANCE_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
] as const;

const AVAILABLE_TOKENS: Token[] = [
  { symbol: "cUSD", name: "Celo Dollar", address: TOKEN_ADDRESSES.cUSD, balance: "0.00" },
  { symbol: "CELO", name: "Celo", address: TOKEN_ADDRESSES.CELO, balance: "0.00" },
  { symbol: "cEUR", name: "Celo Euro", address: TOKEN_ADDRESSES.cEUR, balance: "0.00" },
  { symbol: "cREAL", name: "Celo Real", address: TOKEN_ADDRESSES.cREAL, balance: "0.00" },
];

const Settings = () => {
  const { walletAddress } = useWallet();
  const { isConnected, walletSource } = useWalletAuth();
  const [approvalToken, setApprovalToken] = useState<Token>(AVAILABLE_TOKENS[0]);
  const [approvalTokenSelectorOpen, setApprovalTokenSelectorOpen] = useState(false);
  const { allowance, approve, isApproving, revoke, isRevoking } = useTokenApproval(approvalToken.address, approvalToken.symbol);
  const [approvalAmount, setApprovalAmount] = useState("10.00");

  const { data: tokenBalances } = useQuery({
    queryKey: ["settingsTokenBalances", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return {};
      const balances: Record<string, string> = {};
      for (const token of AVAILABLE_TOKENS) {
        try {
          const balance = await (publicClient.readContract as any)({
            address: token.address as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          }) as bigint;
          const decimals = await (publicClient.readContract as any)({
            address: token.address as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: "decimals",
          }) as number;
          balances[token.address] = formatUnits(balance, decimals);
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

  const approvalTokenBalance = parseFloat(tokenBalances?.[approvalToken.address] || "0");

  const handleApprovalTokenSelect = (token: Token) => {
    setApprovalToken(token);
    const newBalance = parseFloat(tokenBalances?.[token.address] || "0");
    if (parseFloat(approvalAmount) > newBalance) {
      setApprovalAmount(newBalance.toFixed(2));
    }
    setApprovalTokenSelectorOpen(false);
  };

  const handleIncreaseAllowance = async () => {
    const amount = parseFloat(approvalAmount);
    if (amount > approvalTokenBalance) {
      toast({ title: "Insufficient Balance", description: `You only have ${approvalTokenBalance.toFixed(2)} ${approvalToken.symbol}.`, variant: "destructive" });
      return;
    }
    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Enter an amount greater than 0.", variant: "destructive" });
      return;
    }
    try {
      await approve(approvalAmount);
      toast({ title: "Approval Successful", description: `Approved ${approvalAmount} ${approvalToken.symbol} for CeloTip.` });
    } catch (error: any) {
      toast({ title: "Approval Failed", description: error.message || "Please try again.", variant: "destructive" });
    }
  };

  const handleRevokeApproval = async () => {
    try {
      await revoke();
      toast({ title: "Approval Revoked", description: "Token approval has been revoked." });
    } catch (error: any) {
      toast({ title: "Revoke Failed", description: error.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage approvals and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Connection Info */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-3">Connection</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${isConnected ? 'text-primary' : 'text-destructive'}`}>
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium text-foreground capitalize">{walletSource || "—"}</span>
              </div>
              {walletAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <a 
                    href={`https://celoscan.io/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary flex items-center gap-1"
                  >
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract</span>
                <a 
                  href={`https://celoscan.io/address/${CELOTIP_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary flex items-center gap-1"
                >
                  {CELOTIP_CONTRACT_ADDRESS.slice(0, 6)}...{CELOTIP_CONTRACT_ADDRESS.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </Card>

          {/* Token Approval */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Token Approval</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Approve a spending limit so the CeloTip contract can send tips on your behalf. Revoke anytime.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Select Token</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Balance: {approvalTokenBalance.toFixed(2)} {approvalToken.symbol}
                </p>
                <button
                  onClick={() => setApprovalTokenSelectorOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 bg-primary/10">
                      <AvatarFallback className="text-xs font-semibold text-primary">
                        {approvalToken.symbol.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{approvalToken.symbol}</span>
                    <span className="text-xs text-muted-foreground">({approvalToken.name})</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div>
                <Label className="text-sm font-medium">Spending Limit</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Current allowance: {allowance ? parseFloat(allowance).toFixed(2) : "0.00"} {approvalToken.symbol}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setApprovalAmount(prev => Math.max(0, parseFloat(prev) - 10).toFixed(2))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    step="10"
                    value={approvalAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setApprovalAmount(val > approvalTokenBalance ? approvalTokenBalance.toFixed(2) : e.target.value);
                    }}
                    className="flex-1 text-center"
                  />
                  <Button variant="outline" onClick={() => setApprovalAmount(prev => Math.min(parseFloat(prev) + 10, approvalTokenBalance).toFixed(2))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleIncreaseAllowance} 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isApproving || isRevoking || parseFloat(approvalAmount) > approvalTokenBalance || parseFloat(approvalAmount) <= 0}
                >
                  {isApproving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Approving...</> : "Approve"}
                </Button>
                <Button 
                  onClick={handleRevokeApproval}
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isApproving || isRevoking || !allowance || parseFloat(allowance) === 0}
                >
                  {isRevoking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Revoking...</> : "Revoke"}
                </Button>
              </div>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">FAQ</h3>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm">How does CeloTip work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  CeloTip lets you send tips to anyone on the Celo network. Simply enter a wallet address, choose a token and amount, and send. Tips are processed through our secure smart contract.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">What tokens can I use?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can tip with CELO, cUSD (Celo Dollar), cEUR (Celo Euro), and cREAL (Celo Real). All are native Celo stablecoins with low transaction fees.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm">What is token approval?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Token approval sets a spending limit for the CeloTip smart contract. This allows it to send tips on your behalf without needing to approve each transaction. You can revoke this permission anytime.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">Is my money safe?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! CeloTip uses a verified smart contract on Celo. You control your spending limits and can revoke access anytime. The contract is open-source and auditable on Celoscan.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-sm">Works with MiniPay?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! CeloTip is optimized for MiniPay, the Celo-native wallet in Opera Mini. It auto-detects MiniPay and uses it as the primary wallet provider for seamless transactions.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <TokenSelector
        open={approvalTokenSelectorOpen}
        onClose={() => setApprovalTokenSelectorOpen(false)}
        onSelectToken={handleApprovalTokenSelect}
        selectedToken={approvalToken}
        tokens={AVAILABLE_TOKENS.map(getTokenWithBalance)}
      />

      <BottomNav />
    </div>
  );
};

export default Settings;
