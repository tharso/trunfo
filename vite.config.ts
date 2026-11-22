import { cloudflare } from "@cloudflare/vite-plugin";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Cores do tema: as mesmas de src/estilo.css (--fundo) e do <meta name="theme-color">.
const corDoTema = "#0f172a";

export default defineConfig({
  plugins: [
    preact(),
    cloudflare(),
    // PWA (spec, parte técnica): instala na tela inicial e o modo solo roda sem
    // internet depois da primeira visita. O service worker (sw.js) é servido sem
    // cache: ver public/_headers.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeManifestIcons: false, // os ícones já entram pelo globPatterns
      manifest: {
        name: "Super Trunfo Ciclismo",
        short_name: "Super Trunfo",
        description: "Jogo de cartas de ciclismo: escolha um atributo e vença a rodada.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: corDoTema,
        theme_color: corDoTema,
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Tudo o que o jogo precisa fica no precache (o baralho vem dentro do JS; as
        // fotos das cartas, ~300 KB, em public/fotos/).
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,json,woff2}"],
        // wrangler.json vai para o dist/ mas não é servido (.assetsignore do plugin
        // da Cloudflare); se entrasse no precache, a instalação do SW falharia.
        globIgnores: ["wrangler.json"],
        // SPA: qualquer navegação sem internet abre o index.html do precache.
        navigateFallback: "/index.html",
        // /sala/* é do Durable Object (multiplayer): o SW nunca responde por ela.
        // A página do link da sala é /s/<código>, que cai no index.html como as outras.
        navigateFallbackDenylist: [/^\/sala\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
