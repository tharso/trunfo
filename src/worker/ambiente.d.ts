// Variáveis de build que o Vite troca no código do Worker (import.meta.env).
interface ImportMetaEnv {
  /** Só no build do teste Playwright: fixa a semente das partidas da sala. */
  readonly VITE_SEMENTE_DA_SALA?: string;
  /** Só no build do teste Playwright: o tempo de queda da sala, em ms (60 s no site). */
  readonly VITE_TEMPO_DE_QUEDA_DA_SALA?: string;
  /** Só no build do teste Playwright: o tempo para cutucar, em ms (30 s no site). */
  readonly VITE_TEMPO_DE_CUTUCAR_DA_SALA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
