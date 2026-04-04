import { useQuery } from "@tanstack/react-query";
import { useWalletAuth } from "./useWalletAuth";
import { createPublicClient, http, formatEther } from "viem";
import { celo } from "viem/chains";

const celoClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export const useWallet = () => {
  const { walletAddress, isLoading: isLoadingAuth } = useWalletAuth();

  const { data: balance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["celoBalance", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      
      const balanceWei = await celoClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      
      return formatEther(balanceWei);
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  return {
    walletAddress,
    balance,
    isLoading: isLoadingAuth || isLoadingBalance,
  };
};
