// Importer les polyfills en premier
import "./polyfills";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThirdwebProvider } from "thirdweb/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { WalletProvider } from "@/context/WalletContext";
import App from "./App";
import "./index.css";

// Create a client
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThirdwebProvider>
      <WalletProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </WalletProvider>
    </ThirdwebProvider>
  </QueryClientProvider>
);
