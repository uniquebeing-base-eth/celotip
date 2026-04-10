import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { CELO_STABLES } from "@/lib/contracts";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: "cUSD", name: "Celo Dollar", address: TOKEN_ADDRESSES.cUSD, balance: "$0.00" },
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
  tokens: propTokens,
}: TokenSelectorProps) => {
  const allTokens = propTokens || DEFAULT_TOKENS;

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
          <p className="text-sm text-muted-foreground">CeloTip uses cUSD exclusively</p>
          <div className="space-y-2">
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
      </DialogContent>
    </Dialog>
  );
};
