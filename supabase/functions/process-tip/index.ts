
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from "https://esm.sh/viem@2.40.3";
import { privateKeyToAccount } from "https://esm.sh/viem@2.40.3/accounts";
import { celo } from "https://esm.sh/viem@2.40.3/chains";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract addresses
const CELOTIP_CONTRACT_ADDRESS = "0x6b3A9c2b4b4BB24D5DFa59132499cb4Fd29C733e";

// CeloTip Contract ABI (only sendTip function needed)
const CELOTIP_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenAddress", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interactionType", type: "string" },
      { name: "castHash", type: "string" }
    ],
    name: "sendTip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenAddress", type: "address" }
    ],
    name: "getUserAllowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// ERC20 ABI for decimals
const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface TipRequest {
  fromFid: number;
  toFid: number;
  interactionType: string;
  castHash?: string;
  useSuperTip?: boolean;
  superTipConfig?: {
    amount: number;
    token_address: string;
    token_symbol: string;
  };
}

// Send notification to the tipper when their allowance runs out
async function sendLowAllowanceNotification(
  fid: number,
  tokenSymbol: string,
  supabase: any
): Promise<void> {
  try {
    // Get the stored notification token for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('notification_tokens')
      .select('token, notification_url, is_valid')
      .eq('fid', fid)
      .eq('is_valid', true)
      .maybeSingle();

    if (tokenError || !tokenData?.token || !tokenData?.notification_url) {
      console.log("No valid notification token found for FID:", fid);
      return;
    }

    console.log(`Sending low allowance notification to FID ${fid}`);
    
    const notificationId = `allowance-${Date.now()}-${fid}`;
    
    const notificationPayload = {
      notificationId,
      title: `Your ${tokenSymbol} allowance ran out! ⚠️`,
      body: `Top up your ${tokenSymbol} approval in CeloTip to continue auto-tipping.`,
      targetUrl: 'https://celotip.vercel.app/settings',
      tokens: [tokenData.token],
    };

    const response = await fetch(tokenData.notification_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload),
    });

    console.log("Low allowance notification response:", response.status);
    
    if (response.ok) {
      const result = await response.json();
      if (result.invalidTokens?.length > 0) {
        await supabase
          .from('notification_tokens')
          .update({ is_valid: false, updated_at: new Date().toISOString() })
          .eq('fid', fid);
      }
    }
  } catch (error) {
    console.error("Error sending low allowance notification:", error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const relayerPrivateKey = Deno.env.get('RELAYER_PRIVATE_KEY');
    if (!relayerPrivateKey) {
      throw new Error('RELAYER_PRIVATE_KEY not configured');
    }

    const { fromFid, toFid, interactionType, castHash, useSuperTip, superTipConfig }: TipRequest = await req.json();

    console.log("Processing tip request:", { fromFid, toFid, interactionType, castHash, useSuperTip });

    // Fetch sender's profile to get wallet address
    const { data: fromProfile, error: fromError } = await supabase
      .from('profiles')
      .select('connected_address')
      .eq('fid', fromFid)
      .maybeSingle();

    if (fromError || !fromProfile?.connected_address) {
      console.error("Sender profile not found:", fromError);
      return new Response(
        JSON.stringify({ success: false, message: 'Sender wallet address not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recipient's profile to get wallet address
    const { data: toProfile, error: toError } = await supabase
      .from('profiles')
      .select('connected_address')
      .eq('fid', toFid)
      .maybeSingle();

    if (toError || !toProfile?.connected_address) {
      console.error("Recipient profile not found:", toError);
      return new Response(
        JSON.stringify({ success: false, message: 'Recipient wallet address not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromAddress = fromProfile.connected_address as `0x${string}`;
    const toAddress = toProfile.connected_address as `0x${string}`;

    console.log("Addresses resolved:", { fromAddress, toAddress });

    // Determine which config to use (super tip or regular)
    let tipAmount: number;
    let tokenAddress: string;
    let tokenSymbol: string;

    if (useSuperTip && superTipConfig) {
      // Use super tip configuration
      console.log("Using super tip config:", superTipConfig);
      tipAmount = superTipConfig.amount;
      tokenAddress = superTipConfig.token_address;
      tokenSymbol = superTipConfig.token_symbol;
    } else {
      // Fetch regular tip configuration for the user
      const { data: tipConfig, error: configError } = await supabase
        .from('tip_configs')
        .select('*')
        .eq('fid', fromFid)
        .eq('interaction_type', interactionType)
        .eq('is_enabled', true)
        .maybeSingle();

      if (configError) {
        throw new Error(`Config fetch error: ${configError.message}`);
      }

      if (!tipConfig) {
        console.log("No tip configuration found for this interaction type");
        return new Response(
          JSON.stringify({ success: false, message: 'No tip configuration found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Tip config found:", tipConfig);
      tipAmount = tipConfig.amount;
      tokenAddress = tipConfig.token_address;
      tokenSymbol = tipConfig.token_symbol;
    }

    // Create viem clients
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(),
    });

    // Get token decimals
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    const amountInWei = parseUnits(tipAmount.toString(), decimals);

    // Check on-chain allowance from the CeloTip contract
    const onChainAllowance = await publicClient.readContract({
      address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
      abi: CELOTIP_ABI,
      functionName: 'getUserAllowance',
      args: [fromAddress, tokenAddress as `0x${string}`],
    });

    console.log("On-chain allowance:", formatUnits(onChainAllowance, decimals));

    if (onChainAllowance < amountInWei) {
      console.log("Insufficient on-chain allowance");
      
      // Send notification to tipper that their allowance ran out
      await sendLowAllowanceNotification(fromFid, tokenSymbol, supabase);
      
      return new Response(
        JSON.stringify({ success: false, message: 'Insufficient token allowance. Please approve more tokens.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record first
    const { data: transaction, error: txInsertError } = await supabase
      .from('transactions')
      .insert({
        from_fid: fromFid,
        to_fid: toFid,
        amount: tipAmount,
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        interaction_type: interactionType,
        cast_hash: castHash || null,
        status: 'pending',
      })
      .select()
      .single();

    if (txInsertError) {
      throw new Error(`Transaction insert error: ${txInsertError.message}`);
    }

    console.log("Transaction record created:", transaction.id);

    // Execute on-chain transaction
    try {
      const account = privateKeyToAccount(`0x${relayerPrivateKey}` as `0x${string}`);
      
      const walletClient = createWalletClient({
        account,
        chain: celo,
        transport: http(),
      });

      console.log("Executing sendTip on contract...");

      const txHash = await walletClient.writeContract({
        address: CELOTIP_CONTRACT_ADDRESS as `0x${string}`,
        abi: CELOTIP_ABI,
        functionName: 'sendTip',
        args: [
          fromAddress,
          toAddress,
          tokenAddress as `0x${string}`,
          amountInWei,
          interactionType,
          castHash || ''
        ],
      });

      console.log("Transaction submitted:", txHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1,
      });

      console.log("Transaction confirmed:", receipt.status);

      if (receipt.status === 'success') {
        // Update transaction record with success
        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            tx_hash: txHash,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        console.log("Tip sent successfully!");

        return new Response(
          JSON.stringify({ 
            success: true, 
            txHash,
            amount: tipAmount,
            tokenSymbol: tokenSymbol,
            transaction: { ...transaction, status: 'completed', tx_hash: txHash }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error('Transaction reverted');
      }

    } catch (txError: any) {
      console.error("Transaction execution failed:", txError);

      // Update transaction record with failure
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          error_message: txError.message || 'Transaction failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Transaction failed: ${txError.message}`,
          transaction: { ...transaction, status: 'failed' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error("Error processing tip:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
