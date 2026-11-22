// Módulo de regras (ADR 0001; docs/spec.md, partes 3 e 4).
// TypeScript puro: sem tela, sem rede, sem DOM. Estado + ação → novo estado + eventos.
// O modo solo usa este módulo no celular; a sala do multiplayer vai usar o mesmo depois.
//
// Interface:
//   criarPartida({ baralho, pessoas, nivel, semente }) → Estado
//   aplicar(estado, acao) → { estado, eventos }
//   cartaDeCima(estado, pessoa), atributoDoComputador(estado): leituras para a tela
//   escolhaDoComputador(carta, nivel, sorteio, baralho): a escolha do Computador, que só vê a própria carta (e o baralho fixo)
//   retrospectoVazio(), registrarPartida(retrospecto, nivel, resultado), resultadoDaPartida(estado, pessoa): o Retrospecto
//
// O Estado é dado simples: vira JSON e volta igual (é o que se guarda no celular).
// Testes de unidade ao lado, em `*.test.ts` (rodam com `npm test`).
export { escolhaDoComputador } from "./computador";
export { LIMITE_DE_RODADAS, aplicar, atributoDoComputador, cartaDeCima, criarPartida } from "./partida";
export type { NovaPartida } from "./partida";
export { registrarPartida, resultadoDaPartida, retrospectoVazio } from "./retrospecto";
export type { RetrospectoDoNivel, ResultadoDaPartida, Retrospecto } from "./retrospecto";
export type { Sorteio } from "./sorteio";
export { ATRIBUTOS } from "./tipos";
export type {
  Acao,
  Carta,
  ChaveAtributo,
  Estado,
  Evento,
  EventoDaRodada,
  Fim,
  MotivoDaRodada,
  MotivoDeSaida,
  MotivoDoFim,
  Nivel,
  Pessoa,
  TipoDePessoa,
} from "./tipos";
