
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Heart, MessageCircle, Repeat2, Quote, Zap, Shield, HelpCircle, Plus, Minus, ChevronDown, UserPlus, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TokenSelector } from "@/components/TokenSelector";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { useTipConfig } from "@/hooks/useTipConfig";
import { TOKEN_ADDRESSES } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { useQuery } from "@tanstack/react-query";


interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}


interface LocalTipConfig {
  enabled: boolean;
  amount: string;
  token: Token;
}

interface SuperTipConfigLocal {
  phrase: string;
  amount: string;
  token: Token;
}

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const ERC20_BALANCE_ABI = [
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

const Settings = () => {
  const { walletAddress } = useWallet();
  const [approvalToken, setApprovalToken] = useState<Token>(AVAILABLE_TOKENS[0]);
  const [approvalTokenSelectorOpen, setApprovalTokenSelectorOpen] = useState(false);
  const { allowance, approve, isApproving, revoke, isRevoking } = useTokenApproval(approvalToken.address, approvalToken.symbol);
  const { tipConfigs: dbTipConfigs, superTipConfig: dbSuperTipConfig, isLoading: isLoadingConfigs, upsertTipConfig, upsertSuperTipConfig } = useTipConfig();

  // Fetch real token balances
  const { data: tokenBalances } = useQuery({
    queryKey: ["tokenBalances", walletAddress],
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
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          balances[token.address] = "0";
        }
      }
      
      return balances;
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });

  const getTokenWithBalance = (baseToken: Token): Token => {
    const balance = tokenBalances?.[baseToken.address] || "0";
    return {
      ...baseToken,
      balance: `$${parseFloat(balance).toFixed(2)}`,
    };
  };

  const DEFAULT_TOKEN = getTokenWithBalance(AVAILABLE_TOKENS[0]);

  const [localTipConfigs, setLocalTipConfigs] = useState<Record<string, LocalTipConfig>>({
    like: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    comment: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    recast: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    quote: { enabled: false, amount: "0.50", token: DEFAULT_TOKEN },
    follow: { enabled: false, amount: "1.00", token: DEFAULT_TOKEN },
  });

  const [superTip, setSuperTip] = useState<SuperTipConfigLocal>({
    phrase: "CELO",
    amount: "5.00",
    token: DEFAULT_TOKEN,
  });

  // Load configs from database
  useEffect(() => {
    if (dbTipConfigs && dbTipConfigs.length > 0) {
      const configMap: Record<string, LocalTipConfig> = { ...localTipConfigs };
      
      dbTipConfigs.forEach(config => {
        const token = AVAILABLE_TOKENS.find(t => t.address.toLowerCase() === config.token_address.toLowerCase()) || AVAILABLE_TOKENS[0];
        configMap[config.interaction_type] = {
          enabled: config.is_enabled,
          amount: config.amount.toString(),
          token: getTokenWithBalance(token),
        };
      });
      
      setLocalTipConfigs(configMap);
    }
  }, [dbTipConfigs, tokenBalances]);

  useEffect(() => {
    if (dbSuperTipConfig) {
      const token = AVAILABLE_TOKENS.find(t => t.address.toLowerCase() === dbSuperTipConfig.token_address.toLowerCase()) || AVAILABLE_TOKENS[0];
      setSuperTip({
        phrase: dbSuperTipConfig.trigger_phrase,
        amount: dbSuperTipConfig.amount.toString(),
        token: getTokenWithBalance(token),
      });
    }
  }, [dbSuperTipConfig, tokenBalances]);

  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string | null>(null);
  const [isSavingSuperTip, setIsSavingSuperTip] = useState(false);
  const [approvalAmount, setApprovalAmount] = useState("10.00");
  const [isSaving, setIsSaving] = useState(false);

  // Get the balance for the approval token
  const approvalTokenBalance = parseFloat(tokenBalances?.[approvalToken.address] || "0");

  // Handle approval token selection
  const handleApprovalTokenSelect = (token: Token) => {
    setApprovalToken(token);
    // Reset amount to not exceed new token balance
    const newBalance = parseFloat(tokenBalances?.[token.address] || "0");
    if (parseFloat(approvalAmount) > newBalance) {
      setApprovalAmount(newBalance.toFixed(2));
    }
    setApprovalTokenSelectorOpen(false);
  };

  const handleTokenSelect = (token: Token) => {
    const tokenWithBalance = getTokenWithBalance(token);
    if (selectedConfigKey) {
      if (selectedConfigKey === "super-tip") {
        setSuperTip(prev => ({ ...prev, token: tokenWithBalance }));
      } else {
        setLocalTipConfigs(prev => ({
          ...prev,
          [selectedConfigKey]: { ...prev[selectedConfigKey], token: tokenWithBalance },
        }));
      }
    }
  };

  const openTokenSelector = (configKey: string) => {
    setSelectedConfigKey(configKey);
    setTokenSelectorOpen(true);
  };

  const updateAmount = (key: string, delta: number) => {
    setLocalTipConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        amount: Math.max(0, parseFloat(prev[key].amount) + delta).toFixed(2),
      },
    }));
  };

  const updateSuperTipAmount = (delta: number) => {
    setSuperTip(prev => ({
      ...prev,
      amount: Math.max(0, parseFloat(prev.amount) + delta).toFixed(2),
    }));
  };

  const toggleConfig = (key: string) => {
    setLocalTipConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all tip configs
      for (const [key, config] of Object.entries(localTipConfigs)) {
        await upsertTipConfig.mutateAsync({
          fid: 0, // Will be set by the hook
          interaction_type: key as "like" | "comment" | "recast" | "quote" | "follow",
          token_address: config.token.address,
          token_symbol: config.token.symbol,
          amount: parseFloat(config.amount),
          is_enabled: config.enabled,
        });
      }

      toast({
        title: "Settings Saved",
        description: "Your tipping preferences have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSuperTip = async () => {
    if (!superTip.phrase.trim()) {
      toast({
        title: "Missing Phrase",
        description: "Please enter a trigger phrase for your super tip.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingSuperTip(true);
    try {
      await upsertSuperTipConfig.mutateAsync({
        trigger_phrase: superTip.phrase,
        token_address: superTip.token.address,
        token_symbol: superTip.token.symbol,
        amount: parseFloat(superTip.amount),
        is_enabled: true,
      });

      toast({
        title: "Super Tip Saved",
        description: `Super tip with phrase "${superTip.phrase}" saved successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSuperTip(false);
    }
  };

  const handleIncreaseAllowance = async () => {
    const amount = parseFloat(approvalAmount);
    
    // Validate amount doesn't exceed balance
    if (amount > approvalTokenBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${approvalTokenBalance.toFixed(2)} ${approvalToken.symbol}. Please enter a lower amount.`,
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      await approve(approvalAmount);
      toast({
        title: "Approval Successful",
        description: `Approved ${approvalAmount} ${approvalToken.symbol} for CeloTip smart contract.`,
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeApproval = async () => {
    try {
      await revoke();
      toast({
        title: "Approval Revoked",
        description: "Token approval has been revoked successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Revoke Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const interactionIcons = {
    like: <Heart className="h-5 w-5 text-red-500" />,
    comment: <MessageCircle className="h-5 w-5 text-blue-500" />,
    recast: <Repeat2 className="h-5 w-5 text-green-500" />,
    quote: <Quote className="h-5 w-5 text-purple-500" />,
    follow: <UserPlus className="h-5 w-5 text-orange-500" />,
  };

  if (isLoadingConfigs) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your tipping preferences</p>
        </div>

        <div className="space-y-6">
          {/* Tip Configuration */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Set tipping amount</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Pick any ERC20 token & set the tip amount for each interaction - like, comment, recast, quote cast or follow.
            </p>

            <div className="space-y-6">
              {Object.entries(localTipConfigs).map(([key, config]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {interactionIcons[key as keyof typeof interactionIcons]}
                      <Label className="text-sm font-medium capitalize">{key}</Label>
                    </div>
                    <Switch checked={config.enabled} onCheckedChange={() => toggleConfig(key)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex gap-2">
                      <p className="text-xs text-muted-foreground mb-2">token</p>
                    </div>
                    <div className="flex gap-2">
                      <p className="text-xs text-muted-foreground mb-2">tip amount per {key}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openTokenSelector(key)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 bg-primary/10">
                          <AvatarFallback className="text-xs font-semibold text-primary">
                            {config.token.symbol.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{config.token.symbol}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <Input
                      type="text"
                      value={`${config.amount} ${config.token.symbol}`}
                      readOnly
                      className="text-center bg-muted border-border"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div></div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateAmount(key, -0.01)}
                        className="h-12 flex-1"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={config.amount}
                        onChange={(e) =>
                          setLocalTipConfigs(prev => ({
                            ...prev,
                            [key]: { ...prev[key], amount: e.target.value },
                          }))
                        }
                        className="text-center h-12 flex-1"
                        step="0.01"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateAmount(key, 0.01)}
                        className="h-12 flex-1"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {key !== "follow" && <Separator className="mt-6" />}
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full mt-6 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save All Changes"
              )}
            </Button>
          </Card>

          {/* Token Approval */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Allow Programmatic Tipping</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Approve a spending limit for CeloTip on Farcaster. When it runs out, top it up or revoke it anytime.
            </p>

            <div className="space-y-4">
              {/* Token Selector for Approval */}
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
                <Label htmlFor="allowance" className="text-sm font-medium">Set spending limit</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Current allowance: {allowance ? parseFloat(allowance).toFixed(2) : "0.00"} {approvalToken.symbol}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setApprovalAmount((prev) => Math.max(0, parseFloat(prev) - 10).toFixed(2))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="allowance"
                    type="number"
                    step="10"
                    value={approvalAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val > approvalTokenBalance) {
                        setApprovalAmount(approvalTokenBalance.toFixed(2));
                      } else {
                        setApprovalAmount(e.target.value);
                      }
                    }}
                    max={approvalTokenBalance}
                    className="flex-1 text-center"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setApprovalAmount((prev) => {
                      const newVal = parseFloat(prev) + 10;
                      return Math.min(newVal, approvalTokenBalance).toFixed(2);
                    })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {parseFloat(approvalAmount) > approvalTokenBalance && (
                  <p className="text-xs text-destructive mt-1">
                    Amount exceeds your balance of {approvalTokenBalance.toFixed(2)} {approvalToken.symbol}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleIncreaseAllowance} 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isApproving || isRevoking || parseFloat(approvalAmount) > approvalTokenBalance || parseFloat(approvalAmount) <= 0}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button 
                  onClick={handleRevokeApproval}
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isApproving || isRevoking || !allowance || parseFloat(allowance) === 0}
                >
                  {isRevoking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    "Revoke Approval"
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Configure Super Tip */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Configure Super Tip</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Set your phrase, choose a token, tip any amount — your super tip works for both comments and quotes.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="super-phrase" className="text-sm font-medium mb-2 block">
                  Super Tip Phrase
                </Label>
                <Input
                  id="super-phrase"
                  placeholder="Enter phrase (e.g. CELO)"
                  value={superTip.phrase}
                  onChange={(e) => setSuperTip(prev => ({ ...prev, phrase: e.target.value }))}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">
                  When you comment or quote with this phrase, it triggers the super tip amount instead of normal tip.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Token</Label>
                  <button
                    onClick={() => openTokenSelector("super-tip")}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 bg-primary/10">
                        <AvatarFallback className="text-xs font-semibold text-primary">
                          {superTip.token.symbol.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{superTip.token.symbol}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Super Tip Amount</Label>
                  <Input
                    type="text"
                    value={`${superTip.amount} ${superTip.token.symbol}`}
                    readOnly
                    className="text-center bg-muted border-border"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateSuperTipAmount(-1)}
                  className="h-12 flex-1"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={superTip.amount}
                  onChange={(e) => setSuperTip(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-center h-12 flex-[2]"
                  step="0.01"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateSuperTipAmount(1)}
                  className="h-12 flex-1"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Example: With phrase "<span className="font-semibold text-foreground">{superTip.phrase || "CELO"}</span>" 
                  and amount <span className="font-semibold text-foreground">{superTip.amount} {superTip.token.symbol}</span>, 
                  when you comment or quote containing this phrase, it will automatically tip the creator 
                  {superTip.amount} {superTip.token.symbol} instead of your normal tip amount.
                </p>
              </div>

              <Button 
                onClick={handleSaveSuperTip} 
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isSavingSuperTip}
              >
                {isSavingSuperTip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Super Tip...
                  </>
                ) : (
                  "Save Super Tip"
                )}
              </Button>
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
                <AccordionTrigger className="text-sm">How does tipping work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  CeloTip automatically tips creators when you interact with their casts on Farcaster. 
                  Simply like, comment, recast, or quote their content, and your configured tip amount 
                  will be sent automatically via our smart contract.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">What triggers automatic tips?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Tips are triggered by your interactions on Farcaster: liking a cast, commenting, 
                  recasting, quoting, or following a user. Each interaction type can have its own 
                  configured amount in cUSD or other Celo tokens.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm">How do I stop tipping?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can stop tipping at any time by clicking "Revoke Approval" above or by 
                  toggling off individual interaction types. Revoking approval removes permission for 
                  the CeloTip smart contract to transfer tokens on your behalf.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">Is my money safe?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! CeloTip uses a secure smart contract deployed on Celo. You only approve a specific 
                  spending limit, and you can revoke access anytime. The contract is open-source and 
                  verified on Celoscan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-sm">What is a Super Tip?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  A Super Tip is a special larger tip triggered when you include a specific phrase 
                  in your comment or quote. It lets you reward exceptional content with a bigger tip 
                  while keeping your regular tips smaller.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <TokenSelector
        open={tokenSelectorOpen}
        onClose={() => setTokenSelectorOpen(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={selectedConfigKey ? (selectedConfigKey === "super-tip" ? superTip.token : localTipConfigs[selectedConfigKey]?.token) : undefined}
        tokens={AVAILABLE_TOKENS.map(getTokenWithBalance)}
      />

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
