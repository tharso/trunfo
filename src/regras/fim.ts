// Contas do fim (da rodada e da partida) que as telas mostram, no solo e na sala.
// Funções puras; a tela só escolhe o texto.
import type { Fim, MotivoDeSaida } from "./tipos";

export type ResultadoParaPessoa = "vitoria" | "derrota" | "empate";

/** Pelo vencedor de uma rodada ou partida (`null` é empate): vitória, derrota ou empate para a pessoa `pessoa`. */
export function resultadoDoVencedor(vencedor: number | null, pessoa: number): ResultadoParaPessoa {
  if (vencedor === null) return "empate";
  return vencedor === pessoa ? "vitoria" : "derrota";
}

/** Pelo fim da partida (o que a sala manda): vitória, derrota ou empate para a pessoa `pessoa`. */
export function resultadoDoFim(fim: Fim, pessoa: number): ResultadoParaPessoa {
  return resultadoDoVencedor(fim.vencedor, pessoa);
}

/**
 * Quem ficou sem cartas no empate que acabou a partida (motivo
 * `ultimaNaPartida`): com 2 pessoas, é quem não ganhou. Com 3 ou 4, ou por
 * outro motivo, `null`.
 */
export function quemFicouSemCartas(fim: Fim, pessoas: number): number | null {
  if (fim.motivo !== "ultimaNaPartida" || pessoas !== 2 || fim.vencedor === null) return null;
  return 1 - fim.vencedor;
}

/**
 * A ordem da lista do fim na sala (spec, parte 9, item 20): os índices das
 * pessoas por cartas no monte, quem saiu da partida no fim. Empate de cartas
 * segue a Ordem da mesa.
 */
export function ordemDoFim(pessoas: { cartas: number; fora: MotivoDeSaida | null }[]): number[] {
  const saiu = (i: number) => Number(pessoas[i].fora === "saiu");
  return pessoas.map((_, i) => i).sort((a, b) => saiu(a) - saiu(b) || pessoas[b].cartas - pessoas[a].cartas || a - b);
}
