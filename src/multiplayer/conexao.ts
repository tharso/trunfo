import PartySocket from "partysocket";

// Abre a conexão com a sala `codigo` (Durable Object atrás de /sala/<código>).
// partysocket reconecta sozinho quando a rede cai ou o servidor reinicia.
export function conectarSala(codigo: string): PartySocket {
  return new PartySocket({
    host: location.host,
    protocol: location.protocol === "https:" ? "wss" : "ws",
    basePath: `sala/${encodeURIComponent(codigo)}`,
  });
}
