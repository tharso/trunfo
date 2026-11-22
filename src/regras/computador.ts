// O Computador joga limpo: a escolha dele recebe só a carta de cima do próprio
// monte, o nível e o sorteio. Não vê o resto do estado (docs/spec.md, parte 4).
import { sortear, type Sorteio } from "./sorteio";
import { ATRIBUTOS, type Carta, type ChaveAtributo, type Nivel } from "./tipos";

export function escolhaDoComputador(
  carta: Carta,
  nivel: Nivel,
  sorteio: Sorteio,
): { atributo: ChaveAtributo; sorteio: Sorteio } {
  // `carta` ainda não é usada no Fácil; o Normal (ticket 26) compara as notas dela.
  void carta;
  if (nivel === "normal") throw new Error("O nível Normal ainda não existe (ticket 26).");
  const r = sortear(sorteio, ATRIBUTOS.length);
  return { atributo: ATRIBUTOS[r.valor], sorteio: r.sorteio };
}
