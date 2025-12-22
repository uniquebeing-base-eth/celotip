import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailySummary {
  fid: number;
  tipsSent: number;
  tipsSentAmount: { [token: string]: number };
  tipsReceived: number;
  tipsReceivedAmount: { [token: string]: number };
}

async function sendDailySummaryNotification(
  fid: number,
  summary: DailySummary,
  supabase: any
): Promise<void> {
  try {
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

    // Format amounts for display
    const sentTokens = Object.entries(summary.tipsSentAmount)
      .map(([token, amount]) => `${amount.toFixed(2)} ${token}`)
      .join(', ');
    
    const receivedTokens = Object.entries(summary.tipsReceivedAmount)
      .map(([token, amount]) => `${amount.toFixed(2)} ${token}`)
      .join(', ');

    let bodyText = '';
    if (summary.tipsSent > 0 && summary.tipsReceived > 0) {
      bodyText = `📤 Sent: ${sentTokens} (${summary.tipsSent} tips)\n📥 Received: ${receivedTokens} (${summary.tipsReceived} tips)`;
    } else if (summary.tipsSent > 0) {
      bodyText = `📤 You sent ${sentTokens} across ${summary.tipsSent} tip${summary.tipsSent > 1 ? 's' : ''}!`;
    } else if (summary.tipsReceived > 0) {
      bodyText = `📥 You received ${receivedTokens} from ${summary.tipsReceived} tip${summary.tipsReceived > 1 ? 's' : ''}!`;
    } else {
      // No activity, skip notification
      return;
    }

    console.log(`Sending daily summary to FID ${fid}`);
    
    const notificationId = `daily-summary-${Date.now()}-${fid}`;
    
    const notificationPayload = {
      notificationId,
      title: `Your CeloTip Daily Summary 📊`,
      body: bodyText,
      targetUrl: 'https://celotip.vercel.app/',
      tokens: [tokenData.token],
    };

    const response = await fetch(tokenData.notification_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload),
    });

    console.log("Daily summary notification response:", response.status);
    
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
    console.error("Error sending daily summary notification:", error);
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

    console.log("Starting daily tip summary job...");

    // Get transactions from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', yesterday.toISOString());

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    console.log(`Found ${transactions?.length || 0} completed transactions in the last 24 hours`);

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No transactions to summarize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate by user
    const userSummaries: Map<number, DailySummary> = new Map();

    for (const tx of transactions) {
      // Process sender (tips sent)
      if (!userSummaries.has(tx.from_fid)) {
        userSummaries.set(tx.from_fid, {
          fid: tx.from_fid,
          tipsSent: 0,
          tipsSentAmount: {},
          tipsReceived: 0,
          tipsReceivedAmount: {},
        });
      }
      const senderSummary = userSummaries.get(tx.from_fid)!;
      senderSummary.tipsSent++;
      senderSummary.tipsSentAmount[tx.token_symbol] = 
        (senderSummary.tipsSentAmount[tx.token_symbol] || 0) + Number(tx.amount);

      // Process recipient (tips received)
      if (!userSummaries.has(tx.to_fid)) {
        userSummaries.set(tx.to_fid, {
          fid: tx.to_fid,
          tipsSent: 0,
          tipsSentAmount: {},
          tipsReceived: 0,
          tipsReceivedAmount: {},
        });
      }
      const recipientSummary = userSummaries.get(tx.to_fid)!;
      recipientSummary.tipsReceived++;
      recipientSummary.tipsReceivedAmount[tx.token_symbol] = 
        (recipientSummary.tipsReceivedAmount[tx.token_symbol] || 0) + Number(tx.amount);
    }

    console.log(`Sending summaries to ${userSummaries.size} users`);

    // Send notifications to all users with activity
    const notificationPromises: Promise<void>[] = [];
    for (const [fid, summary] of userSummaries) {
      notificationPromises.push(sendDailySummaryNotification(fid, summary, supabase));
    }

    await Promise.all(notificationPromises);

    console.log("Daily summary job completed");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent summaries to ${userSummaries.size} users`,
        transactionCount: transactions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in daily summary job:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
