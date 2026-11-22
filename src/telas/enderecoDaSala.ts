// O endereço da página da sala (docs/spec.md, parte 9, item 3).

/**
 * A página do link da sala. Não é /sala/<código>: essa é a rota do WebSocket
 * (o Worker manda para o Durable Object). /s/<código> é arquivo do site (SPA).
 */
export function caminhoDaSala(codigo: string): string {
  return `/s/${codigo}`;
}

/** O código do link (/s/<código>), se a página foi aberta por um. */
export function codigoDoCaminho(caminho: string): string | null {
  return /^\/s\/([^/]+)\/?$/.exec(caminho)?.[1] ?? null;
}
