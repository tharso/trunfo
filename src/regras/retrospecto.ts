// Retrospecto (docs/spec.md, parte 8; GLOSSARY.md): vitórias, derrotas e empates
// contra o Computador, por Nível. Só o modo solo conta. Funções puras.
import type { Estado, Nivel } from "./tipos";

export interface RetrospectoDoNivel {
  vitorias: number;
  derrotas: number;
  empates: number;
}

export type Retrospecto = Record<Nivel, RetrospectoDoNivel>;

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
  const doNivel = { ...retrospecto[nivel] };
  if (resultado === "vitoria") doNivel.vitorias += 1;
  else if (resultado === "empate") doNivel.empates += 1;
  else doNivel.derrotas += 1;
  return { ...retrospecto, [nivel]: doNivel };
}

/** O resultado de uma partida que acabou, para a pessoa `pessoa`. `null` se ainda não acabou. */
export function resultadoDaPartida(estado: Estado, pessoa: number): ResultadoDaPartida | null {
  if (!estado.fim) return null;
  if (estado.pessoas[pessoa].fora === "saiu") return "saida";
  if (estado.fim.vencedor === null) return "empate";
  return estado.fim.vencedor === pessoa ? "vitoria" : "derrota";
}
