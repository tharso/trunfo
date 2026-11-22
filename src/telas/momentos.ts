// Momentos da partida que pedem som e vibração (docs/spec.md, parte 7).
// As telas só avisam que o momento aconteceu, pela prop `aoMomento`; quem toca
// o som e vibra (ticket 28) escuta esses avisos. Nada aqui muda regra.

import type { ResultadoParaPessoa } from "../regras";

export type Momento =
  /** Você tocou numa linha da carta (tique curto). */
  | { tipo: "escolha" }
  /** O duelo começou ("largada"). */
  | { tipo: "largada" }
  /** Uma barra do duelo começou a subir e sobe por `duracaoMs` (tique-taque). */
  | { tipo: "barra"; duracaoMs: number }
  /** O resultado da rodada apareceu (também pelo "Pular ⏩" ou pelo toque na tela). */
  | { tipo: "resultado"; resultado: ResultadoParaPessoa }
  /** A tela Fim apareceu: a partida acabou. */
  | { tipo: "fim"; resultado: ResultadoParaPessoa };

export type AoMomento = (momento: Momento) => void;
