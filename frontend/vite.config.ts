import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  server: {
    port: 8080,
    strictPort: false,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({ server: { entry: "src/server.ts" } }),
    ...(isVercel ? [nitro({ preset: "vercel" })] : []),
    react(),
  ],
});
