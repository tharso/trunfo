// O Worker do site: /sala/<código> vai para o Durable Object da sala; o resto
// são os arquivos estáticos (SPA). wrangler.jsonc põe /sala/* em
// run_worker_first, então só essas rotas passam por aqui antes dos assets.
import { codigoDaSala } from "./rota";

export { Sala } from "./sala";

export default {
  async fetch(pedido, env): Promise<Response> {
    const codigo = codigoDaSala(new URL(pedido.url).pathname);
    if (codigo === null) return env.ASSETS.fetch(pedido);
    return env.SALA.getByName(codigo).fetch(pedido);
  },
} satisfies ExportedHandler<Env>;
