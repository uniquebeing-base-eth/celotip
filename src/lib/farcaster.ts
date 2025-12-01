import sdk from "@farcaster/frame-sdk";

let isSDKInitialized = false;

export const initializeFarcasterSDK = async () => {
  if (isSDKInitialized) {
    console.log("Farcaster SDK already initialized");
    return;
  }

  try {
    // Let the Farcaster host know the mini app is ready to be shown
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
