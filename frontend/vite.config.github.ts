// Configuración para construir la web destinada a GitHub Pages.
// Uso: npm run build:gh-pages  (genera dist-ghpages/)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // rutas relativas: funciona en GitHub Pages y abriendo index.html directo
  build: {
    outDir: "dist-ghpages",
  },
});
