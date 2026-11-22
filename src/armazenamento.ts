// O que fica guardado no celular (docs/spec.md, partes 8 e 10): o Retrospecto, a
// partida solo guardada e, no multiplayer, o Apelido, o identificador secreto e
// a última sala, no `localStorage`. Toda leitura e escrita tolera falha
// (aba anônima, armazenamento cheio ou bloqueado, dado velho ou estragado):
// sem armazenamento, o jogo funciona, só não lembra.
import baralho from "./dados/baralho.json";
import { retrospectoVazio, type Estado, type Nivel, type Retrospecto } from "./regras";
import { lerCodigo } from "./sala/codigo";
import { TAMANHO_MAXIMO_DO_APELIDO } from "./sala/protocolo";

const CHAVE_RETROSPECTO = "trunfo:retrospecto";
const CHAVE_PARTIDA = "trunfo:partida";
const CHAVE_APELIDO = "trunfo:apelido";
const CHAVE_IDENTIFICADOR = "trunfo:identificador";
const CHAVE_ULTIMA_SALA = "trunfo:ultimaSala";
// Muda quando o formato do Estado muda; partida guardada de outra versão é ignorada.
const VERSAO_DA_PARTIDA = 1;

function ler(chave: string): unknown {
  try {
    const texto = localStorage.getItem(chave);
    return texto === null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

function escrever(chave: string, valor: unknown): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento: segue sem lembrar.
  }
}

function contagem(valor: unknown): number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 ? valor : 0;
}

export function lerRetrospecto(): Retrospecto {
  const guardado = ler(CHAVE_RETROSPECTO) as Partial<Record<Nivel, Record<string, unknown>>> | null;
  const retrospecto = retrospectoVazio();
  if (!guardado || typeof guardado !== "object") return retrospecto;
  for (const nivel of Object.keys(retrospecto) as Nivel[]) {
    const doNivel = guardado[nivel];
    if (!doNivel || typeof doNivel !== "object") continue;
    retrospecto[nivel] = {
      vitorias: contagem(doNivel.vitorias),
      derrotas: contagem(doNivel.derrotas),
      empates: contagem(doNivel.empates),
    };
  }
  return retrospecto;
}

export function guardarRetrospecto(retrospecto: Retrospecto): void {
  escrever(CHAVE_RETROSPECTO, retrospecto);
}

// As cartas do baralho atual. O baralho.json muda entre versões do jogo; uma partida
// guardada com carta que não existe mais não serve.
const CODIGOS_DO_BARALHO = new Set(baralho.cartas.map((c) => c.codigo));

function cartasDoBaralho(codigos: unknown): boolean {
  return Array.isArray(codigos) && codigos.every((codigo) => CODIGOS_DO_BARALHO.has(codigo));
}

/** A partida solo guardada, ou `null` se não há (ou se o que há não serve). */
export function lerPartida(): Estado | null {
  const guardado = ler(CHAVE_PARTIDA) as { versao?: unknown; estado?: Partial<Estado> } | null;
  const estado = guardado?.versao === VERSAO_DA_PARTIDA ? guardado.estado : null;
  const serve =
    !!estado &&
    estado.fim === null &&
    (estado.nivel === "facil" || estado.nivel === "normal") &&
    Array.isArray(estado.baralho) &&
    cartasDoBaralho(estado.baralho.map((c) => c?.codigo)) &&
    cartasDoBaralho(estado.monteDeEmpate) &&
    Array.isArray(estado.pessoas) &&
    estado.pessoas.length === 2 &&
    estado.pessoas.every((p) => p && (p.tipo === "humano" || p.tipo === "computador") && cartasDoBaralho(p.monte));
  return serve ? (estado as Estado) : null;
}

/** Guarda a partida solo em andamento; `null` apaga a partida guardada. */
export function guardarPartida(estado: Estado | null): void {
  escrever(CHAVE_PARTIDA, estado === null ? null : { versao: VERSAO_DA_PARTIDA, estado });
}

/** O último Apelido usado neste celular, ou "" se não há (ou se o guardado não serve). */
export function lerApelido(): string {
  const guardado = ler(CHAVE_APELIDO);
  return typeof guardado === "string" && guardado.trim() !== "" && guardado.length <= TAMANHO_MAXIMO_DO_APELIDO
    ? guardado
    : "";
}

export function guardarApelido(apelido: string): void {
  escrever(CHAVE_APELIDO, apelido);
}

const FORMATO_DO_IDENTIFICADOR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * O identificador secreto do celular: mostra à sala que é a mesma pessoa que
 * voltou (spec, itens 18 e 24). Criado na primeira vez; sem armazenamento, vale
 * só enquanto a página estiver aberta.
 */
export function identificadorSecreto(): string {
  const guardado = ler(CHAVE_IDENTIFICADOR);
  if (typeof guardado === "string" && FORMATO_DO_IDENTIFICADOR.test(guardado)) return guardado;
  const novo = crypto.randomUUID();
  escrever(CHAVE_IDENTIFICADOR, novo);
  return novo;
}

/**
 * A última sala em que o celular entrou e de onde não saiu pelo "Sair". Com
 * ela e o Apelido guardado, fechar a aba e abrir o link de novo volta direto
 * para a sala, sem passar pelo Apelido (spec, item 18). `null` se não há (ou
 * se o guardado não é um código de sala).
 */
export function lerUltimaSala(): string | null {
  const guardado = ler(CHAVE_ULTIMA_SALA);
  return typeof guardado === "string" && lerCodigo(guardado) === guardado ? guardado : null;
}

/** Guarda o código da sala em que o celular entrou; `null` apaga (a pessoa saiu). */
export function guardarUltimaSala(codigo: string | null): void {
  escrever(CHAVE_ULTIMA_SALA, codigo);
}
