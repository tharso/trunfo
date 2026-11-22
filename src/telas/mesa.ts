// Como a tela fala das pessoas da mesa, no modo solo (você e o Computador) e na
// sala (você e os Apelidos). Só nomes; quem ganhou e por quê vêm das regras.
import type { MotivoDeSaida } from "../regras";

export interface NomeNaTela {
  /** Rótulo curto, no placar e na faixa do duelo: "Computador", "Ana". */
  nome: string;
  /** Começo de frase: "O computador ganhou.", "Ana ganhou.". */
  sujeito: string;
  /** Depois de "Carta": "Carta do computador", "Carta de Ana". */
  de: string;
}

/** Na sala, cada pessoa é chamada pelo Apelido. */
export function nomeDoApelido(apelido: string): NomeNaTela {
  return { nome: apelido, sujeito: apelido, de: `de ${apelido}` };
}

/** Como uma rodada terminou para a pessoa `voce`, pelo vencedor do evento (`null` é empate). */
export function rodadaPara(vencedor: number | null, voce: number): "ganhar" | "perder" | "empate" {
  if (vencedor === null) return "empate";
  return vencedor === voce ? "ganhar" : "perder";
}

/** As iniciais do Apelido no placar de 3 ou 4 pessoas: "Ana" → "A", "Ana Clara" → "AC", "Ana 2" → "A2". */
export function iniciaisDoApelido(apelido: string): string {
  return apelido
    .split(" ")
    .filter((palavra) => palavra !== "")
    .slice(0, 2)
    .map((palavra) => palavra[0].toLocaleUpperCase("pt-BR"))
    .join("");
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
