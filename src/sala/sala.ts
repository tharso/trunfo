// A Sala sem rede (docs/spec.md, parte 9): estado + mensagem → estado novo + o
// que mandar para cada pessoa. O Durable Object (src/worker/sala.ts) só guarda o
// estado no storage, entrega as mensagens aos sockets e chama estas funções.
//
// Tudo aqui é dado simples (vira JSON e volta igual), sem relógio próprio: quem
// chama passa `agora` (ms).
import { lerMensagemDoCliente, TAMANHO_MAXIMO_DO_APELIDO, type MensagemDaSala } from "./protocolo";

export const MAXIMO_DE_PESSOAS = 4;
export const MINIMO_PARA_COMECAR = 2;
/** A sala sem ninguém conectado fica reservada por este tempo (spec, item 22). */
export const TEMPO_DA_SALA_VAZIA = 10 * 60_000;

export interface PessoaNaSala {
  /** O identificador secreto do celular. Nunca sai da sala. */
  id: string;
  apelido: string;
  conectada: boolean;
}

export interface EstadoDaSala {
  codigo: string;
  /** Na Ordem da mesa (ordem de entrada). */
  pessoas: PessoaNaSala[];
  /** O `id` do Anfitrião; `null` enquanto ninguém entrou. */
  anfitriao: string | null;
  emPartida: boolean;
  /** Quando a sala mudou pela última vez (ms). */
  atualizadaEm: number;
}

export interface Resultado {
  /** `null` quando a sala não existe (e continua não existindo). */
  estado: EstadoDaSala | null;
  /** Quem está nesta conexão depois da mensagem (`null`: ninguém ainda). */
  conexao: string | null;
  /** Só para a conexão que mandou a mensagem (ex.: a recusa). */
  resposta?: MensagemDaSala;
  /** Uma mensagem por pessoa conectada. */
  paraPessoas: { id: string; mensagem: MensagemDaSala }[];
}

/** A sala existe e não fechou: tem alguém conectado ou mudou há menos de 10 min. */
export function emUso(estado: EstadoDaSala | null, agora: number): estado is EstadoDaSala {
  if (estado === null) return false;
  return estado.pessoas.some((p) => p.conectada) || agora - estado.atualizadaEm < TEMPO_DA_SALA_VAZIA;
}

/** Reserva o código para uma sala nova. `null` se o código está em uso. */
export function reservar(estado: EstadoDaSala | null, codigo: string, agora: number): EstadoDaSala | null {
  if (emUso(estado, agora)) return null;
  return { codigo, pessoas: [], anfitriao: null, emPartida: false, atualizadaEm: agora };
}

/** Espaços em volta e repetidos saem; no máximo 20 letras. */
function limparApelido(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").slice(0, TAMANHO_MAXIMO_DO_APELIDO).trim();
}

/** Apelido repetido (sem olhar maiúsculas) recebe um número: "Ana 2", "Ana 3"… */
function apelidoUnico(apelido: string, pessoas: PessoaNaSala[]): string {
  const usados = new Set(pessoas.map((p) => p.apelido.toLocaleLowerCase("pt-BR")));
  if (!usados.has(apelido.toLocaleLowerCase("pt-BR"))) return apelido;
  let numero = 2;
  while (usados.has(`${apelido} ${numero}`.toLocaleLowerCase("pt-BR"))) numero++;
  return `${apelido} ${numero}`;
}

/** A sala como cada pessoa conectada a vê. */
function avisarTodos(estado: EstadoDaSala): Resultado["paraPessoas"] {
  const pessoas = estado.pessoas.map(({ apelido, conectada }) => ({ apelido, conectada }));
  const anfitriao = estado.pessoas.findIndex((p) => p.id === estado.anfitriao);
  return estado.pessoas.flatMap((pessoa, voce) =>
    pessoa.conectada
      ? [{ id: pessoa.id, mensagem: { tipo: "sala", codigo: estado.codigo, pessoas, voce, anfitriao, emPartida: estado.emPartida } as const }]
      : [],
  );
}

function mudou(estado: EstadoDaSala, conexao: string | null): Resultado {
  return { estado, conexao, paraPessoas: avisarTodos(estado) };
}

/** Uma mensagem (texto do WebSocket) chegou de uma conexão. */
export function receber(estado: EstadoDaSala | null, conexao: string | null, texto: string, agora: number): Resultado {
  const nada: Resultado = { estado, conexao, paraPessoas: [] };
  const mensagem = lerMensagemDoCliente(texto);
  if (mensagem === null) return nada;

  if (mensagem.tipo === "entrar") {
    if (!emUso(estado, agora)) return { ...nada, resposta: { tipo: "recusada", motivo: "acabou" } };
    const apelido = limparApelido(mensagem.apelido);
    if (apelido === "") return nada;
    const ja = estado.pessoas.find((p) => p.id === mensagem.id);
    if (ja) {
      const pessoas = estado.pessoas.map((p) => (p === ja ? { ...p, conectada: true } : p));
      return mudou({ ...estado, pessoas, atualizadaEm: agora }, ja.id);
    }
    if (estado.emPartida) return { ...nada, resposta: { tipo: "recusada", motivo: "emPartida" } };
    if (estado.pessoas.length >= MAXIMO_DE_PESSOAS) return { ...nada, resposta: { tipo: "recusada", motivo: "cheia" } };
    const nova = { id: mensagem.id, apelido: apelidoUnico(apelido, estado.pessoas), conectada: true };
    return mudou(
      { ...estado, pessoas: [...estado.pessoas, nova], anfitriao: estado.anfitriao ?? nova.id, atualizadaEm: agora },
      nova.id,
    );
  }

  // As outras mensagens só valem de quem já entrou.
  if (estado === null || conexao === null || !estado.pessoas.some((p) => p.id === conexao)) return nada;

  if (mensagem.tipo === "comecar") {
    const pode =
      conexao === estado.anfitriao &&
      !estado.emPartida &&
      estado.pessoas.length >= MINIMO_PARA_COMECAR &&
      estado.pessoas.length <= MAXIMO_DE_PESSOAS;
    // A partida de verdade (src/regras) vem no ticket #38.
    return pode ? mudou({ ...estado, emPartida: true, atualizadaEm: agora }, conexao) : nada;
  }

  // sair: antes da partida, a pessoa some da lista. Durante a partida é o ticket #40.
  if (estado.emPartida) return nada;
  const pessoas = estado.pessoas.filter((p) => p.id !== conexao);
  const anfitriao = estado.anfitriao === conexao ? (pessoas[0]?.id ?? null) : estado.anfitriao;
  return mudou({ ...estado, pessoas, anfitriao, atualizadaEm: agora }, null);
}

/** A última conexão da pessoa `id` fechou (rede caiu, aba fechou). */
export function desconectar(estado: EstadoDaSala | null, id: string, agora: number): Resultado {
  if (estado === null || !estado.pessoas.some((p) => p.id === id && p.conectada)) {
    return { estado, conexao: null, paraPessoas: [] };
  }
  const pessoas = estado.pessoas.map((p) => (p.id === id ? { ...p, conectada: false } : p));
  return mudou({ ...estado, pessoas, atualizadaEm: agora }, null);
}
