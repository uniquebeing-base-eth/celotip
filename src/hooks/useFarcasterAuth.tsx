import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getFarcasterUser } from "@/lib/farcaster";
import { supabase } from "@/integrations/supabase/client";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterAuthContextType {
  user: FarcasterUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const FarcasterAuthContext = createContext<FarcasterAuthContextType | undefined>(undefined);

export const FarcasterAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const farcasterUser = await getFarcasterUser();
      
      if (farcasterUser) {
        setUser(farcasterUser);
        
        // Upsert user profile in database
        const { error } = await supabase
          .from("profiles")
          .upsert({
            fid: farcasterUser.fid,
            username: farcasterUser.username,
            display_name: farcasterUser.displayName,
            pfp_url: farcasterUser.pfpUrl,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "fid"
          });

        if (error) {
          console.error("Error upserting user profile:", error);
        }
      }
    } catch (error) {
      console.error("Error loading Farcaster user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <FarcasterAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refreshUser,
      }}
    >
      {children}
    </FarcasterAuthContext.Provider>
  );
};

export const useFarcasterAuth = () => {
  const context = useContext(FarcasterAuthContext);
  if (context === undefined) {
    throw new Error("useFarcasterAuth must be used within a FarcasterAuthProvider");
  }
  return context;
};
