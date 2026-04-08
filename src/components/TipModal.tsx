import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { CELOTIP_CONTRACT_ADDRESS, CELOTIP_ABI, CUSD_ADDRESS, ERC20_ABI, PLATFORM_FEE_BPS } from "@/lib/contracts";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const publicClient = createPublicClient({ chain: celo, transport: http() });

const PRESETS = ["0.1", "0.5", "1"];

interface TipModalProps {
  open: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName: string;
}

export const TipModal = ({ open, onClose, recipientAddress, recipientName }: TipModalProps) => {
  const { walletAddress, fid, getProvider } = useWalletAuth();
  const [amount, setAmount] = useState("0.5");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fee = (parseFloat(amount || "0") * PLATFORM_FEE_BPS) / 10000;
  const recipientGets = parseFloat(amount || "0") - fee;

  const handleTip = async () => {
    if (!walletAddress || !fid) return;
    setIsSending(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error("No wallet provider");

      const walletClient = createWalletClient({ chain: celo, transport: custom(provider) });
      const amountWei = parseUnits(amount, 18);

      // Check allowance
      const currentAllowance = (await publicClient.readContract({
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

      // Send tip via contract
      const hash = await walletClient.writeContract({
        address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
        abi: CELOTIP_ABI,
        functionName: "tip",
        args: [recipientAddress as `0x${string}`, amountWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        // Record in DB
        const { data: recipientFid } = await supabase.rpc("get_or_create_profile_by_wallet", {
          p_wallet_address: recipientAddress.toLowerCase(),
        });

        await supabase.from("transactions").insert({
          from_fid: fid,
          to_fid: recipientFid || 0,
          amount: parseFloat(amount),
          token_address: CUSD_ADDRESS,
          token_symbol: "cUSD",
          interaction_type: "tip",
          status: "completed",
          tx_hash: hash,
        });

        // Update recipient total tips
        await supabase.rpc("get_or_create_profile_by_wallet", {
          p_wallet_address: recipientAddress.toLowerCase(),
        });

        setTxHash(hash);
        toast({ title: "Tip sent! 🎉", description: `${amount} cUSD sent to ${recipientName}` });
      } else {
        throw new Error("Transaction reverted");
      }
    } catch (error: any) {
      console.error("Tip failed:", error);
      toast({
        title: "Tip Failed",
        description: error.shortMessage || error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTxHash(null);
    setAmount("0.5");
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
                {amount} cUSD sent to {recipientName}
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
                Send cUSD to {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-4)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Presets */}
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    variant={amount === p ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAmount(p)}
                  >
                    {p} cUSD
                  </Button>
                ))}
              </div>

              {/* Custom amount */}
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-xl font-bold h-12"
                placeholder="0.00"
              />

              {/* Summary */}
              {parseFloat(amount) > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient gets</span>
                    <span className="font-medium text-foreground">{recipientGets.toFixed(4)} cUSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee ({PLATFORM_FEE_BPS / 100}%)</span>
                    <span className="text-muted-foreground">{fee.toFixed(4)} cUSD</span>
                  </div>
                  <div className="border-t border-border pt-1 flex justify-between font-medium">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{amount} cUSD</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleTip}
                className="w-full h-12 text-base"
                disabled={isSending || parseFloat(amount) <= 0}
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming...</>
                ) : (
                  <>Send {amount} cUSD</>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
