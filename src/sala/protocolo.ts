// As mensagens do WebSocket entre o celular e a Sala (Durable Object). JSON em
// texto. O celular manda MensagemDoCliente; a Sala responde com MensagemDaSala.
// Este arquivo é usado dos dois lados (tela e Worker): só tipos e leitura.

export const TAMANHO_MAXIMO_DO_APELIDO = 20;

export type MensagemDoCliente =
  /** Entrar (ou voltar) na sala. `id` é o identificador secreto guardado no celular. */
  | { tipo: "entrar"; id: string; apelido: string }
  /** Só o Anfitrião, com 2 a 4 pessoas. */
  | { tipo: "comecar" }
  /** Ir embora da sala (antes da partida). */
  | { tipo: "sair" };

/** Uma pessoa como as outras a veem: sem o identificador secreto. */
export interface PessoaVisivel {
  apelido: string;
  conectada: boolean;
}

/** Por que a sala não deixou a pessoa entrar. */
export type MotivoDaRecusa = "cheia" | "emPartida" | "acabou";

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
  | { tipo: "recusada"; motivo: MotivoDaRecusa };

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
