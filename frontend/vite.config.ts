import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API teče na drugem portu; prek proxyja ostanejo piškotki na istem izvoru.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:3000",
    },
  },
});
