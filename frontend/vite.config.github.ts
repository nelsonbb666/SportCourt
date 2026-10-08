// Configuración para construir la web destinada a GitHub Pages.
// Uso: npm run build:gh-pages  (genera dist-ghpages/)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // viteSingleFile incrusta TODO el JS y CSS dentro del propio index.html.
  // MOTIVO: los navegadores BLOQUEAN los módulos ES externos cuando la
  // página se abre con file:// (CORS), dejando la pantalla en blanco.
  // Con el JS/CSS inlineados, el index.html funciona con doble clic Y en GitHub Pages.
  plugins: [react(), viteSingleFile()],
  base: "./", // rutas relativas: funciona en GitHub Pages y abriendo index.html directo
  build: {
    outDir: "dist-ghpages",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
