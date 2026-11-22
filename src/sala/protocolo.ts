// As mensagens do WebSocket entre o celular e a Sala (Durable Object). JSON em
// texto. O celular manda MensagemDoCliente; a Sala responde com MensagemDaSala.
// Este arquivo é usado dos dois lados (tela e Worker): só tipos e leitura.
import { ATRIBUTOS, type ChaveAtributo, type EventoDaRodada, type Fim, type MotivoDaRodada, type MotivoDoFim } from "../regras";

export const TAMANHO_MAXIMO_DO_APELIDO = 20;

export type MensagemDoCliente =
  /** Entrar (ou voltar) na sala. `id` é o identificador secreto guardado no celular. */
  | { tipo: "entrar"; id: string; apelido: string }
  /** Só o Anfitrião, com 2 a 4 pessoas. */
  | { tipo: "comecar" }
  /** Ir embora da sala (antes da partida ou no fim dela). */
  | { tipo: "sair" }
  /** Quem escolhe diz o atributo da rodada. */
  | { tipo: "escolher"; atributo: ChaveAtributo };

/** Uma pessoa como as outras a veem: sem o identificador secreto. */
export interface PessoaVisivel {
  apelido: string;
  conectada: boolean;
}

/** Por que a sala não deixou a pessoa entrar. */
export type MotivoDaRecusa = "cheia" | "emPartida" | "acabou";

/**
 * A partida como uma pessoa pode vê-la (spec, item 9: joga limpo). Só a SUA
 * carta de cima; das outras pessoas, só quantas cartas têm.
 */
export interface PartidaVista {
  /** Na Ordem da mesa da partida. */
  pessoas: { apelido: string; cartas: number }[];
  /** Índice de quem recebe em `pessoas`. */
  voce: number;
  monteDeEmpate: number;
  rodada: number;
  limiteDeRodadas: number;
  quemEscolhe: number;
  /** Código da sua carta de cima (`null` sem cartas). */
  suaCarta: string | null;
  fim: Fim | null;
}

export type MensagemDaSala =
  /** A sala como está agora, do ponto de vista de quem recebe. */
  | {
      tipo: "sala";
      codigo: string;
      /** Na Ordem da mesa. */
      pessoas: PessoaVisivel[];
      /** Índice de quem recebe em `pessoas`. */
      voce: number;
      /** Índice do Anfitrião em `pessoas`. */
      anfitriao: number;
      emPartida: boolean;
    }
  | { tipo: "recusada"; motivo: MotivoDaRecusa }
  /** A partida agora (ao começar e ao voltar para a sala no meio dela). */
  | { tipo: "partida"; vista: PartidaVista }
  /** Uma rodada disputada: o duelo (é só aqui que as cartas das outras pessoas aparecem) e a partida depois dele. */
  | { tipo: "rodada"; evento: EventoDaRodada; depois: PartidaVista };

