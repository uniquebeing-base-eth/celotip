
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { TOKEN_ADDRESSES } from "@/lib/contracts";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: "cUSD", name: "Celo Dollar", address: TOKEN_ADDRESSES.cUSD, balance: "$0.00" },
  { symbol: "CELO", name: "Celo", address: TOKEN_ADDRESSES.CELO, balance: "$0.00" },
  { symbol: "cEUR", name: "Celo Euro", address: TOKEN_ADDRESSES.cEUR, balance: "$0.00" },
  { symbol: "cREAL", name: "Celo Real", address: TOKEN_ADDRESSES.cREAL, balance: "$0.00" },
];

export interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
  tokens?: Token[];
}

export const TokenSelector = ({ 
  open, 
  onClose, 
  onSelectToken, 
  selectedToken,
  tokens: propTokens 
}: TokenSelectorProps) => {
  const [customTokens, setCustomTokens] = useState<Token[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState("");

  const allTokens = [...(propTokens || DEFAULT_TOKENS), ...customTokens];

  const handleAddToken = () => {
    if (newTokenAddress.trim() && newTokenAddress.startsWith("0x")) {
      const exists = allTokens.some(t => t.address.toLowerCase() === newTokenAddress.toLowerCase());
      if (!exists) {
        const newToken: Token = {
          symbol: "CUSTOM",
          name: "Custom Token",
          address: newTokenAddress,
          balance: "$0.00",
        };
        setCustomTokens([...customTokens, newToken]);
      }
      setNewTokenAddress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">Choose Token</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a token to use for tipping
          </p>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Add custom token</label>
            <div className="flex gap-2">
              <Input
                placeholder="Token contract address (0x...)"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddToken} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-3 block">Available tokens</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelectToken(token);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:border-primary ${
                    selectedToken?.address?.toLowerCase() === token.address.toLowerCase() 
                      ? "border-primary bg-primary/5" 
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-primary/10">
                      <AvatarFallback className="text-sm font-semibold text-primary">
                        {token.symbol.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token.name}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-foreground">{token.balance}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
