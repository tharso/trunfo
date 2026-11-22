import { defineConfig } from "@vite-pwa/assets-generator/config";

// Gera os ícones PNG do PWA a partir de public/icone.svg: `npm run icones`.
// Os PNG ficam commitados em public/; rode de novo só se o SVG mudar.
const fundo = "#0f172a"; // mesma cor do tema (index.html e estilo.css)

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    transparent: { sizes: [192, 512], padding: 0, favicons: [] },
    // Maskable e apple sem margem: o desenho já fica dentro da zona segura,
    // e o fundo da cor do tema preenche os cantos arredondados do SVG.
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: fundo } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: fundo } },
  },
  images: ["public/icone.svg"],
});
