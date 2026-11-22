// A sensação "Suspense" (docs/spec.md, parte 7): cada Momento da partida vira
// som e vibração. O 🔇 desliga só o som; a vibração continua.
import type { AoMomento, Momento } from "./momentos";
import { somLigado } from "./preferenciaDeSom";
import { pararTiqueTaque, tocar, type Som } from "./som";
import { vibrar } from "./vibracao";

/** Padrões de vibração da tabela da parte 7 (ms). */
const VIBRACAO = {
  largada: [15, 90, 15],
  ganhar: [50, 60, 120],
  perder: [200],
  empate: [30, 60, 30],
  vitoria: [80, 60, 80, 60, 200],
  derrota: [300],
} as const satisfies Record<string, number[]>;

function somEVibracao(momento: Momento): { som: Som; duracaoMs?: number; vibracao?: readonly number[] } {
  switch (momento.tipo) {
    case "escolha":
      return { som: "tique" };
    case "largada":
      return { som: "largada", vibracao: VIBRACAO.largada };
    case "barra":
      return { som: "tiqueTaque", duracaoMs: momento.duracaoMs };
    case "resultado":
    case "fim":
      // A spec só fala de vitória e derrota no fim; o empate da partida usa o som e a vibração do empate.
      return { som: momento.resultado, vibracao: VIBRACAO[momento.resultado] };
  }
}

/** Toca o som (se ligado) e vibra (se o aparelho vibra) para cada Momento. */
export const sentir: AoMomento = (momento) => {
  // O resultado (inclusive pelo "Pular ⏩") corta o tique-taque que ainda estiver tocando.
  if (momento.tipo === "resultado") pararTiqueTaque();
  const { som, duracaoMs, vibracao } = somEVibracao(momento);
  if (somLigado()) tocar(som, duracaoMs);
  if (vibracao) vibrar([...vibracao]);
};
