
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeFarcasterSDK } from "./lib/farcaster";

// Initialize Farcaster SDK in background (non-blocking)
initializeFarcasterSDK();

createRoot(document.getElementById("root")!).render(<App />);
