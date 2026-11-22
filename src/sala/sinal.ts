// O sinal de vida da conexão: o celular manda "ping" de tempos em tempos e a
// Sala responde "pong" sem acordar o Durable Object
// (`ctx.setWebSocketAutoResponse`). Um celular que perde o sinal sem o navegador
// disparar `offline` deixa o socket "pendurado": o celular reconecta quando o
// pong não vem (src/multiplayer/sinal.ts) e a Sala trata como queda o socket
// calado (src/worker/sala.ts). Usado dos dois lados: só constantes e contas.

export const PING = "ping";
export const PONG = "pong";

/** De quanto em quanto tempo o celular manda ping (ms). Sem pong até o próximo, reconecta. */
export const INTERVALO_DO_PING = 10_000;

/** A Sala trata como queda o socket sem ping há este tempo (ms). */
export const SILENCIO_MAXIMO = 30_000;

/**
 * O socket aberto em `abertoEm` e com o último ping em `ultimoPing` (`null`:
 * nenhum ainda) está calado há `SILENCIO_MAXIMO` ou mais.
 */
export function semSinal(abertoEm: number, ultimoPing: number | null, agora: number): boolean {
  return agora - Math.max(abertoEm, ultimoPing ?? 0) >= SILENCIO_MAXIMO;
}
