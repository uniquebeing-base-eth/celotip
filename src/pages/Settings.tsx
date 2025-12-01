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

interface SuperTipPhrase {
  id: string;
  phrase: string;
  configs: {
    comment: TipConfig;
    quote: TipConfig;
  };
}

const DEFAULT_TOKEN: Token = {
  symbol: "cUSD",
  name: "Celo Dollar",
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  balance: "$45.50",
};

const Settings = () => {
  const [tipConfigs, setTipConfigs] = useState<Record<string, TipConfig>>({
    like: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    comment: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    recast: { enabled: true, amount: "0.01", token: DEFAULT_TOKEN },
    quote: { enabled: false, amount: "2000", token: DEFAULT_TOKEN },
    follow: { enabled: false, amount: "2000", token: DEFAULT_TOKEN },
  });

  const [superTipPhrases, setSuperTipPhrases] = useState<SuperTipPhrase[]>([
    {
      id: "1",
      phrase: "$UNIQ",
      configs: {
        comment: { enabled: true, amount: "0", token: DEFAULT_TOKEN },
        quote: { enabled: true, amount: "0", token: DEFAULT_TOKEN },
      },
    },
  ]);

  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string | null>(null);
  const [allowance, setAllowance] = useState("100.00");

  const handleTokenSelect = (token: Token) => {
    if (selectedConfigKey) {
      if (selectedConfigKey.startsWith("super-")) {
        const parts = selectedConfigKey.split("-");
        const phraseId = parts[1];
        const interactionType = parts[2] as "comment" | "quote";
        
        setSuperTipPhrases(phrases =>
          phrases.map(phrase =>
            phrase.id === phraseId
              ? {
                  ...phrase,
                  configs: {
                    ...phrase.configs,
                    [interactionType]: { ...phrase.configs[interactionType], token },
                  },
                }
              : phrase
          )
        );
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

  const updateSuperTipAmount = (phraseId: string, type: "comment" | "quote", delta: number) => {
    setSuperTipPhrases(phrases =>
      phrases.map(phrase =>
        phrase.id === phraseId
          ? {
              ...phrase,
              configs: {
                ...phrase.configs,
                [type]: {
                  ...phrase.configs[type],
                  amount: Math.max(0, parseFloat(phrase.configs[type].amount) + delta).toFixed(6),
                },
              },
            }
          : phrase
      )
    );
  };

  const toggleConfig = (key: string) => {
    setTipConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const toggleSuperTipConfig = (phraseId: string, type: "comment" | "quote") => {
    setSuperTipPhrases(phrases =>
      phrases.map(phrase =>
        phrase.id === phraseId
          ? {
              ...phrase,
              configs: {
                ...phrase.configs,
                [type]: { ...phrase.configs[type], enabled: !phrase.configs[type].enabled },
              },
            }
          : phrase
      )
    );
  };

  const addSuperTipPhrase = () => {
    const newPhrase: SuperTipPhrase = {
      id: Date.now().toString(),
      phrase: "",
      configs: {
        comment: { enabled: false, amount: "0", token: DEFAULT_TOKEN },
        quote: { enabled: false, amount: "0", token: DEFAULT_TOKEN },
      },
    };
    setSuperTipPhrases([...superTipPhrases, newPhrase]);
  };

  const updatePhrase = (phraseId: string, newPhrase: string) => {
    setSuperTipPhrases(phrases =>
      phrases.map(phrase => (phrase.id === phraseId ? { ...phrase, phrase: newPhrase } : phrase))
    );
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your tipping preferences have been updated.",
    });
  };

  const handleIncreaseAllowance = () => {
    toast({
      title: "Allowance Increased",
      description: "Token approval transaction initiated. Please confirm in your wallet.",
    });
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
      <Header username="Creator" />
      
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
                <p className="text-xs text-muted-foreground mb-2">Current limit: {allowance} cUSD</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setAllowance((prev) => Math.max(0, parseFloat(prev) - 10).toFixed(2))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="allowance"
                    type="number"
                    step="10"
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    className="flex-1 text-center"
                  />
                  <Button variant="outline" onClick={() => setAllowance((prev) => (parseFloat(prev) + 10).toFixed(2))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleIncreaseAllowance} className="flex-1 bg-primary hover:bg-primary/90">
                  Approve
                </Button>
                <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Revoke Approval
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
              Set your phrase, choose a token, tip any amount — your super tip, your rules.
            </p>

            <div className="space-y-6">
              {superTipPhrases.map((phrase) => (
                <div key={phrase.id} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter phrase (e.g. $UNIQ)"
                      value={phrase.phrase}
                      onChange={(e) => updatePhrase(phrase.id, e.target.value)}
                      className="flex-1"
                    />
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">Updated</span>
                  </div>

                  {/* Super Comment */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        <Label className="text-sm font-medium">Super Comment</Label>
                      </div>
                      <Switch
                        checked={phrase.configs.comment.enabled}
                        onCheckedChange={() => toggleSuperTipConfig(phrase.id, "comment")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={`$${phrase.configs.comment.amount}`}
                        readOnly
                        className="text-center bg-muted"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openTokenSelector(`super-${phrase.id}-comment`)}
                          className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                        >
                          <Avatar className="h-5 w-5 bg-primary/10">
                            <AvatarFallback className="text-xs font-semibold text-primary">
                              {phrase.configs.comment.token.symbol.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSuperTipAmount(phrase.id, "comment", -0.01)}
                            className="flex-1"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={phrase.configs.comment.amount}
                            onChange={(e) => {
                              setSuperTipPhrases(phrases =>
                                phrases.map(p =>
                                  p.id === phrase.id
                                    ? {
                                        ...p,
                                        configs: {
                                          ...p.configs,
                                          comment: { ...p.configs.comment, amount: e.target.value },
                                        },
                                      }
                                    : p
                                )
                              );
                            }}
                            className="text-center text-xs flex-1"
                            step="0.000001"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSuperTipAmount(phrase.id, "comment", 0.01)}
                            className="flex-1"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Super Quote Cast */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        <Label className="text-sm font-medium">Super Quote Cast</Label>
                      </div>
                      <Switch
                        checked={phrase.configs.quote.enabled}
                        onCheckedChange={() => toggleSuperTipConfig(phrase.id, "quote")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={`$${phrase.configs.quote.amount}`}
                        readOnly
                        className="text-center bg-muted"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openTokenSelector(`super-${phrase.id}-quote`)}
                          className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border bg-background hover:border-primary transition-colors"
                        >
                          <Avatar className="h-5 w-5 bg-primary/10">
                            <AvatarFallback className="text-xs font-semibold text-primary">
                              {phrase.configs.quote.token.symbol.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSuperTipAmount(phrase.id, "quote", -0.01)}
                            className="flex-1"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={phrase.configs.quote.amount}
                            onChange={(e) => {
                              setSuperTipPhrases(phrases =>
                                phrases.map(p =>
                                  p.id === phrase.id
                                    ? {
                                        ...p,
                                        configs: {
                                          ...p.configs,
                                          quote: { ...p.configs.quote, amount: e.target.value },
                                        },
                                      }
                                    : p
                                )
                              );
                            }}
                            className="text-center text-xs flex-1"
                            step="0.000001"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSuperTipAmount(phrase.id, "quote", 0.01)}
                            className="flex-1"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={addSuperTipPhrase} variant="outline" className="w-full">
                Add New Phrase
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
                <AccordionTrigger className="text-sm font-medium">
                  How does tipping work on Farcaster?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  CeloTip automatically sends tokens to creators when you interact with their casts. Each interaction type (like, comment, recast, quote) has a preset tip amount that you configure in settings. All tips are displayed in cUSD value.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm font-medium">
                  How are tips triggered automatically?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Once you approve tokens for tipping, every time you like, comment, recast, or quote a cast on Farcaster, the app automatically sends the configured tip amount to the creator. No additional action needed!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm font-medium">
                  What tokens can I use for tipping?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  You can use any ERC20 token on the Celo network. The default options are CELO (native token) and cUSD (stablecoin), but you can add custom tokens by entering their contract address.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm font-medium">
                  What is token allowance?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Token allowance is the maximum amount of tokens you authorize CeloTip to spend on your behalf. You can increase or revoke this allowance at any time. This ensures you have full control over your funds.
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
        selectedToken={selectedConfigKey ? tipConfigs[selectedConfigKey]?.token : undefined}
      />
    </div>
  );
};

export default Settings;