function lerJson(texto: string): Record<string, unknown> | null {
  try {
    const valor: unknown = JSON.parse(texto);
    return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** O que o celular mandou, ou `null` se não é uma mensagem válida (vem da rede: não confie). */
export function lerMensagemDoCliente(texto: string): MensagemDoCliente | null {
  const dado = lerJson(texto);
  switch (dado?.tipo) {
    case "entrar":
      return typeof dado.id === "string" && dado.id.length > 0 && dado.id.length <= 64 && typeof dado.apelido === "string"
        ? { tipo: "entrar", id: dado.id, apelido: dado.apelido }
        : null;
    case "comecar":
    case "sair":
      return { tipo: dado.tipo };
    case "escolher":
      return ATRIBUTOS.includes(dado.atributo as ChaveAtributo)
        ? { tipo: "escolher", atributo: dado.atributo as ChaveAtributo }
        : null;
    default:
      return null;
  }
}

const MOTIVOS: readonly MotivoDaRecusa[] = ["cheia", "emPartida", "acabou"];

/** O que a Sala mandou, ou `null` se não dá para entender. */
export function lerMensagemDaSala(texto: string): MensagemDaSala | null {
  const dado = lerJson(texto);
  if (dado?.tipo === "recusada") {
    return MOTIVOS.includes(dado.motivo as MotivoDaRecusa) ? { tipo: "recusada", motivo: dado.motivo as MotivoDaRecusa } : null;
  }
  if (dado?.tipo === "partida") {
    const vista = lerVista(dado.vista);
    return vista ? { tipo: "partida", vista } : null;
  }
  if (dado?.tipo === "rodada") {
    const depois = lerVista(dado.depois);
    const evento = lerEventoDaRodada(dado.evento);
    return depois && evento ? { tipo: "rodada", evento, depois } : null;
  }
  if (dado?.tipo !== "sala") return null;
  const { codigo, pessoas, voce, anfitriao, emPartida } = dado;
  const pessoasValidas =
    Array.isArray(pessoas) &&
    pessoas.every((p) => p && typeof p.apelido === "string" && typeof p.conectada === "boolean");
  const indice = (valor: unknown) =>
    Number.isInteger(valor) && (valor as number) >= 0 && pessoasValidas && (valor as number) < pessoas.length;
  if (typeof codigo !== "string" || !pessoasValidas || !indice(voce) || !indice(anfitriao) || typeof emPartida !== "boolean") {
    return null;
  }
  return {
    tipo: "sala",
    codigo,
    pessoas: pessoas.map((p: PessoaVisivel) => ({ apelido: p.apelido, conectada: p.conectada })),
    voce: voce as number,
    anfitriao: anfitriao as number,
    emPartida,
  };
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
}

function contagem(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) >= 0;
}

const MOTIVOS_DO_FIM: readonly MotivoDoFim[] = ["todasAsCartas", "ultimaNaPartida", "limiteDeRodadas", "semCartas", "saida"];
const MOTIVOS_DA_RODADA: readonly MotivoDaRodada[] = ["nota", "superTrunfo", "cartaA", "empate"];

function lerFim(valor: unknown, pessoas: number): Fim | null | undefined {
  if (valor === null) return null;
  const fim = objeto(valor);
  if (
    !fim ||
    !(fim.vencedor === null || (contagem(fim.vencedor) && fim.vencedor < pessoas)) ||
    !MOTIVOS_DO_FIM.includes(fim.motivo as MotivoDoFim) ||
    !contagem(fim.rodadasJogadas)
  ) {
    return undefined;
  }
  return { vencedor: fim.vencedor as number | null, motivo: fim.motivo as MotivoDoFim, rodadasJogadas: fim.rodadasJogadas };
}

function lerVista(valor: unknown): PartidaVista | null {
  const vista = objeto(valor);
  if (!vista || !Array.isArray(vista.pessoas)) return null;
  const pessoas = vista.pessoas.map(objeto);
  if (pessoas.some((p) => !p || typeof p.apelido !== "string" || !contagem(p.cartas))) return null;
  const indice = (v: unknown): v is number => contagem(v) && v < pessoas.length;
  const fim = lerFim(vista.fim, pessoas.length);
  const { voce, monteDeEmpate, rodada, limiteDeRodadas, quemEscolhe, suaCarta } = vista;
  if (
    !indice(voce) ||
    !indice(quemEscolhe) ||
    !contagem(monteDeEmpate) ||
    !contagem(rodada) ||
    !contagem(limiteDeRodadas) ||
    !(suaCarta === null || typeof suaCarta === "string") ||
    fim === undefined
  ) {
    return null;
  }
  return {
    pessoas: pessoas.map((p) => ({ apelido: p!.apelido as string, cartas: p!.cartas as number })),
    voce,
    monteDeEmpate,
    rodada,
    limiteDeRodadas,
    quemEscolhe,
    suaCarta,
    fim,
  };
}

function lerEventoDaRodada(valor: unknown): EventoDaRodada | null {
  const evento = objeto(valor);
  if (!evento || !Array.isArray(evento.mesa)) return null;
  const mesa = evento.mesa.map(objeto);
  if (mesa.length < 2 || mesa.some((m) => !m || !contagem(m.pessoa) || typeof m.codigo !== "string" || !contagem(m.nota))) {
    return null;
  }
  const { rodada, quemEscolheu, atributo, vencedor, motivo, cartasLevadas, doMonteDeEmpate } = evento;
  if (
    !contagem(rodada) ||
    !contagem(quemEscolheu) ||
    !ATRIBUTOS.includes(atributo as ChaveAtributo) ||
    !(vencedor === null || contagem(vencedor)) ||
    !MOTIVOS_DA_RODADA.includes(motivo as MotivoDaRodada) ||
    !contagem(cartasLevadas) ||
    !contagem(doMonteDeEmpate)
  ) {
    return null;
  }
  return {
    tipo: "rodada",
    rodada,
    quemEscolheu,
    atributo: atributo as ChaveAtributo,
    mesa: mesa.map((m) => ({ pessoa: m!.pessoa as number, codigo: m!.codigo as string, nota: m!.nota as number })),
    vencedor: vencedor as number | null,
    motivo: motivo as MotivoDaRodada,
    cartasLevadas,
    doMonteDeEmpate,
  };
}
