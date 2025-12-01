import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 10, cursor } = await req.json().catch(() => ({}));

    // Fetch trending casts from Neynar Feed API
    const url = new URL('https://api.neynar.com/v2/farcaster/feed/trending');
    url.searchParams.set('limit', limit.toString());
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Neynar response to our app format
    const transformedCasts = data.casts.map((cast: any) => ({
      id: cast.hash,
      author: cast.author.username,
      authorFid: cast.author.fid,
      authorPfp: cast.author.pfp_url,
      authorDisplayName: cast.author.display_name,
      content: cast.text,
      timestamp: cast.timestamp,
      // Placeholder for tip data (would come from our database in production)
      totalTips: 0,
      topTippers: [],
    }));

    return new Response(
      JSON.stringify({
        casts: transformedCasts,
        next: data.next?.cursor || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching trending casts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
