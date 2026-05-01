import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/upload": { target: apiTarget, changeOrigin: true },
      "/files": { target: apiTarget, changeOrigin: true },
      "/extract": { target: apiTarget, changeOrigin: true },
      "/translate": { target: apiTarget, changeOrigin: true },
      "/generate-lesson": { target: apiTarget, changeOrigin: true },
      "/generate-images": { target: apiTarget, changeOrigin: true },
      "/generate-simulation": { target: apiTarget, changeOrigin: true },
      "/generate-contextual-content": { target: apiTarget, changeOrigin: true },
      "/media-provider-status": { target: apiTarget, changeOrigin: true },
      "/api/tts": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
    },
  },
});
