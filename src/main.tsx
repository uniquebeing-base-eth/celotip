import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeFarcasterSDK } from "./lib/farcaster";

// Initialize Farcaster SDK when app loads
initializeFarcasterSDK().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
