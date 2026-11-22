// Retrospecto (docs/spec.md, parte 8; GLOSSARY.md): vitórias, derrotas e empates
// contra o Computador, por Nível. Só o modo solo conta. Funções puras.
import type { Estado, Nivel } from "./tipos";

export interface PlacarDoNivel {
  vitorias: number;
  derrotas: number;
  empates: number;
}

export type Retrospecto = Record<Nivel, PlacarDoNivel>;

/** Como a partida acabou para uma pessoa. `saida` é sair no meio, e conta como derrota. */
export type ResultadoDaPartida = "vitoria" | "derrota" | "empate" | "saida";

export function retrospectoVazio(): Retrospecto {
  return {
    facil: { vitorias: 0, derrotas: 0, empates: 0 },
    normal: { vitorias: 0, derrotas: 0, empates: 0 },
  };
}

/** Soma uma partida ao retrospecto do nível. Devolve um retrospecto novo. */
export function registrarPartida(retrospecto: Retrospecto, nivel: Nivel, resultado: ResultadoDaPartida): Retrospecto {
  const placar = { ...retrospecto[nivel] };
  if (resultado === "vitoria") placar.vitorias += 1;
  else if (resultado === "empate") placar.empates += 1;
  else placar.derrotas += 1;
  return { ...retrospecto, [nivel]: placar };
}

/** O resultado de uma partida que acabou, para a pessoa `pessoa`. `null` se ainda não acabou. */
export function resultadoDaPartida(estado: Estado, pessoa: number): ResultadoDaPartida | null {
  if (!estado.fim) return null;
  if (estado.pessoas[pessoa].fora === "saiu") return "saida";
  if (estado.fim.vencedor === null) return "empate";
  return estado.fim.vencedor === pessoa ? "vitoria" : "derrota";
}
