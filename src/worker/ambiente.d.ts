// Variáveis de build que o Vite troca no código do Worker (import.meta.env).
interface ImportMetaEnv {
  /** Só no build do teste Playwright: fixa a semente das partidas da sala. */
  readonly VITE_SEMENTE_DA_SALA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
