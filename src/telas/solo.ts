// O modo solo na tela: quem é quem na mesa e o nome dos Níveis. Só nomes; a regra
// é do módulo de regras.
import type { Nivel } from "../regras";
import type { NomeNaTela } from "./mesa";

// No modo solo, a Ordem da mesa é: você, depois o Computador.
export const VOCE = 0;
export const COMPUTADOR = 1;

/** Os nomes da mesa do modo solo, na Ordem da mesa. (A tela chama quem olha de "Você".) */
export const NOMES_DO_SOLO: NomeNaTela[] = [
  { nome: "Você", sujeito: "Você", de: "sua" },
  { nome: "Computador", sujeito: "O computador", de: "do computador" },
];

export const NOME_DO_NIVEL: Record<Nivel, string> = {
  facil: "Fácil",
  normal: "Normal",
};
