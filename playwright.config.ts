import { defineConfig, devices } from "@playwright/test";

// PORTA no ambiente permite rodar vários worktrees ao mesmo tempo.
const porta = Number(process.env.PORTA ?? 4173);

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${porta}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // Sobe a versão de produção (build + preview no runtime do Worker).
  // Cada rodada sobe o seu servidor: reaproveitar um servidor já na porta
  // testaria o build de outro worktree. Porta ocupada = erro (--strictPort);
  // use PORTA=<outra> para rodar dois worktrees ao mesmo tempo.
  webServer: {
    command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Só no build do teste: a sala sorteia sempre a mesma partida (src/worker/sala.ts).
    // Com ela, e todo mundo escolhendo Sprint, Ana (a 1ª da mesa) começa, ganha
    // as 7 primeiras rodadas e fica com todas as cartas na 20ª (e2e/partida-sala.spec.ts).
    // Os tempos da sala também encurtam (src/worker/sala.ts): queda de rede em
    // 20 s em vez de 60 (dá para cair 10 s e voltar) e Cutucar em 3 s em vez de 30
    // (e2e/queda-sala.spec.ts), e a sala sem ninguém fecha em 5 s em vez de 10 min
    // (e2e/vida-sala.spec.ts).
    env: {
      VITE_SEMENTE_DA_SALA: "9966",
      VITE_TEMPO_DE_QUEDA_DA_SALA: "20000",
      VITE_TEMPO_DE_CUTUCAR_DA_SALA: "3000",
      VITE_TEMPO_DA_SALA_VAZIA: "5000",
    },
  },
});
