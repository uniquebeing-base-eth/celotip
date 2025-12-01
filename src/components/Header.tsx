import { Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface HeaderProps {
  username?: string;
  onSearch?: (query: string) => void;
}

export const Header = ({ username = "Creator", onSearch }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-card backdrop-blur-sm bg-opacity-95">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground mb-1">CeloTip</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hi <span className="font-semibold text-primary">{username}</span>
              <br />
              Welcome to CeloTip — an app for tipping creators with CELO or Celo tokens automatically whenever you like, comment, recast, or quote their posts on Farcaster.
            </p>
          </div>
          <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
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
