import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  envDir: path.resolve(import.meta.dirname, "../.."),
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Proxy Convex sync WebSocket + API through the same port
      // so exit nodes / firewalls can't block port 3210
      "/api": {
        target: "http://100.115.177.85:3210",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

export default config;
