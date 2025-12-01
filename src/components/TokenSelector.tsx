import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: "CELO", name: "Celo Native", address: "0x471EcE3750Da237f93B8E339c536989b8978a438", balance: "$92.20" },
  { symbol: "cUSD", name: "Celo Dollar", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", balance: "$45.50" },
];

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
}

export const TokenSelector = ({ open, onClose, onSelectToken, selectedToken }: TokenSelectorProps) => {
  const [tokens, setTokens] = useState<Token[]>(DEFAULT_TOKENS);
  const [newTokenAddress, setNewTokenAddress] = useState("");

  const handleAddToken = () => {
    if (newTokenAddress.trim()) {
      const newToken: Token = {
        symbol: "CUSTOM",
        name: "Custom Token",
        address: newTokenAddress,
        balance: "$0",
      };
      setTokens([...tokens, newToken]);
      setNewTokenAddress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">Choose from Holdings</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You must hold more than $5 of a token to configure tipping
          </p>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Add new token</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add address"
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
            <label className="text-sm text-muted-foreground mb-3 block">Your holdings</label>
            <div className="space-y-2">
              {tokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelectToken(token);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:border-primary ${
                    selectedToken?.address === token.address ? "border-primary bg-primary/5" : "border-border"
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
