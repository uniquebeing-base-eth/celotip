import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "./useWalletAuth";
import { useWallet } from "./useWallet";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo } from "viem/chains";
import { CELOTIP_CONTRACT_ADDRESS, ERC20_ABI } from "@/lib/contracts";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export const useTokenApproval = (tokenAddress: string, tokenSymbol: string) => {
  const queryClient = useQueryClient();
  const { walletAddress, fid, getProvider } = useWalletAuth();

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
    queryKey: ["approvalRecord", tokenAddress, fid],
    queryFn: async () => {
      if (!fid) return null;

      const { data, error } = await supabase
        .from("token_approvals")
        .select("*")
        .eq("fid", fid)
        .eq("token_address", tokenAddress)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!fid,
  });

  // Approve token spending
  const approveMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!walletAddress || !fid) throw new Error("Wallet not connected");

      const provider = await getProvider();
      
      // Switch to Celo chain first
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa4ec" }],
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

      const amountWei = parseUnits(amount, 18);

      const hash = await (walletClient.writeContract as any)({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, amountWei],
        account: walletAddress as `0x${string}`,
        chain: celo,
      }) as `0x${string}`;

      await publicClient.waitForTransactionReceipt({ hash });

      const { error } = await supabase
        .from("token_approvals")
        .upsert({
          fid,
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
      if (!walletAddress || !fid) throw new Error("Wallet not connected");

      const provider = await getProvider();
      
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa4ec" }],
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

      const hash = await (walletClient.writeContract as any)({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CELOTIP_CONTRACT_ADDRESS as `0x${string}`, 0n],
        account: walletAddress as `0x${string}`,
        chain: celo,
      }) as `0x${string}`;

      await publicClient.waitForTransactionReceipt({ hash });

      await supabase
        .from("token_approvals")
        .delete()
        .eq("fid", fid)
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
