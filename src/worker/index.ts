// O Worker do site. wrangler.jsonc põe /sala/* em run_worker_first, então só
// essas rotas passam por aqui antes dos assets:
// - POST /sala/nova sorteia um código livre e devolve { codigo };
// - /sala/<código> vai para o Durable Object da sala (WebSocket).
// O resto são os arquivos estáticos (SPA), inclusive a página do link, /s/<código>.
import { sortearCodigo } from "../sala/codigo";
import { rotaDaSala } from "./rota";

export { Sala } from "./sala";

// 24³ = 13.824 códigos. Com poucas salas abertas, o primeiro sorteio quase
// sempre está livre; o limite só evita laço sem fim.
const TENTATIVAS = 20;

function aleatorio(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export default {
  async fetch(pedido, env): Promise<Response> {
    const rota = rotaDaSala(new URL(pedido.url).pathname);
    if (rota === null) return env.ASSETS.fetch(pedido);
    if (rota.tipo === "naoExiste") return new Response("Sala não encontrada.", { status: 404 });
    if (rota.tipo === "sala") return env.SALA.getByName(rota.codigo).fetch(pedido);

    if (pedido.method !== "POST") return new Response("Use POST.", { status: 405, headers: { Allow: "POST" } });
    // Cada código é um DO; o DO só reserva se o código está livre (ele roda uma
    // coisa de cada vez, então dois pedidos não pegam o mesmo código).
    for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
      const codigo = sortearCodigo(aleatorio);
      if (await env.SALA.getByName(codigo).reservar(codigo)) return Response.json({ codigo });
    }
    return new Response("Nenhum código livre agora.", { status: 503 });
  },
} satisfies ExportedHandler<Env>;
