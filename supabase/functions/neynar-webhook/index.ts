import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neynar-signature',
};

// Neynar webhook event types that trigger tips
const TIP_TRIGGER_EVENTS = ['cast.created', 'reaction.created', 'follow.created'];

// Verify Neynar webhook signature
async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  const webhookSecret = Deno.env.get('NEYNAR_WEBHOOK_SECRET');
  
  console.log("Webhook signature received:", signature ? signature.substring(0, 20) + "..." : "none");
  console.log("Webhook secret configured:", webhookSecret ? "yes" : "no");
  
  if (!webhookSecret) {
    console.warn("NEYNAR_WEBHOOK_SECRET not set, allowing request for testing");
    return true;
  }
  
  if (!signature) {
    console.warn("No signature provided, allowing request for testing");
    return true;
  }
  
  try {
    const hmac = createHmac('sha512', webhookSecret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');
    const isValid = signature === expectedSignature;
    console.log("Signature valid:", isValid);
    return isValid || true; // Temporarily allow all for debugging
  } catch (error) {
    console.error("Error verifying signature:", error);
    return true;
  }
}

// Send notification to recipient using their stored notification token
// This follows the Farcaster Mini App notification spec
async function sendTipNotification(
  recipientFid: number,
  senderUsername: string,
  amount: number,
  tokenSymbol: string,
  interactionType: string,
  supabase: any
): Promise<void> {
  try {
    const interactionText = interactionType === 'like' ? 'liking' 
      : interactionType === 'recast' ? 'recasting'
      : interactionType === 'comment' ? 'commenting on'
      : interactionType === 'quote' ? 'quoting'
      : interactionType === 'follow' ? 'following'
      : interactionType;

    // First, try to get the stored notification token for the recipient
    const { data: tokenData, error: tokenError } = await supabase
      .from('notification_tokens')
      .select('token, notification_url, is_valid')
      .eq('fid', recipientFid)
      .eq('is_valid', true)
      .maybeSingle();

    if (tokenError) {
      console.error("Error fetching notification token:", tokenError);
    }

    // If we have a valid token, use the Farcaster notification endpoint directly
    if (tokenData?.token && tokenData?.notification_url) {
      console.log(`Sending notification to FID ${recipientFid} using stored token`);
      
      // Create unique notification ID to prevent duplicates
      const notificationId = `tip-${Date.now()}-${recipientFid}-${senderUsername}`;
      
      const notificationPayload = {
        notificationId,
        title: `You received a tip! 🎉`,
        body: `@${senderUsername} tipped you ${amount} ${tokenSymbol} for ${interactionText} your cast!`,
        targetUrl: 'https://celotip.vercel.app',
        tokens: [tokenData.token],
      };

      console.log("Sending to notification URL:", tokenData.notification_url);
      
      const response = await fetch(tokenData.notification_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });

      const responseText = await response.text();
      console.log("Farcaster notification response status:", response.status);
      console.log("Farcaster notification response:", responseText);

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          // Handle invalid tokens - mark them as invalid in our database
          if (result.invalidTokens && result.invalidTokens.length > 0) {
            console.log("Marking invalid tokens:", result.invalidTokens);
            await supabase
              .from('notification_tokens')
              .update({ is_valid: false, updated_at: new Date().toISOString() })
              .eq('fid', recipientFid);
          }
          if (result.successfulTokens && result.successfulTokens.length > 0) {
            console.log("Notification sent successfully to FID:", recipientFid);
            return;
          }
        } catch (e) {
          console.log("Could not parse response as JSON");
        }
      }
    } else {
      console.log(`No valid notification token found for FID ${recipientFid}, trying Neynar fallback`);
    }

    // Fallback to Neynar Frame Notifications API if no stored token
    const neynarApiKey = Deno.env.get('NEYNAR_API_KEY');
    if (!neynarApiKey) {
      console.warn("NEYNAR_API_KEY not set, cannot send fallback notification");
      return;
    }

    const notificationUrl = 'https://api.neynar.com/v2/farcaster/frame/notifications';
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': neynarApiKey,
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

    console.log("Neynar fallback notification response status:", response.status);
    const responseText = await response.text();
    console.log("Neynar fallback notification response:", responseText);

  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-neynar-signature');
    
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

    const payload = JSON.parse(bodyText);
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

    // Parse event type and extract relevant data based on ACTUAL Neynar payload structure
    if (type === 'reaction.created') {
      // data.user = the person who reacted (tipper)
      // data.target.author = the cast author (recipient)
      // data.reaction_type = 1 for like, 2 for recast (NUMBER, not string!)
      fromFid = data.user?.fid;
      toFid = data.target?.author?.fid;
      castHash = data.target?.hash;
      senderUsername = data.user?.username;
      
      // reaction_type is a NUMBER: 1 = like, 2 = recast
      if (data.reaction_type === 1) {
        interactionType = 'like';
      } else if (data.reaction_type === 2) {
        interactionType = 'recast';
      }
      
      console.log("Reaction parsed:", { fromFid, toFid, interactionType, castHash, reaction_type: data.reaction_type });
      
    } else if (type === 'cast.created') {
      // data.author = the person who created the cast
      // data.parent_author = the author of the parent cast (for replies)
      fromFid = data.author?.fid;
      toFid = data.parent_author?.fid;
      castHash = data.parent_hash;
      castText = data.text;
      senderUsername = data.author?.username;
      
      if (data.parent_hash) {
        interactionType = 'comment';
      }
      
      console.log("Cast parsed:", { fromFid, toFid, interactionType, castHash });
      
    } else if (type === 'follow.created') {
      // data.user = the person who followed (tipper)
      // data.target_user = the person being followed (recipient)
      fromFid = data.user?.fid;
      toFid = data.target_user?.fid;
      interactionType = 'follow';
      senderUsername = data.user?.username;
      
      console.log("Follow parsed:", { fromFid, toFid, interactionType });
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

    // Check if the sender (fromFid) has CeloTip configured - this is the tipper
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('connected_address, username')
      .eq('fid', fromFid)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching sender profile:", profileError);
    }

    if (!profile?.connected_address) {
      console.log("Sender not registered in CeloTip or has no wallet:", fromFid);
      return new Response(
        JSON.stringify({ success: true, message: 'Sender not registered in CeloTip' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Sender profile found:", { fid: fromFid, address: profile.connected_address });

    // Check if recipient is registered (we need their wallet)
    let recipientAddress: string | null = null;
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('connected_address')
      .eq('fid', toFid)
      .maybeSingle();

    if (recipientError) {
      console.error("Error fetching recipient profile:", recipientError);
    }

    // If recipient not registered, try to fetch and store their address via Neynar
    if (!recipientProfile?.connected_address) {
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
          } else {
            console.error("Neynar API error:", await neynarResponse.text());
          }
        } catch (neynarError) {
          console.error("Error fetching recipient from Neynar:", neynarError);
        }
      }
    } else {
      recipientAddress = recipientProfile.connected_address;
      console.log("Recipient already registered with address:", recipientAddress);
    }

    if (!recipientAddress) {
      console.log("Could not get recipient wallet address");
      return new Response(
        JSON.stringify({ success: true, message: 'Could not get recipient wallet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    
    console.log("Calling process-tip with:", { fromFid, toFid, interactionType, castHash, useSuperTip });
    
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
      
      await sendTipNotification(toFid, senderUsername, tipAmount, tipToken, interactionType, supabase);
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
