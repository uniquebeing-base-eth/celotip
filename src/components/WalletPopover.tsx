import { Wallet, Copy, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { ReactNode } from "react";

interface WalletPopoverProps {
  children: ReactNode;
}

export const WalletPopover = ({ children }: WalletPopoverProps) => {
  const { walletAddress, balance, isLoading } = useWallet();

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Address copied!");
    }
  };

  const openExplorer = () => {
    if (walletAddress) {
      window.open(`https://celoscan.io/address/${walletAddress}`, "_blank");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Your Wallet</h3>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : walletAddress ? (
            <>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
                    {formatAddress(walletAddress)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={copyAddress}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">CELO Balance</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {balance ? parseFloat(balance).toFixed(4) : "0.0000"}
                  </span>
                  <span className="text-sm text-muted-foreground">CELO</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openExplorer}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View on Celoscan
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No wallet connected
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
