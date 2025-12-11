import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Farcaster mini app webhook events
type MiniAppEvent = 
  | 'miniapp_added' 
  | 'miniapp_removed' 
  | 'notifications_enabled' 
  | 'notifications_disabled';

interface WebhookPayload {
  event: MiniAppEvent;
  notificationDetails?: {
    url: string;
    token: string;
  };
  fid?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    console.log("Mini app webhook received:", JSON.stringify(payload, null, 2));

    const { event, notificationDetails } = payload;

    // Extract FID from the request - Neynar managed webhooks include fid
    // For Farcaster direct webhooks, we'd need to verify the signature
    let fid: number | undefined = payload.fid;

    // If no fid in payload, try to get from query params (Neynar passes it)
    if (!fid) {
      const url = new URL(req.url);
      const fidParam = url.searchParams.get('fid');
      if (fidParam) {
        fid = parseInt(fidParam, 10);
      }
    }

    // Handle events
    switch (event) {
      case 'miniapp_added':
        if (notificationDetails?.token && notificationDetails?.url) {
          console.log(`Storing notification token for miniapp_added event`);
          
          if (!fid) {
            console.warn("No FID found in payload, cannot store token");
            return new Response(
              JSON.stringify({ success: true, message: 'Event received but no FID to associate token' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Upsert notification token
          const { error } = await supabase
            .from('notification_tokens')
            .upsert({
              fid,
              token: notificationDetails.token,
              notification_url: notificationDetails.url,
              is_valid: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'fid' });

          if (error) {
            console.error("Error storing notification token:", error);
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Notification token stored for FID ${fid}`);

          // Send welcome notification
          try {
            const welcomePayload = {
              notificationId: `welcome-${Date.now()}-${fid}`,
              title: "Welcome to CeloTip! 🎉",
              body: "Engage. Tip. Earn. Configure your auto-tipping settings to start rewarding your favorite creators!",
              targetUrl: 'https://celotip.vercel.app/settings',
              tokens: [notificationDetails.token],
            };

            const welcomeResponse = await fetch(notificationDetails.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(welcomePayload),
            });

            console.log("Welcome notification response:", welcomeResponse.status);
          } catch (welcomeError) {
            console.error("Error sending welcome notification:", welcomeError);
          }
        }
        break;

      case 'notifications_enabled':
        if (notificationDetails?.token && notificationDetails?.url) {
          console.log(`Storing notification token for notifications_enabled event`);
          
          if (!fid) {
            console.warn("No FID found in payload, cannot store token");
            return new Response(
              JSON.stringify({ success: true, message: 'Event received but no FID to associate token' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Upsert notification token
          const { error } = await supabase
            .from('notification_tokens')
            .upsert({
              fid,
              token: notificationDetails.token,
              notification_url: notificationDetails.url,
              is_valid: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'fid' });

          if (error) {
            console.error("Error storing notification token:", error);
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Notification token stored for FID ${fid}`);
        }
        break;

      case 'miniapp_removed':
      case 'notifications_disabled':
        if (fid) {
          console.log(`Invalidating notification token for FID ${fid}, event: ${event}`);
          
          // Mark token as invalid
          const { error } = await supabase
            .from('notification_tokens')
            .update({ 
              is_valid: false, 
              updated_at: new Date().toISOString() 
            })
            .eq('fid', fid);

          if (error) {
            console.error("Error invalidating notification token:", error);
          } else {
            console.log(`Notification token invalidated for FID ${fid}`);
          }
        }
        break;

      default:
        console.log("Unknown event type:", event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error processing mini app webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
