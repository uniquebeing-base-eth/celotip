import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { createWalletClient, custom } from "viem";
import { celo } from "viem/chains";
import { supabase } from "@/integrations/supabase/client";
import sdk from "@farcaster/frame-sdk";

type WalletSource = "minipay" | "farcaster" | "injected" | null;

interface WalletAuthContextType {
  walletAddress: string | null;
  fid: number | null;
  displayName: string | null;
  pfpUrl: string | null;
  walletSource: WalletSource;
  isLoading: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  getProvider: () => Promise<any>;
}

const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Detect MiniPay
const isMiniPay = (): boolean => {
  return !!(window.ethereum && window.ethereum.isMiniPay);
};

// Detect any injected provider
const hasInjectedProvider = (): boolean => {
  return !!window.ethereum;
};

export const WalletAuthProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [walletSource, setWalletSource] = useState<WalletSource>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveProfile = useCallback(async (address: string, source: WalletSource) => {
    try {
      // Get or create profile by wallet address
      const { data, error } = await supabase.rpc("get_or_create_profile_by_wallet", {
        p_wallet_address: address.toLowerCase(),
      });

      if (error) {
        console.error("Error resolving profile:", error);
        return;
      }

      const resolvedFid = data as number;
      setFid(resolvedFid);

      // Fetch profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, pfp_url, username")
        .eq("fid", resolvedFid)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || profile.username || null);
        setPfpUrl(profile.pfp_url);
      }
    } catch (err) {
      console.error("Profile resolution failed:", err);
    }
  }, []);

  const connectMiniPay = useCallback(async (): Promise<string | null> => {
    if (!isMiniPay()) return null;

    try {
      const client = createWalletClient({
        chain: celo,
        transport: custom(window.ethereum),
      });

      const [address] = await client.getAddresses();
      if (address) {
        setWalletSource("minipay");
        setWalletAddress(address);
        await resolveProfile(address, "minipay");
        return address;
      }
    } catch (err) {
      console.error("MiniPay connection failed:", err);
    }
    return null;
  }, [resolveProfile]);

  const connectFarcaster = useCallback(async (): Promise<string | null> => {
    try {
      // Try Farcaster SDK
      const readyPromise = sdk.actions.ready();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SDK ready timeout")), 3000)
      );

      await Promise.race([readyPromise, timeoutPromise]);
      const context = await sdk.context;

      if (context?.user) {
        setFid(context.user.fid);
        setDisplayName(context.user.displayName || context.user.username || null);
        setPfpUrl(context.user.pfpUrl || null);
        setWalletSource("farcaster");

        // Get wallet address from Farcaster
        try {
          const { data } = await supabase.functions.invoke("get-wallet-address", {
            body: { fid: context.user.fid },
          });
          const addr = data?.walletAddress || null;
          setWalletAddress(addr);

          // Update profile
          await supabase.from("profiles").upsert(
            {
              fid: context.user.fid,
              username: context.user.username,
              display_name: context.user.displayName,
              pfp_url: context.user.pfpUrl,
              connected_address: addr,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "fid" }
          );

          return addr;
        } catch (e) {
          console.error("Failed to get Farcaster wallet:", e);
        }
      }
    } catch (err) {
      console.warn("Farcaster SDK not available:", err);
    }
    return null;
  }, []);

  const connectInjected = useCallback(async (): Promise<string | null> => {
    if (!hasInjectedProvider()) return null;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (accounts?.[0]) {
        setWalletSource("injected");
        setWalletAddress(accounts[0]);
        await resolveProfile(accounts[0], "injected");
        return accounts[0];
      }
    } catch (err) {
      console.error("Injected provider connection failed:", err);
    }
    return null;
  }, [resolveProfile]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      // Priority: MiniPay > Farcaster > Injected
      let addr = await connectMiniPay();
      if (!addr) addr = await connectFarcaster();
      if (!addr) addr = await connectInjected();
    } finally {
      setIsLoading(false);
    }
  }, [connectMiniPay, connectFarcaster, connectInjected]);

  const getProvider = useCallback(async () => {
    if (walletSource === "minipay" || walletSource === "injected") {
      return window.ethereum;
    }
    if (walletSource === "farcaster") {
      return sdk.wallet.ethProvider;
    }
    // Fallback
    if (isMiniPay() || hasInjectedProvider()) return window.ethereum;
    return sdk.wallet.ethProvider;
  }, [walletSource]);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <WalletAuthContext.Provider
      value={{
        walletAddress,
        fid,
        displayName,
        pfpUrl,
        walletSource,
        isLoading,
        isConnected: !!walletAddress,
        connect,
        getProvider,
      }}
    >
      {children}
    </WalletAuthContext.Provider>
  );
};

export const useWalletAuth = () => {
  const context = useContext(WalletAuthContext);
  if (context === undefined) {
    throw new Error("useWalletAuth must be used within a WalletAuthProvider");
  }
  return context;
};
