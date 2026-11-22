// Tipos públicos do módulo de regras. Tudo é dado simples (números, textos,
// listas, objetos): o Estado vira JSON e volta igual.
import type { Sorteio } from "./sorteio";

export const ATRIBUTOS = ["sprint", "explosao", "montanha", "contrarrelogio", "pave", "voltas"] as const;

/** A chave de um dos seis atributos da carta. */
export type ChaveAtributo = (typeof ATRIBUTOS)[number];

/**
 * O que as regras precisam de uma carta. A carta do baralho.json tem mais
 * campos (equipe, cores...); eles passam junto e as regras ignoram.
 */
export interface Carta {
  codigo: string;
  nome: string;
  notas: Record<ChaveAtributo, number>;
  superTrunfo: boolean;
  cartaA: boolean;
}

/** O jeito de jogar do Computador. */
export type Nivel = "facil" | "normal";

export type TipoDePessoa = "humano" | "computador";

/** Por que uma pessoa está fora da partida. */
export type MotivoDeSaida = "semCartas" | "saiu";

/** Uma pessoa na mesa. O índice dela em `Estado.pessoas` é a Ordem da mesa. */
export interface Pessoa {
  tipo: TipoDePessoa;
  /** Códigos das cartas; a primeira é a carta de cima, a última é o fundo. */
  monte: string[];
  /** `null` enquanto está na partida. */
  fora: MotivoDeSaida | null;
}

/**
 * - `todasAsCartas`: só uma pessoa ficou na partida;
 * - `limiteDeRodadas`: chegou à rodada 100 (ganha quem tem mais cartas; empate se igual);
 * - `semCartas`: todo mundo ficou sem cartas num empate (a partida termina empatada);
 * - `saida`: alguém saiu no meio e sobrou uma pessoa.
 */
export type MotivoDoFim = "todasAsCartas" | "limiteDeRodadas" | "semCartas" | "saida";

export interface Fim {
  /** Índice da pessoa que ganhou, ou `null` se a partida terminou empatada. */
  vencedor: number | null;
  motivo: MotivoDoFim;
  rodadasJogadas: number;
}

export interface Estado {
  /** As cartas desta partida (o baralho inteiro). */
  baralho: Carta[];
  /** Na Ordem da mesa. */
  pessoas: Pessoa[];
  nivel: Nivel;
  /** Cartas no meio da mesa depois de um empate. */
  monteDeEmpate: string[];
  /** Índice de quem escolhe o atributo da rodada atual. */
  quemEscolhe: number;
  /** Número da rodada atual (começa em 1). */
  rodada: number;
  limiteDeRodadas: number;
  /** Semente atual da fonte de sorteio. */
  sorteio: Sorteio;
  /** `null` enquanto a partida não acabou. */
  fim: Fim | null;
}

export type Acao =
  /** Uma pessoa (não o Computador) escolhe o atributo da rodada. */
  | { tipo: "escolher"; pessoa: number; atributo: ChaveAtributo }
  /** O Computador escolhe o atributo (é a vez dele) e a rodada é disputada. */
  | { tipo: "computadorEscolhe" }
  /** Uma pessoa sai da partida no meio. As cartas dela saem do jogo. */
  | { tipo: "sair"; pessoa: number };

/**
 * Por que a rodada terminou como terminou:
 * - `nota`: a nota mais alta ganhou;
 * - `superTrunfo`: o Super Trunfo ganhou;
 * - `cartaA`: havia Carta A contra o Super Trunfo (com 2 cartas na mesa, a Carta A
 *   ganhou; com 3–4, o Super Trunfo saiu da disputa e a nota mais alta ganhou);
 * - `empate`: as cartas foram para o Monte de empate.
 */
export type MotivoDaRodada = "nota" | "superTrunfo" | "cartaA" | "empate";

export type Evento =
  | {
      tipo: "rodada";
      rodada: number;
      quemEscolheu: number;
      atributo: ChaveAtributo;
      /** As cartas de cima de quem estava na partida, na Ordem da mesa. */
      mesa: { pessoa: number; codigo: string; nota: number }[];
      /** `null` no empate. */
      vencedor: number | null;
      motivo: MotivoDaRodada;
      /** Quantas cartas o vencedor leva (as da mesa + o monte de empate). 0 no empate. */
      cartasLevadas: number;
      /** Quantas das cartas levadas vieram do Monte de empate. 0 no empate. */
      doMonteDeEmpate: number;
    }
  | { tipo: "saiu"; pessoa: number; motivo: MotivoDeSaida }
  | ({ tipo: "fim" } & Fim);
