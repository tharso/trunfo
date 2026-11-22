// "Jogar com amigos" na tela (docs/spec.md, parte 9): textos usados por mais de
// uma tela. As decisões da sala são de src/sala/sala.ts; os números vêm de lá.
import type { MotivoDaRecusa } from "../sala/protocolo";
import { MAXIMO_DE_PESSOAS, MINIMO_PARA_COMECAR } from "../sala/sala";

export const PRECISA_DE_INTERNET = "Precisa de internet";

/** Embaixo de "Começar" e "Jogar de novo" desligados. */
export const COMECA_COM = `Começa com ${MINIMO_PARA_COMECAR} a ${MAXIMO_DE_PESSOAS} pessoas.`;

export const MOTIVO_DA_RECUSA: Record<MotivoDaRecusa, string> = {
  cheia: `Esta sala está cheia: já tem ${MAXIMO_DE_PESSOAS} pessoas.`,
  emPartida: "Esta sala está no meio de uma partida. Durante a partida, ninguém entra.",
  acabou: "Esta sala já acabou",
};
