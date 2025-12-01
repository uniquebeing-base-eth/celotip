import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Repeat2, Quote, Zap, Shield, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [tipAmounts, setTipAmounts] = useState({
    like: "0.1",
    comment: "0.25",
    recast: "0.15",
    quote: "0.3",
    superTip: "1.0",
  });

  const [allowance, setAllowance] = useState("100.00");

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
              <h3 className="text-lg font-semibold text-foreground">Tip Configuration</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Set default tipping amounts for different interactions on Farcaster.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Heart className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <Label htmlFor="like" className="text-sm font-medium">Like</Label>
                </div>
                <div className="w-32">
                  <Input
                    id="like"
                    type="number"
                    step="0.01"
                    value={tipAmounts.like}
                    onChange={(e) => setTipAmounts({ ...tipAmounts, like: e.target.value })}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">CELO</span>
              </div>

              <div className="flex items-center gap-4">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <Label htmlFor="comment" className="text-sm font-medium">Comment</Label>
                </div>
                <div className="w-32">
                  <Input
                    id="comment"
                    type="number"
                    step="0.01"
                    value={tipAmounts.comment}
                    onChange={(e) => setTipAmounts({ ...tipAmounts, comment: e.target.value })}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">CELO</span>
              </div>

              <div className="flex items-center gap-4">
                <Repeat2 className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <Label htmlFor="recast" className="text-sm font-medium">Recast</Label>
                </div>
                <div className="w-32">
                  <Input
                    id="recast"
                    type="number"
                    step="0.01"
                    value={tipAmounts.recast}
                    onChange={(e) => setTipAmounts({ ...tipAmounts, recast: e.target.value })}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">CELO</span>
              </div>

              <div className="flex items-center gap-4">
                <Quote className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <Label htmlFor="quote" className="text-sm font-medium">Quote</Label>
                </div>
                <div className="w-32">
                  <Input
                    id="quote"
                    type="number"
                    step="0.01"
                    value={tipAmounts.quote}
                    onChange={(e) => setTipAmounts({ ...tipAmounts, quote: e.target.value })}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">CELO</span>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-4">
                <Zap className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="superTip" className="text-sm font-medium">Super Tip</Label>
                  <p className="text-xs text-muted-foreground mt-1">Custom amount for special reactions</p>
                </div>
                <div className="w-32">
                  <Input
                    id="superTip"
                    type="number"
                    step="0.1"
                    value={tipAmounts.superTip}
                    onChange={(e) => setTipAmounts({ ...tipAmounts, superTip: e.target.value })}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">CELO</span>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full mt-6 bg-gradient-primary hover:opacity-90 transition-opacity">
              Save Preferences
            </Button>
          </Card>

          {/* Token Approval */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Token Approval</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your CELO token allowance for automatic tipping.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="allowance" className="text-sm font-medium">Current Allowance</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="allowance"
                    type="number"
                    step="10"
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">CELO</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleIncreaseAllowance} className="flex-1 bg-primary hover:bg-primary/90">
                  Increase Allowance
                </Button>
                <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Revoke Approval
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                You'll be asked to sign a transaction to update your token allowance.
              </p>
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
                  CeloTip automatically sends CELO tokens to creators when you interact with their casts. Each interaction type (like, comment, recast, quote) has a preset tip amount that you configure in settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm font-medium">
                  How are tips triggered automatically?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Once you approve CELO tokens for tipping, every time you like, comment, recast, or quote a cast on Farcaster, the app automatically sends the configured tip amount to the creator. No additional action needed!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm font-medium">
                  How do I configure tipping preferences?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Use the Tip Configuration section above to set default amounts for each interaction type. You can also set a Super Tip amount for special reactions. Don't forget to click "Save Preferences" after making changes!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm font-medium">
                  What is token allowance?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Token allowance is the maximum amount of CELO tokens you authorize CeloTip to spend on your behalf. You can increase or revoke this allowance at any time. This ensures you have full control over your funds.
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
