import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFarcasterUser } from "@/lib/farcaster";
import { useWallet } from "./useWallet";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { CELOTIP_CONTRACT_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import sdk from "@farcaster/frame-sdk";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export const useTokenApproval = (tokenAddress: string, tokenSymbol: string) => {
  const queryClient = useQueryClient();
  const { walletAddress } = useWallet();

  // Fetch current allowance from blockchain
  const { data: allowance, isLoading: isLoadingAllowance } = useQuery({
    queryKey: ["tokenAllowance", walletAddress, tokenAddress],
    queryFn: async () => {
      if (!walletAddress) return "0";

      try {
        const allowance = await (publicClient.readContract as any)({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [walletAddress as `0x${string}`, CELOTIP_CONTRACT_ADDRESS as `0x${string}`],
        }) as bigint;

        return formatUnits(allowance, 18);
      } catch (error) {
        console.error("Error fetching allowance:", error);
        return "0";
      }
    },
    enabled: !!walletAddress && tokenAddress !== "native",
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  // Fetch approval record from database
  const { data: approvalRecord } = useQuery({
    queryKey: ["approvalRecord", tokenAddress],
    queryFn: async () => {
      const user = await getFarcasterUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("token_approvals")
        .select("*")
        .eq("fid", user.fid)
        .eq("token_address", tokenAddress)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
  });

  // Approve token spending
  const approveMutation = useMutation({
    mutationFn: async (amount: string) => {
      const user = await getFarcasterUser();
      if (!user || !walletAddress) throw new Error("User not authenticated");

      // Create wallet client using Farcaster Frame SDK
      const provider = await sdk.wallet.ethProvider;
      
      // Switch to Celo chain first
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa4ec" }], // 42220 in hex
        });
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xa4ec",
              chainName: "Celo",
              nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
              rpcUrls: ["https://forno.celo.org"],
              blockExplorerUrls: ["https://celoscan.io"],
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
      });

      // Parse amount to wei
      const amountWei = parseUnits(amount, 18);

      // Execute approval transaction
      const hash = await (walletClient.writeContract as any)({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, amountWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      }) as `0x${string}`;

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // Save to database
      const { error } = await supabase
        .from("token_approvals")
        .upsert({
          fid: user.fid,
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          approved_amount: parseFloat(amount),
          contract_address: CELOTIP_CONTRACT_ADDRESS,
          tx_hash: hash,
        });

      if (error) throw error;

      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllowance"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRecord"] });
    },
  });

  // Revoke token approval
  const revokeMutation = useMutation({
    mutationFn: async () => {
      const user = await getFarcasterUser();
      if (!user || !walletAddress) throw new Error("User not authenticated");

      const provider = await sdk.wallet.ethProvider;
      
      // Switch to Celo chain first
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa4ec" }], // 42220 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xa4ec",
              chainName: "Celo",
              nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
              rpcUrls: ["https://forno.celo.org"],
              blockExplorerUrls: ["https://celoscan.io"],
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(provider),
      });

      // Set approval to 0 to revoke
      const hash = await (walletClient.writeContract as any)({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, 0n],
        account: walletAddress as `0x${string}`,
        chain: celo,
      }) as `0x${string}`;

      await publicClient.waitForTransactionReceipt({ hash });

      // Delete from database
      await supabase
        .from("token_approvals")
        .delete()
        .eq("fid", user.fid)
        .eq("token_address", tokenAddress);

      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllowance"] });
      queryClient.invalidateQueries({ queryKey: ["approvalRecord"] });
    },
  });

  return {
    allowance,
    approvalRecord,
    isLoading: isLoadingAllowance,
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    revoke: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
  };
};
