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
  webServer: {
    command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
