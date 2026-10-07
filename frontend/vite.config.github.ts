// Configuración para construir la web destinada a GitHub Pages.
// Uso: npm run build:gh-pages  (genera dist-ghpages/)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/SportCourt/", // = nombre del repositorio en GitHub
  build: {
    outDir: "dist-ghpages",
  },
});
