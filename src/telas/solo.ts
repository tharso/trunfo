// O modo solo na tela: quem é quem na mesa e o nome dos Níveis. Só nomes; a regra
// é do módulo de regras.
import type { Nivel } from "../regras";

// No modo solo, a Ordem da mesa é: você, depois o Computador.
export const VOCE = 0;
export const COMPUTADOR = 1;

export const NOME_DO_NIVEL: Record<Nivel, string> = {
  facil: "Fácil",
  normal: "Normal",
};
