import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_TARGET || "https://localhost:64115",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
