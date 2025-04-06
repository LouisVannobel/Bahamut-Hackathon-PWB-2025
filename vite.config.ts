import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Obtenir le chemin du répertoire actuel
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "client", "src"),
      '@shared': path.resolve(__dirname, "shared"),
      '@assets': path.resolve(__dirname, "attached_assets"),
    },
  },
  define: {
    'global': 'window',
    'process.env': {},
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
