// O que um caminho pede ao Worker. `/sala/nova` cria uma sala; `/sala/<código>`
// (e o que vier depois) é a conexão com o Durable Object daquela sala; o resto
// é arquivo estático (`null`). A página da sala, para o link, é `/s/<código>`.
import { lerCodigo } from "../sala/codigo";

export type Rota = { tipo: "criar" } | { tipo: "sala"; codigo: string } | { tipo: "naoExiste" };

export function rotaDaSala(caminho: string): Rota | null {
  const partes = /^\/sala\/([^/]*)/.exec(caminho);
  if (!partes) return null;
  if (partes[1] === "nova") return { tipo: "criar" };
  // O código vem em maiúsculas (a tela já normaliza): "abc" não é a sala ABC.
  const codigo = lerCodigo(partes[1]);
  return codigo !== null && codigo === partes[1] ? { tipo: "sala", codigo } : { tipo: "naoExiste" };
}
