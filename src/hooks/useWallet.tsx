import { useQuery } from "@tanstack/react-query";
import { getWalletAddress } from "@/lib/farcaster";
import { createPublicClient, http, formatEther } from "viem";
import { celo } from "viem/chains";

const celoClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export const useWallet = () => {
  const { data: walletAddress, isLoading: isLoadingAddress } = useQuery({
    queryKey: ["walletAddress"],
    queryFn: getWalletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });

  return {
    walletAddress,
    balance,
    isLoading: isLoadingAddress || isLoadingBalance,
  };
};
