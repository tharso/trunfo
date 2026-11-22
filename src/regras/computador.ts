// O Computador joga limpo: a escolha dele recebe só a carta de cima do próprio
// monte, o nível, o sorteio e o baralho. O baralho é fixo e público (as mesmas
// 32 cartas sempre), então não diz nada da partida: o Computador continua sem
// ver o monte, a mesa ou o que já saiu (docs/spec.md, parte 4).
import { sortear, type Sorteio } from "./sorteio";
import { ATRIBUTOS, type Carta, type ChaveAtributo, type Nivel } from "./tipos";

export function escolhaDoComputador(
  carta: Carta,
  nivel: Nivel,
  sorteio: Sorteio,
  baralho: readonly Carta[],
): { atributo: ChaveAtributo; sorteio: Sorteio } {
  // Fácil: sorteia entre os seis. Normal: sorteia só entre os melhores (se há um só, não sorteia).
  const candidatos = nivel === "facil" ? ATRIBUTOS : melhoresAtributos(carta, baralho);
  if (candidatos.length === 1) return { atributo: candidatos[0], sorteio };
  const r = sortear(sorteio, candidatos.length);
  return { atributo: candidatos[r.valor], sorteio: r.sorteio };
}

/**
 * Nível Normal: os atributos em que a carta ganha de mais cartas do baralho.
 * Ganhar é ter nota maior; nota igual não conta. Compara só as notas: no duelo
 * de 2 pessoas, Super Trunfo e Carta A somam o mesmo em todos os atributos e
 * não mudam qual é o melhor.
 */
function melhoresAtributos(carta: Carta, baralho: readonly Carta[]): ChaveAtributo[] {
  const outras = baralho.filter((c) => c.codigo !== carta.codigo);
  const ganhaDe = ATRIBUTOS.map((a) => outras.filter((o) => carta.notas[a] > o.notas[a]).length);
  const maximo = Math.max(...ganhaDe);
  return ATRIBUTOS.filter((_, i) => ganhaDe[i] === maximo);
}
