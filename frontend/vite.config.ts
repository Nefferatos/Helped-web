import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { ServerResponse } from "node:http";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // The local Express API defaults to port 3000 (see backend/src/server.ts).
  // VITE_API_PROXY_TARGET can be set when developing against another API host.
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";
  // The AI Command Center is implemented by the Cloudflare Worker, where it
  // securely calls the Make.com AI-agent webhook. Keep this separate from the
  // legacy Express API so Vite development matches the deployed route.
  const workerApiProxyTarget = process.env.VITE_WORKER_API_PROXY_TARGET || "http://127.0.0.1:8787";

  return {
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/ai/command-center": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      // The public AI receptionist calls Make.com through the Worker so local
      // development follows the same secure webhook path as production.
      "/api/ai/receptionist": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      // Google Sheets agency reports live in the Cloudflare Worker, not the
      // legacy Express API. Keep this above the generic "/api" entry so Vite
      // matches the more specific prefix first.
      "/api/reports": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      // WhatsApp broadcast uploads relay through the Worker so the Make
      // webhook URL stays server-side in development and production.
      "/api/whatsapp-broadcast": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      // Referral intake and lead management are implemented by the Worker.
      // Keep these more-specific routes above the generic Express `/api` proxy.
      "/api/ats/referral-leads": {
        target: workerApiProxyTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (error, _request, response) => {
            console.error("Referral API Worker proxy failed:", error.message);
            const serverResponse = response as ServerResponse;
            if (typeof serverResponse.writeHead !== "function" || serverResponse.headersSent || serverResponse.writableEnded) return;
            serverResponse.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
            serverResponse.end(JSON.stringify({
              error: "Referral service is unavailable. Start the full app from the project root so its Cloudflare Worker runs on port 8787.",
            }));
          });
        },
      },
      "/api/ats/public/referrals": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      // FDW application chatbot + Make blueprint events live in the Worker
      // (they need MAKE_WEBHOOK_URL_FDW_CHATBOT + the Google Sheets service
      // account secret). Route to the Worker, not the Express API.
      "/api/fdw": {
        target: workerApiProxyTarget,
        changeOrigin: true,
      },
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      "/uploads": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          const normalizedId = id.replace(/\\/g, "/");

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          if (normalizedId.includes("/node_modules/react-router")) {
            return "router";
          }

          if (normalizedId.includes("/node_modules/@tanstack/")) {
            return "query";
          }

          if (normalizedId.includes("/node_modules/@supabase/")) {
            return "supabase";
          }

          if (
            normalizedId.includes("/node_modules/xlsx/") ||
            normalizedId.includes("/node_modules/jszip/") ||
            normalizedId.includes("/node_modules/pdf-lib/")
          ) {
            return "document-tools";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
