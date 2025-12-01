import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useFarcasterAuth } from "./useFarcasterAuth";

interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  decimals: number;
}

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  balances: TokenBalance[];
  isLoadingBalances: boolean;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Default Celo tokens
const DEFAULT_TOKENS: Omit<TokenBalance, "balance">[] = [
  {
    symbol: "CELO",
    name: "Celo Native Asset",
    address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    decimals: 18,
  },
  {
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
  {
    symbol: "cEUR",
    name: "Celo Euro",
    address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    decimals: 18,
  },
];

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useFarcasterAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  useEffect(() => {
    // In a real implementation, we'd get the connected wallet from Farcaster context
    // For now, we'll use a placeholder
    if (user) {
      // Placeholder wallet address (in production, this would come from Farcaster signer)
      setAddress("0x0000000000000000000000000000000000000000");
    } else {
      setAddress(null);
    }
  }, [user]);

  const refreshBalances = async () => {
    if (!address) return;

    setIsLoadingBalances(true);
    try {
      // In production, this would fetch real balances from the blockchain
      // For now, return placeholder balances
      const mockBalances: TokenBalance[] = DEFAULT_TOKENS.map(token => ({
        ...token,
        balance: (Math.random() * 100).toFixed(2),
      }));
      
      setBalances(mockBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances([]);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (address) {
      refreshBalances();
    }
  }, [address]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        balances,
        isLoadingBalances,
        refreshBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
