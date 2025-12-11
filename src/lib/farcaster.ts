import sdk from "@farcaster/frame-sdk";
import { supabase } from "@/integrations/supabase/client";

let isSDKInitialized = false;

export const initializeFarcasterSDK = async () => {
  if (isSDKInitialized) {
    console.log("Farcaster SDK already initialized");
    return;
  }

  try {
    // Make sure the farcaster host knows the mini app is ready 
    await sdk.actions.ready();

    const context = await sdk.context;
    console.log("Farcaster SDK initialized with context:", context);

    isSDKInitialized = true;
    return context;
  } catch (error) {
    console.error("Failed to initialize Farcaster SDK:", error);
    // SDK might not be available in development/non-Farcaster environments
    // This is expected and not an error
    return null;
  }
};

export const getFarcasterUser = async () => {
  try {
    if (!isSDKInitialized) {
      await initializeFarcasterSDK();
    }
    
    const context = await sdk.context;
    return {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      pfpUrl: context.user.pfpUrl,
    };
  } catch (error) {
    console.error("Failed to get Farcaster user:", error);
    return null;
  }
};

export const getWalletAddress = async (): Promise<string | null> => {
  try {
    // Get user FID first
    const user = await getFarcasterUser();
    
    if (!user?.fid) {
      console.error("No user FID available");
      return null;
    }

    // Call edge function to fetch wallet address from Neynar API
    const { data, error } = await supabase.functions.invoke('get-wallet-address', {
      body: { fid: user.fid }
    });

    if (error) {
      console.error("Error fetching wallet address:", error);
      return null;
    }

    return data?.walletAddress || null;
  } catch (error) {
    console.error("Failed to get wallet address:", error);
    return null;
  }
};

export const openUrl = (url: string) => {
  try {
    sdk.actions.openUrl(url);
  } catch (error) {
    console.error("Failed to open URL:", error);
    // Fallback to window.open for non-Farcaster environments
    window.open(url, "_blank");
  }
};

export const closeFrame = () => {
  try {
    sdk.actions.close();
  } catch (error) {
    console.error("Failed to close frame:", error);
  }
};

// Share content to Farcaster using the SDK's composeCast action
export const shareToFarcaster = async (options: {
  text?: string;
  embeds?: string[];
}) => {
  try {
    // Use the SDK's composeCast action to open the cast composer
    await sdk.actions.composeCast({
      text: options.text || '',
      embeds: options.embeds as [`https://${string}`, `https://${string}`] | [`https://${string}`] | undefined,
    });
    console.log("Farcaster cast composer opened");
    return true;
  } catch (error) {
    console.error("Failed to share to Farcaster:", error);
    // Fallback: open Warpcast web composer
    const text = encodeURIComponent(options.text || '');
    const embedUrl = options.embeds?.[0] ? `&embeds[]=${encodeURIComponent(options.embeds[0])}` : '';
    window.open(`https://warpcast.com/~/compose?text=${text}${embedUrl}`, "_blank");
    return false;
  }
};

// Prompt user to add the mini app for notifications
export const promptAddMiniApp = async () => {
  try {
    const result = await sdk.actions.addMiniApp();
    console.log("addMiniApp result:", result);
    return result;
  } catch (error) {
    console.error("Failed to add mini app:", error);
    return null;
  }
};

// Get notification details if available from context
export const getNotificationDetails = async () => {
  try {
    const context = await sdk.context;
    // Check if we're coming from a notification
    if (context.location?.type === 'notification') {
      return context.location.notification;
    }
    return null;
  } catch (error) {
    console.error("Failed to get notification details:", error);
    return null;
  }
};
