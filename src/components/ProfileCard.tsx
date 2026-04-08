import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Zap, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileCardProps {
  walletAddress: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  totalTipsReceived: number;
  isBoosted: boolean;
  onTip: (address: string, name: string) => void;
}

export const ProfileCard = ({
  walletAddress,
  name,
  description,
  imageUrl,
  totalTipsReceived,
  isBoosted,
  onTip,
}: ProfileCardProps) => {
  const navigate = useNavigate();
  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Card
      className={`p-4 bg-card border-border shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer ${
        isBoosted ? "border-primary/40 ring-1 ring-primary/20" : ""
      }`}
      onClick={() => navigate(`/profile/${walletAddress}`)}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border-2 border-border shadow-sm flex-shrink-0">
          {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-bold">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{name}</h3>
            {isBoosted && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Boosted
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {description || formatAddr(walletAddress)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <DollarSign className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">{totalTipsReceived.toFixed(2)} cUSD</span>
          </div>
        </div>

        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onTip(walletAddress, name);
          }}
        >
          Tip
        </Button>
      </div>
    </Card>
  );
};
