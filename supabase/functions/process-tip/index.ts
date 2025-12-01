import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TipRequest {
  fromFid: number;
  toFid: number;
  interactionType: string;
  castHash?: string;
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

    const { fromFid, toFid, interactionType, castHash }: TipRequest = await req.json();

    console.log("Processing tip:", { fromFid, toFid, interactionType, castHash });

    // Fetch tip configuration for the user
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
      return new Response(
        JSON.stringify({ success: false, message: 'No tip configuration found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token approval
    const { data: approval, error: approvalError } = await supabase
      .from('token_approvals')
      .select('*')
      .eq('fid', fromFid)
      .eq('token_address', tipConfig.token_address)
      .maybeSingle();

    if (approvalError) {
      throw new Error(`Approval fetch error: ${approvalError.message}`);
    }

    if (!approval || approval.spent_amount + tipConfig.amount > approval.approved_amount) {
      return new Response(
        JSON.stringify({ success: false, message: 'Insufficient allowance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Execute blockchain transaction via smart contract
    // This would call the CeloTip smart contract to transfer tokens
    // For now, we'll create a pending transaction record
    
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        from_fid: fromFid,
        to_fid: toFid,
        amount: tipConfig.amount,
        token_address: tipConfig.token_address,
        token_symbol: tipConfig.token_symbol,
        interaction_type: interactionType,
        cast_hash: castHash,
        status: 'pending',
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Transaction insert error: ${txError.message}`);
    }

    // Update spent amount
    await supabase
      .from('token_approvals')
      .update({
        spent_amount: approval.spent_amount + tipConfig.amount,
      })
      .eq('id', approval.id);

    console.log("Tip processed successfully:", transaction);

    return new Response(
      JSON.stringify({ success: true, transaction }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
