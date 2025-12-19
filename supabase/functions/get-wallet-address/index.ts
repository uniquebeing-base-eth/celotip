import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NEYNAR_API_BASE = "https://api.neynar.com/v2";

interface NeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
  custody_address?: string;
}

interface NeynarUserResponse {
  users: NeynarUser[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fid } = await req.json();

    if (!fid) {
      return new Response(
        JSON.stringify({ error: "FID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const neynarApiKey = Deno.env.get("NEYNAR_API_KEY");
    
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Neynar API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Fetch user data from Neynar API
    const response = await fetch(`${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        accept: "application/json",
        api_key: neynarApiKey,
      },
    });

    if (!response.ok) {
      console.error("Neynar API error:", response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user data from Neynar" }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data: NeynarUserResponse = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Priority: verified ETH addresses > custody address
    let walletAddress = null;
    
    const ethAddresses = user.verified_addresses?.eth_addresses;
    if (ethAddresses && ethAddresses.length > 0) {
      walletAddress = ethAddresses[0];
    } else if (user.custody_address) {
      walletAddress = user.custody_address;
    }

    return new Response(
      JSON.stringify({ walletAddress }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in get-wallet-address function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
