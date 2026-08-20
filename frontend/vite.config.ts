import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // The local Express API defaults to port 3000 (see backend/src/server.ts).
  // VITE_API_PROXY_TARGET can be set when developing against another API host.
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  return {
  server: {
    host: "::",
    port: 8080,
    proxy: {
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
