// O que a tela lê do baralho.json além do que as regras guardam (código, nome e
// notas): nome dos atributos, equipe, cores, iniciais, país. Só visual.
import baralho from "../dados/baralho.json";
import type { Carta, ChaveAtributo } from "../regras";

type CartaDoBaralho = (typeof baralho.cartas)[number];

const DO_BARALHO = new Map<string, CartaDoBaralho>(baralho.cartas.map((c) => [c.codigo, c]));

export const NOME_DO_ATRIBUTO = Object.fromEntries(baralho.atributos.map((a) => [a.chave, a.nome])) as Record<
  ChaveAtributo,
  string
>;

/** Cores de reserva, para uma carta que não está no baralho. */
const CORES_DE_RESERVA = ["#334155", "#94a3b8"];

/**
 * A carta como o baralho a descreve, com cores e iniciais sempre presentes
 * (se a carta não está no baralho, `dados` é `undefined` e valem as de reserva).
 */
export function aparencia(carta: Carta): { dados: CartaDoBaralho | undefined; cores: string[]; iniciais: string } {
  const dados = DO_BARALHO.get(carta.codigo);
  return {
    dados,
    cores: dados?.cores ?? CORES_DE_RESERVA,
    iniciais: dados?.iniciais ?? carta.nome.slice(0, 2),
  };
}
