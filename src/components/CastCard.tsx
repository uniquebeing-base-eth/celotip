import { Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface Cast {
  id: string;
  author: string;
  content: string;
  totalTips: number;
  topTippers: string[];
}

interface CastCardProps {
  cast: Cast;
}

export const CastCard = ({ cast }: CastCardProps) => {
  return (
    <Card className="p-4 bg-gradient-card border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 border-2 border-primary/10">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${cast.author}`} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {cast.author.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground mb-1">@{cast.author}</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">{cast.content}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">${cast.totalTips.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">cUSD</span>
          </div>
        </div>

        <div className="flex items-center -space-x-2">
          {cast.topTippers.slice(0, 5).map((tipper, idx) => (
            <Avatar key={idx} className="h-7 w-7 border-2 border-card shadow-sm hover:scale-110 transition-transform">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tipper}`} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {tipper.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {cast.topTippers.length > 5 && (
            <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">+{cast.topTippers.length - 5}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
