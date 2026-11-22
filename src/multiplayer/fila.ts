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

/** Troca a partida depois de tudo o que já chegou, sem mexer no que ainda vai ser mostrado. */
function trocarUltima(fila: FilaDaPartida, vista: PartidaVista): FilaDaPartida {
  const ultima = fila.esperando.at(-1);
  if (ultima) return { ...fila, esperando: [...fila.esperando.slice(0, -1), { ...ultima, depois: vista }] };
  if (fila.duelo) return { ...fila, duelo: { ...fila.duelo, depois: vista } };
  return { ...fila, vista };
}

type MensagemDaPartida = Extract<MensagemDaSala, { tipo: "partida" | "rodada" }>;

export function receberNaFila(fila: FilaDaPartida, mensagem: MensagemDaPartida): FilaDaPartida {
  if (mensagem.tipo === "partida") {
    // A sala manda a partida como está ao (re)conectar e quando alguém sai no
    // meio (spec, itens 14 e 15). Na mesma rodada do que o celular já sabe, a
    // fila segue e só o fim dela muda (o placar anda depois dos duelos que
    // faltam); noutra rodada (perdeu rodadas sem rede), recomeça dali.
    const sabida = ultimaConhecida(fila);
    if (sabida && sabida.rodada === mensagem.vista.rodada) return trocarUltima(fila, mensagem.vista);
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

/**
 * A rodada em que a tela mostra "Sua vez" (você escolhe, sem duelo na frente,
 * fora do fim), ou `null`. Só chega depois do seu "Próxima rodada"; o celular
 * avisa a sala (`naVez`), que conta o tempo do Cutucar daí (spec, item 16).
 */
export function rodadaDaSuaVez({ vista, duelo }: FilaDaPartida): number | null {
  if (vista === null || duelo !== null || vista.fim !== null) return null;
  const naVez = vista.quemEscolhe === vista.voce && vista.pessoas[vista.voce].fora === null;
  return naVez ? vista.rodada : null;
}
