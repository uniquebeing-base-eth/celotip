import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { castHashes } = await req.json();
    
    if (!castHashes || !Array.isArray(castHashes) || castHashes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'castHashes array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const neynarApiKey = Deno.env.get('NEYNAR_API_KEY');
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 20 hashes per request
    const limitedHashes = castHashes.slice(0, 20);
    console.log("Fetching cast details for:", limitedHashes.length, "casts");

    // Fetch cast details from Neynar
    const castsData: Record<string, { text: string; timestamp: string }> = {};
    
    // Neynar bulk cast lookup
    const hashesParam = limitedHashes.join(',');
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/casts?casts=${encodeURIComponent(hashesParam)}`,
      {
        headers: {
          'api_key': neynarApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Neynar API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cast details', casts: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Neynar response received, casts:", data.result?.casts?.length || 0);

    // Map the results
    if (data.result?.casts) {
      for (const cast of data.result.casts) {
        castsData[cast.hash] = {
          text: cast.text || '',
          timestamp: cast.timestamp || '',
        };
      }
    }

    console.log("Returning cast details for", Object.keys(castsData).length, "casts");

    return new Response(
      JSON.stringify({ casts: castsData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error fetching cast details:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
