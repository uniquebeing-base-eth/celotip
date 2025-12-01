import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Heart, MessageCircle, Repeat2, Quote, Zap, Shield, HelpCircle, Plus, Minus, ChevronDown, UserPlus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TokenSelector } from "@/components/TokenSelector";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { TOKEN_ADDRESSES } from "@/lib/contracts";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

interface TipConfig {
  enabled: boolean;
  amount: string;
  token: Token;
}

interface SuperTipConfig {
  phrase: string;
  amount: string;
  token: Token;
}

const DEFAULT_TOKEN: Token = {
  symbol: "cUSD",
  name: "Celo Dollar",
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  balance: "$45.50",
};

const Settings = () => {
  const { allowance, approve, isApproving, revoke, isRevoking } = useTokenApproval(TOKEN_ADDRESSES.cUSD, "cUSD");
  
  const [tipConfigs, setTipConfigs] = useState<Record<string, TipConfig>>({
    like: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    comment: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    recast: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    quote: { enabled: false, amount: "2000", token: DEFAULT_TOKEN },
    follow: { enabled: false, amount: "2000", token: DEFAULT_TOKEN },
  });

  const [superTip, setSuperTip] = useState<SuperTipConfig>({
    phrase: "CELO",
    amount: "20.00",
    token: DEFAULT_TOKEN,
  });

  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string | null>(null);
  const [approvalAmount, setApprovalAmount] = useState("100.00");

  const handleTokenSelect = (token: Token) => {
    if (selectedConfigKey) {
      if (selectedConfigKey === "super-tip") {
        setSuperTip(prev => ({ ...prev, token }));
      } else {
        setTipConfigs(prev => ({
          ...prev,
          [selectedConfigKey]: { ...prev[selectedConfigKey], token },
        }));
      }
    }
  };

  const openTokenSelector = (configKey: string) => {
    setSelectedConfigKey(configKey);
    setTokenSelectorOpen(true);
  };

  const updateAmount = (key: string, delta: number) => {
    setTipConfigs(prev => ({
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
    setTipConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your tipping preferences have been updated.",
    });
  };

  const handleIncreaseAllowance = async () => {
    try {
      await approve(approvalAmount);
      toast({
        title: "Approval Successful",
        description: `Approved ${approvalAmount} cUSD for CeloTip smart contract.`,
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
              {Object.entries(tipConfigs).map(([key, config]) => (
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
                      <p className="text-xs text-muted-foreground mb-2">status</p>
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
                      value={`$${config.amount}`}
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
                          setTipConfigs(prev => ({
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

            <Button onClick={handleSave} className="w-full mt-6 bg-gradient-primary hover:opacity-90 transition-opacity">
              All Changes Saved
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
              <div>
                <Label htmlFor="allowance" className="text-sm font-medium">Set spending limit</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Current allowance: {allowance ? parseFloat(allowance).toFixed(2) : "0.00"} cUSD
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
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    className="flex-1 text-center"
                  />
                  <Button variant="outline" onClick={() => setApprovalAmount((prev) => (parseFloat(prev) + 10).toFixed(2))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleIncreaseAllowance} 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isApproving || isRevoking}
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
                <Button 
                  onClick={handleRevokeApproval}
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isApproving || isRevoking || !allowance || parseFloat(allowance) === 0}
                >
                  {isRevoking ? "Revoking..." : "Revoke Approval"}
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
                    value={`$${superTip.amount}`}
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
                  and amount <span className="font-semibold text-foreground">${superTip.amount}</span>, 
                  when you comment or quote containing this phrase, it will automatically tip the creator 
                  ${superTip.amount} instead of your normal tip amount.
                </p>
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
                <AccordionTrigger className="text-sm">How does tipping work?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  CeloTip automatically tips creators when you interact with their casts on Farcaster. 
                  Simply like, comment, recast, or quote their content, and your configured tip amount 
                  in cUSD (or your chosen token) will be sent automatically.
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
                <AccordionTrigger className="text-sm">How do I configure tip amounts?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Use the "Set tipping amount" section above to configure how much you want to tip 
                  for each interaction type. You can choose different tokens (cUSD, CELO, or custom 
                  ERC20 tokens on Celo) and set different amounts for likes, comments, recasts, quotes, and follows.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">What is a Super Tip?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Super Tip lets you set a special phrase (like "CELO") and a larger tip amount. 
                  When you comment or quote a cast containing that phrase, it will automatically 
                  send the super tip amount instead of your normal tip amount. This is perfect for 
                  showing extra appreciation to creators!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-sm">What is programmatic tipping approval?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  To enable automatic tipping, you need to approve a spending limit for the CeloTip 
                  smart contract. This allows the contract to automatically send tips on your behalf 
                  when you interact with casts. You can increase, decrease, or revoke this approval 
                  at any time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-sm">Can I use tokens other than cUSD?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! CeloTip supports any ERC20 token on the Celo network. You can choose cUSD (stablecoin), 
                  CELO (native token), or add custom token contracts. All tip displays show values in cUSD 
                  for consistency, but you can tip with any token you prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <BottomNav />
      <TokenSelector
        open={tokenSelectorOpen}
        onClose={() => setTokenSelectorOpen(false)}
        onSelectToken={handleTokenSelect}
      />
    </div>
  );
};

export default Settings;
