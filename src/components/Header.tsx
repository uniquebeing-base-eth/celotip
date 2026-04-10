import { User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { WalletPopover } from "@/components/WalletPopover";
import celotipLogo from "@/assets/celotip-logo.png";

export const Header = () => {
  const { walletAddress, displayName, pfpUrl, walletSource, isLoading, isConnected, connect } = useWalletAuth();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-card backdrop-blur-sm bg-opacity-95">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={celotipLogo} alt="CeloTip" className="w-9 h-9 rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">CeloTip</h1>
                {walletSource === "minipay" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">MiniPay</Badge>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-24 mt-0.5" />
              ) : isConnected && walletAddress ? (
                <p className="text-xs text-muted-foreground">
                  {displayName || formatAddress(walletAddress)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Tip anyone on Celo</p>
              )}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : isConnected ? (
            <WalletPopover>
              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
                {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName || "User"} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </WalletPopover>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={connect}>
              <Wallet className="h-4 w-4" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
