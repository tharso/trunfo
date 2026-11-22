// A Sala sem rede (docs/spec.md, parte 9): estado + mensagem → estado novo + o
// que mandar para cada pessoa. O Durable Object (src/worker/sala.ts) só guarda o
// estado no storage, entrega as mensagens aos sockets e chama estas funções.
//
// Tudo aqui é dado simples (vira JSON e volta igual), sem relógio próprio: quem
// chama passa `agora` (ms).
import baralho from "../dados/baralho.json";
import { aplicar, criarPartida, type Estado, type EventoDaRodada, type Sorteio } from "../regras";
import { lerMensagemDoCliente, TAMANHO_MAXIMO_DO_APELIDO, type MensagemDaSala, type PartidaVista } from "./protocolo";

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

/**
 * A partida em andamento (ou que acabou) na sala. O estado inteiro (os montes
 * de todo mundo) fica só aqui, no Durable Object; cada celular recebe a sua vista.
 */
export interface PartidaNaSala {
  estado: Estado;
  /** Quem joga, na Ordem da mesa da partida (o índice é a pessoa nas regras). */
  pessoas: { id: string; apelido: string }[];
}

export interface EstadoDaSala {
  codigo: string;
  /** Na Ordem da mesa (ordem de entrada). */
  pessoas: PessoaNaSala[];
  /** O `id` do Anfitrião; `null` enquanto ninguém entrou. */
  anfitriao: string | null;
  emPartida: boolean;
  /** `null` antes da primeira partida. */
  partida: PartidaNaSala | null;
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
  return { codigo, pessoas: [], anfitriao: null, emPartida: false, partida: null, atualizadaEm: agora };
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

/** A partida como a pessoa `voce` (índice na partida) pode vê-la: só a própria carta de cima. */
function vista(partida: PartidaNaSala, voce: number): PartidaVista {
  const { estado } = partida;
  return {
    pessoas: partida.pessoas.map(({ apelido }, i) => ({ apelido, cartas: estado.pessoas[i].monte.length })),
    voce,
    monteDeEmpate: estado.monteDeEmpate.length,
    rodada: estado.rodada,
    limiteDeRodadas: estado.limiteDeRodadas,
    quemEscolhe: estado.quemEscolhe,
    suaCarta: estado.pessoas[voce].monte[0] ?? null,
    fim: estado.fim,
  };
}

/** Uma mensagem para cada pessoa da partida que está conectada. */
function paraQuemJoga(
  sala: EstadoDaSala,
  partida: PartidaNaSala,
  mensagem: (voce: number) => MensagemDaSala,
): Resultado["paraPessoas"] {
  const conectadas = new Set(sala.pessoas.filter((p) => p.conectada).map((p) => p.id));
  return partida.pessoas.flatMap(({ id }, voce) => (conectadas.has(id) ? [{ id, mensagem: mensagem(voce) }] : []));
}

/** Como sortear a partida que começa. O Durable Object passa uma semente aleatória. */
export interface NovaPartidaNaSala {
  semente: Sorteio;
}

/** Uma mensagem (texto do WebSocket) chegou de uma conexão. */
export function receber(
  estado: EstadoDaSala | null,
  conexao: string | null,
  texto: string,
  agora: number,
  novaPartida: NovaPartidaNaSala = { semente: agora | 0 },
): Resultado {
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
      const voltou = mudou({ ...estado, pessoas, atualizadaEm: agora }, ja.id);
      // No meio da partida, quem volta recebe a partida como está.
      const partida = estado.partida;
      const voce = partida?.pessoas.findIndex((p) => p.id === ja.id) ?? -1;
      if (partida && voce >= 0) voltou.paraPessoas.push({ id: ja.id, mensagem: { tipo: "partida", vista: vista(partida, voce) } });
      return voltou;
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
    if (!pode) return nada;
    const partida: PartidaNaSala = {
      estado: criarPartida({
        baralho: baralho.cartas,
        pessoas: estado.pessoas.map(() => "humano"),
        // O Nível é do Computador; numa partida só de pessoas, não vale nada.
        nivel: "normal",
        semente: novaPartida.semente,
      }),
      pessoas: estado.pessoas.map(({ id, apelido }) => ({ id, apelido })),
    };
    const comecada = { ...estado, emPartida: true, partida, atualizadaEm: agora };
    const resultado = mudou(comecada, conexao);
    resultado.paraPessoas.push(
      ...paraQuemJoga(comecada, partida, (voce) => ({ tipo: "partida", vista: vista(partida, voce) })),
    );
    return resultado;
  }

  if (mensagem.tipo === "escolher") {
    const partida = estado.partida;
    const pessoa = partida?.pessoas.findIndex((p) => p.id === conexao) ?? -1;
    if (!partida || partida.estado.fim || pessoa !== partida.estado.quemEscolhe) return nada;
    const { estado: depois, eventos } = aplicar(partida.estado, { tipo: "escolher", pessoa, atributo: mensagem.atributo });
    const evento = eventos.find((e): e is EventoDaRodada => e.tipo === "rodada")!;
    const jogada = { ...partida, estado: depois };
    const sala = { ...estado, partida: jogada, atualizadaEm: agora };
    return {
      estado: sala,
      conexao,
      paraPessoas: paraQuemJoga(sala, jogada, (voce) => ({ tipo: "rodada", evento, depois: vista(jogada, voce) })),
    };
  }

  // sair: antes da partida ou depois do fim dela, a pessoa some da lista.
  // No meio da partida é o ticket #40.
  if (estado.emPartida && !estado.partida?.estado.fim) return nada;
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
