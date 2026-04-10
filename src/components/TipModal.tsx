import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { CUSD_ADDRESS, PLATFORM_FEE_BPS } from "@/lib/contracts";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TipModalProps {
  open: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName: string;
}

export const TipModal = ({ open, onClose, recipientAddress, recipientName }: TipModalProps) => {
  const { walletAddress, fid } = useWalletAuth();
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get user's tip config
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
  const fee = (amount * PLATFORM_FEE_BPS) / 10000;
  const recipientGets = amount - fee;

  const handleTip = async () => {
    if (!walletAddress || !fid) return;

    if (!tipConfig) {
      toast({
        title: "Set up tipping first",
        description: "Go to Settings → Tip Configuration to set your tip amount and approve tokens.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Get recipient's FID
      const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
        p_wallet_address: recipientAddress.toLowerCase(),
      });

      // Call the backend relayer to process the tip
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

      setTxHash(data.txHash);
      toast({
        title: "Tip sent! 🎉",
        description: `${amount} ${tokenSymbol} sent to ${recipientName}`,
      });
    } catch (error: any) {
      console.error("Tip failed:", error);
      toast({
        title: "Tip Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTxHash(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {txHash ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle>Tip Sent!</DialogTitle>
              <DialogDescription>
                {amount} {tokenSymbol} sent to {recipientName}
              </DialogDescription>
            </DialogHeader>
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline mt-3 block"
            >
              View on Celoscan →
            </a>
            <Button onClick={handleClose} className="mt-4 w-full">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tip {recipientName}
              </DialogTitle>
              <DialogDescription>
                Send {tokenSymbol} to {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-4)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {!tipConfig ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                  <p className="text-sm font-medium text-destructive">No tip configuration found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to Settings to set your tip amount and approve tokens first.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tip summary */}
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-foreground">{amount}</p>
                    <p className="text-lg text-muted-foreground">{tokenSymbol}</p>
                  </div>

                  <div className="p-3 bg-secondary/50 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipient gets</span>
                      <span className="font-medium text-foreground">{recipientGets.toFixed(4)} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform fee ({PLATFORM_FEE_BPS / 100}%)</span>
                      <span className="text-muted-foreground">{fee.toFixed(4)} {tokenSymbol}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleTip}
                    className="w-full h-12 text-base"
                    disabled={isSending}
                  >
                    {isSending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending via relayer...</>
                    ) : (
                      <>Send {amount} {tokenSymbol}</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
