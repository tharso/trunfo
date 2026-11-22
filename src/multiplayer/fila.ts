// Cada um no seu ritmo (docs/spec.md, parte 9, item 11). A sala manda as
// rodadas quando acontecem; o celular as guarda numa fila e mostra uma de cada
// vez. A partida que a tela mostra (placar, sua carta, quem escolhe) só anda
// quando a pessoa toca em "Próxima rodada". Por isso quem escolhe só escolhe
// depois de tocar no próprio "Próxima rodada": até lá, a vez dela ainda não
// chegou na tela.
import type { EventoDaRodada } from "../regras";
import type { MensagemDaSala, PartidaVista } from "../sala/protocolo";

/** Uma rodada como a sala manda: o duelo e a partida depois dele. */
export interface RodadaRecebida {
  evento: EventoDaRodada;
  depois: PartidaVista;
}

export interface FilaDaPartida {
  /** A partida fora do duelo: o que vale antes da rodada em exibição. `null` até chegar. */
  vista: PartidaVista | null;
  /** A rodada em exibição (antes do duelo ou no duelo), até "Próxima rodada". */
  duelo: RodadaRecebida | null;
  /** Rodadas que chegaram durante o duelo e esperam a vez. */
  esperando: RodadaRecebida[];
}

export function filaVazia(): FilaDaPartida {
  return { vista: null, duelo: null, esperando: [] };
}

/** A partida como ela fica depois de tudo o que já chegou. */
function ultimaConhecida(fila: FilaDaPartida): PartidaVista | null {
  return (fila.esperando.at(-1) ?? fila.duelo)?.depois ?? fila.vista;
}

/** Duas vistas são o mesmo momento da partida (a rodada só anda para frente). */
function mesmoMomento(a: PartidaVista, b: PartidaVista): boolean {
  return a.rodada === b.rodada && (a.fim === null) === (b.fim === null);
}

type MensagemDaPartida = Extract<MensagemDaSala, { tipo: "partida" | "rodada" }>;

export function receberNaFila(fila: FilaDaPartida, mensagem: MensagemDaPartida): FilaDaPartida {
  if (mensagem.tipo === "partida") {
    // Ao (re)conectar, a sala manda a partida como está. Se é o que o celular
    // já sabe, a fila segue; se não (perdeu rodadas sem rede), recomeça dali.
    const sabida = ultimaConhecida(fila);
    if (sabida && mesmoMomento(sabida, mensagem.vista)) return fila;
    return { vista: mensagem.vista, duelo: null, esperando: [] };
  }
  const rodada = { evento: mensagem.evento, depois: mensagem.depois };
  if (fila.duelo === null) return { ...fila, duelo: rodada };
  return { ...fila, esperando: [...fila.esperando, rodada] };
}

/** "Próxima rodada": a partida anda até depois do duelo e a próxima rodada da fila entra. */
export function avancar(fila: FilaDaPartida): FilaDaPartida {
  if (fila.duelo === null) return fila;
  const [proxima = null, ...resto] = fila.esperando;
  return { vista: fila.duelo.depois, duelo: proxima, esperando: resto };
}
