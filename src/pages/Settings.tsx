import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Repeat2, Quote, Zap, Shield, HelpCircle, Plus, Minus, ChevronDown, UserPlus, Wallet } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTipConfig } from "@/hooks/useTipConfig";
import { useWallet } from "@/hooks/useWallet";
import { useFarcasterAuth } from "@/hooks/useFarcasterAuth";

interface Token {
  symbol: string;
  name: string;
  address: string;
}

const DEFAULT_TOKENS: Token[] = [
  {
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  },
  {
    symbol: "CELO",
    name: "Celo Native Asset",
    address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  },
];

const Settings = () => {
  const { user, isLoading: isLoadingAuth } = useFarcasterAuth();
  const { tipConfigs, superTipConfig, isLoading: isLoadingConfigs, upsertTipConfig, upsertSuperTipConfig, deleteSuperTipConfig } = useTipConfig();
  const { address, balances, isLoadingBalances } = useWallet();

  // Local state for editing
  const [localConfigs, setLocalConfigs] = useState<Record<string, { amount: string; token: Token; enabled: boolean }>>({});
  const [localSuperTip, setLocalSuperTip] = useState({ phrase: "", amount: "", token: DEFAULT_TOKENS[0] });
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from database
  useEffect(() => {
    if (tipConfigs.length > 0) {
      const configMap: Record<string, { amount: string; token: Token; enabled: boolean }> = {};
      tipConfigs.forEach(config => {
        configMap[config.interaction_type] = {
          amount: config.amount.toString(),
          token: {
            symbol: config.token_symbol,
            name: config.token_symbol,
            address: config.token_address,
          },
          enabled: config.is_enabled,
        };
      });
      setLocalConfigs(configMap);
    } else {
      // Set defaults if no configs exist
      setLocalConfigs({
        like: { amount: "0.01", token: DEFAULT_TOKENS[0], enabled: true },
        comment: { amount: "0.01", token: DEFAULT_TOKENS[0], enabled: true },
        recast: { amount: "0.01", token: DEFAULT_TOKENS[0], enabled: false },
        quote: { amount: "0.01", token: DEFAULT_TOKENS[0], enabled: false },
        follow: { amount: "0.01", token: DEFAULT_TOKENS[0], enabled: false },
      });
    }
  }, [tipConfigs]);

  useEffect(() => {
    if (superTipConfig) {
      setLocalSuperTip({
        phrase: superTipConfig.trigger_phrase,
        amount: superTipConfig.amount.toString(),
        token: {
          symbol: superTipConfig.token_symbol,
          name: superTipConfig.token_symbol,
          address: superTipConfig.token_address,
        },
      });
    }
  }, [superTipConfig]);

  const updateAmount = (key: string, delta: number) => {
    setLocalConfigs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        amount: Math.max(0, parseFloat(prev[key]?.amount || "0") + delta).toFixed(2),
      },
    }));
    setHasChanges(true);
  };

  const toggleConfig = (key: string) => {
    setLocalConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key]?.enabled },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please open this app in Farcaster",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save all tip configs
      await Promise.all(
        Object.entries(localConfigs).map(([type, config]) =>
          upsertTipConfig.mutateAsync({
            interaction_type: type as any,
            token_address: config.token.address,
            token_symbol: config.token.symbol,
            amount: parseFloat(config.amount),
            is_enabled: config.enabled,
          })
        )
      );

      // Save super tip if configured
      if (localSuperTip.phrase && localSuperTip.amount) {
        await upsertSuperTipConfig.mutateAsync({
          trigger_phrase: localSuperTip.phrase,
          token_address: localSuperTip.token.address,
          token_symbol: localSuperTip.token.symbol,
          amount: parseFloat(localSuperTip.amount),
          is_enabled: true,
        });
      }

      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your tipping preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
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

  if (isLoadingAuth || isLoadingConfigs) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card className="p-6">
            <Skeleton className="h-20 mb-4" />
            <Skeleton className="h-32" />
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Please open this app in Farcaster to configure settings</p>
          </Card>
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
          {/* Wallet Info */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Connected Wallet</h3>
            </div>
            {address ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="text-sm font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
                </div>
                {isLoadingBalances ? (
                  <Skeleton className="h-20" />
                ) : balances.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Balances</p>
                    {balances.map((balance) => (
                      <div key={balance.symbol} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">{balance.symbol}</span>
                        <span className="text-sm">{balance.balance}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No wallet connected</p>
            )}
          </Card>

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
              {Object.entries(localConfigs).map(([key, config]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {interactionIcons[key as keyof typeof interactionIcons]}
                      <Label className="text-sm font-medium capitalize">{key}</Label>
                    </div>
                    <Switch 
                      checked={config?.enabled || false} 
                      onCheckedChange={() => toggleConfig(key)} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Token</p>
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background">
                        <Avatar className="h-6 w-6 bg-primary/10">
                          <AvatarFallback className="text-xs font-semibold text-primary">
                            {config?.token.symbol.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{config?.token.symbol}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Amount</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateAmount(key, -0.01)}
                          className="h-10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={config?.amount || "0"}
                          onChange={(e) => {
                            setLocalConfigs(prev => ({
                              ...prev,
                              [key]: { ...prev[key], amount: e.target.value },
                            }));
                            setHasChanges(true);
                          }}
                          className="text-center h-10"
                          step="0.01"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateAmount(key, 0.01)}
                          className="h-10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {key !== "follow" && <Separator className="mt-6" />}
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || upsertTipConfig.isPending}
              className="w-full mt-6 bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {hasChanges ? "Save Changes" : "All Changes Saved"}
            </Button>
          </Card>

          {/* Super Tip */}
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
                  value={localSuperTip.phrase}
                  onChange={(e) => {
                    setLocalSuperTip(prev => ({ ...prev, phrase: e.target.value }));
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Token</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background">
                    <Avatar className="h-6 w-6 bg-primary/10">
                      <AvatarFallback className="text-xs font-semibold text-primary">
                        {localSuperTip.token.symbol.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{localSuperTip.token.symbol}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Amount</Label>
                  <Input
                    type="number"
                    value={localSuperTip.amount}
                    onChange={(e) => {
                      setLocalSuperTip(prev => ({ ...prev, amount: e.target.value }));
                      setHasChanges(true);
                    }}
                    className="text-center"
                    step="0.01"
                  />
                </div>
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
                  will be sent automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">What is a Super Tip?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Super Tip lets you set a special phrase and a larger tip amount. 
                  When you comment or quote a cast containing that phrase, it will automatically 
                  send the super tip amount instead of your normal tip amount.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
