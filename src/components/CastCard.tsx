
import { Coins, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface CastAuthor {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

interface Cast {
  id: string;
  hash: string;
  author: CastAuthor;
  totalTips: number;
  tipCount: number;
  tokenSymbol: string;
  latestTipAt: string;
  text?: string;
}

interface CastCardProps {
  cast: Cast;
}

export const CastCard = ({ cast }: CastCardProps) => {
  const warpcastUrl = `https://warpcast.com/~/conversations/${cast.hash}`;
  
  // Truncate text to ~100 chars
  const truncatedText = cast.text 
    ? cast.text.length > 100 
      ? cast.text.substring(0, 100) + '...' 
      : cast.text
    : null;
  
  return (
    <Card className="p-4 bg-gradient-card border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 border-2 border-primary/10">
          <AvatarImage src={cast.author.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cast.author.username}`} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {cast.author.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              {cast.author.displayName}
            </h3>
            <span className="text-xs text-muted-foreground">@{cast.author.username}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(cast.latestTipAt), { addSuffix: true })}
          </p>
        </div>
        <a 
          href={warpcastUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {truncatedText && (
        <p className="text-sm text-foreground/90 mb-3 leading-relaxed">
          {truncatedText}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">${cast.totalTips.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">{cast.tokenSymbol}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{cast.tipCount} tip{cast.tipCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Card>
  );
};
