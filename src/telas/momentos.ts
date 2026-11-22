// Momentos da partida que pedem som e vibração (docs/spec.md, parte 7).
// As telas só avisam que o momento aconteceu, pela prop `aoMomento`; quem toca
// o som e vibra (ticket 28) escuta esses avisos. Nada aqui muda regra.

export type Momento =
  /** Você tocou numa linha da carta (tique curto). */
  | { tipo: "escolha" }
  /** O duelo começou ("largada"). */
  | { tipo: "largada" }
  /** Uma barra do duelo começou a subir e sobe por `duracaoMs` (tique-taque). */
  | { tipo: "barra"; quem: "voce" | "computador"; duracaoMs: number }
  /** O resultado da rodada apareceu. `pulou`: chegou pelo "Pular ⏩" ou pelo toque na tela. */
  | { tipo: "resultado"; resultado: "ganhar" | "perder" | "empate"; pulou: boolean }
  /** A tela Fim apareceu: a partida acabou. */
  | { tipo: "fim"; resultado: "vitoria" | "derrota" | "empate" };

export type AoMomento = (momento: Momento) => void;
