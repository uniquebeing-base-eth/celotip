

import { Search, User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { WalletPopover } from "@/components/WalletPopover";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { walletAddress, displayName, pfpUrl, walletSource, isLoading, isConnected, connect } = useWalletAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-card backdrop-blur-sm bg-opacity-95">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">CeloTip</h1>
              {walletSource === "minipay" && (
                <Badge variant="secondary" className="text-xs">MiniPay</Badge>
              )}
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : isConnected ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hi <span className="font-semibold text-primary">{displayName || (walletAddress ? formatAddress(walletAddress) : "")}</span>
                <br />
                Welcome to CeloTip — auto-tip creators with CELO tokens when you interact with their posts on Farcaster.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Welcome to CeloTip
                <br />
                Connect your wallet to get started
              </p>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-12 w-12 rounded-full" />
          ) : isConnected ? (
            <WalletPopover>
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
                {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName || "User"} />}
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <User className="h-5 w-5" />
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

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search casts or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border focus:border-primary transition-colors"
          />
        </form>
      </div>
    </header>
  );
};
