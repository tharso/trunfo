// O que fica guardado no celular (docs/spec.md, partes 8 e 10): o Retrospecto e a
// partida solo guardada, no `localStorage`. Toda leitura e escrita tolera falha
// (aba anônima, armazenamento cheio ou bloqueado, dado velho ou estragado):
// sem armazenamento, o jogo funciona, só não lembra.
import { retrospectoVazio, type Estado, type Nivel, type Retrospecto } from "./regras";

const CHAVE_RETROSPECTO = "trunfo:retrospecto";
const CHAVE_PARTIDA = "trunfo:partida";
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
    const placar = guardado[nivel];
    if (!placar || typeof placar !== "object") continue;
    retrospecto[nivel] = {
      vitorias: contagem(placar.vitorias),
      derrotas: contagem(placar.derrotas),
      empates: contagem(placar.empates),
    };
  }
  return retrospecto;
}

export function guardarRetrospecto(retrospecto: Retrospecto): void {
  escrever(CHAVE_RETROSPECTO, retrospecto);
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
    Array.isArray(estado.pessoas) &&
    estado.pessoas.length === 2 &&
    estado.pessoas.every((p) => p && Array.isArray(p.monte));
  return serve ? (estado as Estado) : null;
}

/** Guarda a partida solo em andamento; `null` apaga a partida guardada. */
export function guardarPartida(estado: Estado | null): void {
  escrever(CHAVE_PARTIDA, estado === null ? null : { versao: VERSAO_DA_PARTIDA, estado });
}

const CHAVE_SOM = "trunfo:som";

/** Som ligado? Começa ligado (docs/spec.md, parte 7); só `false` guardado desliga. */
export function lerSomLigado(): boolean {
  return ler(CHAVE_SOM) !== false;
}

export function guardarSomLigado(ligado: boolean): void {
  escrever(CHAVE_SOM, ligado);
}
