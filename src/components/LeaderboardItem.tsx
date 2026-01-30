

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  amount: number;
  tipCount?: number;
}

interface LeaderboardItemProps {
  user: LeaderboardUser;
}

export const LeaderboardItem = ({ user }: LeaderboardItemProps) => {
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  const isTopThree = user.rank <= 3;

  return (
    <Card className={`p-4 bg-gradient-card border-border shadow-card hover:shadow-elevated transition-all duration-300 ${isTopThree ? 'border-primary/30' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center min-w-[40px] ${isTopThree ? 'animate-pulse' : ''}`}>
          {isTopThree ? (
            <Trophy className={`h-6 w-6 ${getMedalColor(user.rank)}`} />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">#{user.rank}</span>
          )}
        </div>

        <Avatar className={`h-12 w-12 border-2 ${isTopThree ? 'border-primary' : 'border-border'} shadow-sm`}>
          <AvatarImage src={user.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {user.displayName || `@${user.username}`}
          </h3>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          {user.tipCount && (
            <p className="text-xs text-muted-foreground">{user.tipCount} tips</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`text-right ${isTopThree ? 'scale-110' : ''}`}>
            <div className="flex items-center gap-1 text-primary font-bold">
              <TrendingUp className="h-4 w-4" />
              <span>${user.amount.toFixed(2)}</span>
            </div>
            <span className="text-xs text-muted-foreground">cUSD</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
