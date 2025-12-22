import { ReactNode } from "react";
import { useFarcasterAuth } from "@/hooks/useFarcasterAuth";
import { Button } from "@/components/ui/button";
import { Smartphone, ExternalLink } from "lucide-react";

interface FarcasterGuardProps {
  children: ReactNode;
}

const FARCASTER_MINIAPP_URL = "https://farcaster.xyz/miniapps/wux5WG7oGEYz/celotip";

const FarcasterGuard = ({ children }: FarcasterGuardProps) => {
  const { isLoading, isAuthenticated } = useFarcasterAuth();

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated (not in Farcaster), show the guard screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Shield/Lock Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              CeloTip
            </h1>
            <p className="text-muted-foreground text-sm">
              Auto-tip your favorite creators on Farcaster
            </p>
          </div>

          {/* Message */}
          <div className="space-y-4 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              Open in Farcaster
            </h2>
            <p className="text-muted-foreground">
              To access CeloTip features, please open this app within Farcaster. 
              Tap the button below to launch the mini app.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full gap-2 text-lg py-6"
            onClick={() => window.open(FARCASTER_MINIAPP_URL, "_blank")}
          >
            <ExternalLink className="w-5 h-5" />
            Open in Farcaster
          </Button>

          {/* Secondary info */}
          <p className="text-xs text-muted-foreground">
            Don't have Farcaster?{" "}
            <a 
              href="https://farcaster.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get started here
            </a>
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated, show the app
  return <>{children}</>;
};

export default FarcasterGuard;
