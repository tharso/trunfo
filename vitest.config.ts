import { defineConfig } from "vitest/config";

// Testes de unidade (o módulo de regras em src/regras/). Ficam fora do Vite do
// site para não subir o runtime da Cloudflare só para rodar TS puro.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
