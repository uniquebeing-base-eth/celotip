import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neynar-signature',
};

// Neynar webhook event types that trigger tips
const TIP_TRIGGER_EVENTS = ['cast.created', 'reaction.created', 'follow.created'];

interface NeynarWebhookPayload {
  type: string;
  data: {
    // For cast.created (comments/quotes)
    hash?: string;
    text?: string;
    author?: {
      fid: number;
      username: string;
      display_name?: string;
      pfp_url?: string;
    };
    parent_hash?: string;
    parent_author?: {
      fid: number;
    };
    // For reaction.created (likes, recasts)
    reaction_type?: string; // 'like' or 'recast'
    user?: {
      fid: number;
      username: string;
      display_name?: string;
      pfp_url?: string;
    };
    cast?: {
      hash: string;
      author: {
        fid: number;
        username: string;
        display_name?: string;
        pfp_url?: string;
      };
    };
    // For follow.created
    follower?: {
      fid: number;
      username: string;
      display_name?: string;
      pfp_url?: string;
    };
    following?: {
      fid: number;
      username: string;
      display_name?: string;
      pfp_url?: string;
    };
  };
}

// Verify Neynar webhook signature
async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  const webhookSecret = Deno.env.get('NEYNAR_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.warn("NEYNAR_WEBHOOK_SECRET not set, skipping verification");
    return true; // Allow if no secret configured (for testing)
  }
  
  if (!signature) {
    console.error("No signature provided in request");
    return false;
  }
  
  try {
    const hmac = createHmac('sha512', webhookSecret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

// Send notification to recipient about received tip
async function sendTipNotification(
  recipientFid: number,
  senderUsername: string,
  amount: number,
  tokenSymbol: string,
  interactionType: string
): Promise<void> {
  const neynarApiKey = Deno.env.get('NEYNAR_API_KEY');
  if (!neynarApiKey) {
    console.warn("NEYNAR_API_KEY not set, skipping notification");
    return;
  }

  try {
    const interactionText = interactionType === 'like' ? 'liking' 
      : interactionType === 'recast' ? 'recasting'
      : interactionType === 'comment' ? 'commenting on'
      : interactionType === 'quote' ? 'quoting'
      : interactionType === 'follow' ? 'following'
      : interactionType;

    const notificationUrl = 'https://api.neynar.com/v2/farcaster/notifications/send';
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': neynarApiKey,
      },
      body: JSON.stringify({
        target_fids: [recipientFid],
        notification: {
          title: `You received a tip! 🎉`,
          body: `@${senderUsername} tipped you ${amount} ${tokenSymbol} for ${interactionText} your cast via CeloTip!`,
          target_url: 'https://celotip.vercel.app',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send notification:", errorText);
    } else {
      console.log("Notification sent to FID:", recipientFid);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw body for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-neynar-signature');
    
    // Verify webhook signature
    const isValid = await verifySignature(bodyText, signature);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NeynarWebhookPayload = JSON.parse(bodyText);
    console.log("Neynar webhook received:", JSON.stringify(payload, null, 2));

    const { type, data } = payload;

    if (!TIP_TRIGGER_EVENTS.includes(type)) {
      console.log("Event type not supported for tipping:", type);
      return new Response(
        JSON.stringify({ success: true, message: 'Event type not supported' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fromFid: number | undefined;
    let toFid: number | undefined;
    let interactionType: string | undefined;
    let castHash: string | undefined;
    let castText: string | undefined;
    let senderUsername: string | undefined;

    // Parse event type and extract relevant data
    if (type === 'reaction.created') {
      fromFid = data.user?.fid;
      toFid = data.cast?.author?.fid;
      castHash = data.cast?.hash;
      senderUsername = data.user?.username;
      
      if (data.reaction_type === 'like') {
        interactionType = 'like';
      } else if (data.reaction_type === 'recast') {
        interactionType = 'recast';
      }
    } else if (type === 'cast.created') {
      fromFid = data.author?.fid;
      toFid = data.parent_author?.fid;
      castHash = data.parent_hash;
      castText = data.text;
      senderUsername = data.author?.username;
      
      // Check if it's a quote or a reply (comment)
      if (data.parent_hash) {
        interactionType = 'comment';
      }
    } else if (type === 'follow.created') {
      fromFid = data.follower?.fid;
      toFid = data.following?.fid;
      interactionType = 'follow';
      senderUsername = data.follower?.username;
    }

    // Validate we have the required data
    if (!fromFid || !toFid || !interactionType) {
      console.log("Missing required data:", { fromFid, toFid, interactionType });
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required webhook data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Don't tip yourself
    if (fromFid === toFid) {
      console.log("Skipping self-interaction");
      return new Response(
        JSON.stringify({ success: true, message: 'Self-interaction skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Processing tip:", { fromFid, toFid, interactionType, castHash, senderUsername });

    // Check if the sender has CeloTip configured
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('connected_address')
      .eq('fid', fromFid)
      .maybeSingle();

    if (profileError || !profile?.connected_address) {
      console.log("Sender not registered in CeloTip:", fromFid);
      return new Response(
        JSON.stringify({ success: true, message: 'Sender not registered in CeloTip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if recipient is registered (we need their wallet)
    let recipientAddress: string | null = null;
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('connected_address')
      .eq('fid', toFid)
      .maybeSingle();

    // If recipient not registered, try to fetch and store their address via Neynar
    if (recipientError || !recipientProfile?.connected_address) {
      console.log("Recipient not registered in CeloTip, fetching from Neynar...");
      
      const neynarApiKey = Deno.env.get('NEYNAR_API_KEY');
      if (neynarApiKey) {
        try {
          const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${toFid}`,
            { headers: { 'api_key': neynarApiKey } }
          );
          
          if (neynarResponse.ok) {
            const neynarData = await neynarResponse.json();
            const recipientUser = neynarData.users?.[0];
            
            if (recipientUser) {
              recipientAddress = recipientUser.verified_addresses?.eth_addresses?.[0] || recipientUser.custody_address;
              
              if (recipientAddress) {
                // Upsert recipient profile
                await supabase
                  .from('profiles')
                  .upsert({
                    fid: toFid,
                    username: recipientUser.username,
                    display_name: recipientUser.display_name,
                    pfp_url: recipientUser.pfp_url,
                    connected_address: recipientAddress,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'fid' });
                
                console.log("Recipient profile created with address:", recipientAddress);
              } else {
                console.log("Recipient has no wallet address");
                return new Response(
                  JSON.stringify({ success: true, message: 'Recipient has no wallet address' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        } catch (neynarError) {
          console.error("Error fetching recipient from Neynar:", neynarError);
        }
      }
    } else {
      recipientAddress = recipientProfile.connected_address;
    }

    // Check for super tip if it's a comment or quote
    let useSuperTip = false;
    let superTipConfig: any = null;
    
    if ((interactionType === 'comment' || interactionType === 'quote') && castText) {
      const { data: superConfig } = await supabase
        .from('super_tip_configs')
        .select('*')
        .eq('fid', fromFid)
        .eq('is_enabled', true)
        .maybeSingle();

      if (superConfig && castText.toLowerCase().includes(superConfig.trigger_phrase.toLowerCase())) {
        useSuperTip = true;
        superTipConfig = superConfig;
        console.log("Super tip triggered with phrase:", superConfig.trigger_phrase);
      }
    }

    // Call the process-tip function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const processTipResponse = await fetch(`${supabaseUrl}/functions/v1/process-tip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        fromFid,
        toFid,
        interactionType,
        castHash,
        useSuperTip,
        superTipConfig,
      }),
    });

    const processTipResult = await processTipResponse.json();
    console.log("Process tip result:", processTipResult);

    // Send notification to recipient if tip was successful
    if (processTipResult.success && processTipResult.txHash && senderUsername) {
      const tipAmount = useSuperTip ? superTipConfig?.amount : processTipResult.amount;
      const tipToken = useSuperTip ? superTipConfig?.token_symbol : processTipResult.tokenSymbol;
      
      await sendTipNotification(toFid, senderUsername, tipAmount, tipToken, interactionType);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        tipResult: processTipResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
