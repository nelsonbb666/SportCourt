// Configuración para construir la web destinada a GitHub Pages.
// Uso: npm run build:gh-pages  (genera dist-ghpages/)
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Plugin: incrusta TODO el JS y CSS dentro del propio index.html.
// MOTIVO: los navegadores BLOQUEAN los módulos ES externos cuando la
// página se abre con file:// (CORS), dejando la pantalla en blanco.
// Con el JS/CSS inlineados, el index.html funciona con doble clic Y en GitHub Pages.
function inlineAll(): Plugin {
  return {
    name: "inline-all",
    enforce: "post",
    generateBundle(_options, bundle) {
      const htmlEntry = Object.entries(bundle).find(([f]) => f.endsWith(".html"));
      if (!htmlEntry) return;
      const chunk = htmlEntry[1] as any;
      let html: string = chunk.source;

      for (const [file, asset] of Object.entries(bundle)) {
        if ((asset as any).type !== "asset") continue;
        const isJs = file.endsWith(".js");
        const isCss = file.endsWith(".css");
        if (!isJs && !isCss) continue;
        // El src/href puede venir ANTES o DESPUÉS de otros atributos (p.ej. crossorigin):
        // buscamos todas las etiquetas y elegimos la que contenga este archivo.
        const tags = isJs
          ? Array.from(html.matchAll(/<script\b[^>]*>\s*<\/script>/g))
          : Array.from(html.matchAll(/<link\b[^>]*>/g));
        const match = tags.find((m) => m[0].includes(file));
        if (!match || match.index === undefined) {
          this.warn(`No se encontró la etiqueta de ${file} en el HTML`);
          continue;
        }
        const content = String((asset as any).source);
        const replacement = isJs
          ? `<script>\n${content}\n</script>`
          : `<style>\n${content}\n</style>`;
        html =
          html.slice(0, match.index) +
          replacement +
          html.slice(match.index + match[0].length);
        delete bundle[file]; // no emitir el archivo suelto
      }
      chunk.source = html;
      console.log("[inline-all] index.html 100% autocontenido (funciona con file://)");
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineAll()],
  base: "./", // rutas relativas: funciona en GitHub Pages y abriendo index.html directo
  build: {
    outDir: "dist-ghpages",
    emptyOutDir: true,
  },
});
