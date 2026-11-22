// A Sala sem rede (docs/spec.md, parte 9): estado + mensagem → estado novo + o
// que mandar para cada pessoa. O Durable Object (src/worker/sala.ts) só guarda o
// estado no storage, entrega as mensagens aos sockets e chama estas funções.
//
// Tudo aqui é dado simples (vira JSON e volta igual), sem relógio próprio: quem
// chama passa `agora` (ms).
import baralho from "../dados/baralho.json";
import { aplicar, criarPartida, type Estado, type EventoDaRodada, type Sorteio } from "../regras";
import { lerMensagemDoCliente, TAMANHO_MAXIMO_DO_APELIDO, type MensagemDaSala, type MotivoDaRecusa, type PartidaVista } from "./protocolo";

export const MAXIMO_DE_PESSOAS = 4;
export const MINIMO_PARA_COMECAR = 2;

/** Os tempos da partida na sala (ms). O build do teste Playwright encurta (src/worker/sala.ts). */
export interface TemposDaSala {
  /** Quem cai é esperado por este tempo; depois, sai da partida (spec, itens 14 e 18). */
  queda: number;
  /** Depois deste tempo sem escolha, os outros podem cutucar (spec, item 16). */
  cutucar: number;
  /** A sala sem ninguém conectado fecha depois deste tempo (spec, item 22). */
  vazia: number;
}

export const TEMPOS_DA_SALA: TemposDaSala = { queda: 60_000, cutucar: 30_000, vazia: 10 * 60_000 };

export interface PessoaNaSala {
  /** O identificador secreto do celular. Nunca sai da sala. */
  id: string;
  apelido: string;
  conectada: boolean;
  /** Quando a última conexão da pessoa fechou (ms); `null` conectada ou depois que o tempo de queda foi tratado. */
  caiuEm: number | null;
}

/**
 * A partida em andamento (ou que acabou) na sala. O estado inteiro (os montes
 * de todo mundo) fica só aqui, no Durable Object; cada celular recebe a sua vista.
 */
export interface PartidaNaSala {
  estado: Estado;
  /** Quem joga, na Ordem da mesa da partida (o índice é a pessoa nas regras). */
  pessoas: { id: string; apelido: string }[];
  /** Desde quando (ms) a pessoa da vez está escolhendo. */
  vezDesde: number;
  /** Já passou o tempo de cutucar quem escolhe. */
  podeCutucar: boolean;
}

export interface EstadoDaSala {
  codigo: string;
  /** Na Ordem da mesa (ordem de entrada). */
  pessoas: PessoaNaSala[];
  /** O `id` do Anfitrião; `null` enquanto ninguém entrou. */
  anfitriao: string | null;
  /** A última partida (em jogo ou que acabou); `null` antes da primeira. Entre partidas a sala aceita gente nova. */
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

/** Nada muda e ninguém recebe nada. */
function semMudanca(estado: EstadoDaSala | null, conexao: string | null = null): Resultado {
  return { estado, conexao, paraPessoas: [] };
}

/** Só a conexão que mandou a mensagem fica sabendo por que não entrou. */
function recusar(estado: EstadoDaSala | null, conexao: string | null, motivo: MotivoDaRecusa): Resultado {
  return { ...semMudanca(estado, conexao), resposta: { tipo: "recusada", motivo } };
}

/** A sala existe e não fechou: tem alguém conectado ou mudou há menos de `tempos.vazia`. */
export function emUso(estado: EstadoDaSala | null, agora: number, tempos: TemposDaSala = TEMPOS_DA_SALA): estado is EstadoDaSala {
  if (estado === null) return false;
  return !semNinguem(estado) || agora - estado.atualizadaEm < tempos.vazia;
}

/** Reserva o código para uma sala nova. `null` se o código está em uso. */
export function reservar(
  estado: EstadoDaSala | null,
  codigo: string,
  agora: number,
  tempos: TemposDaSala = TEMPOS_DA_SALA,
): EstadoDaSala | null {
  if (emUso(estado, agora, tempos)) return null;
  return { codigo, pessoas: [], anfitriao: null, partida: null, atualizadaEm: agora };
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

/** A partida, se está em andamento (começou e não acabou). */
function partidaEmJogo(estado: EstadoDaSala): PartidaNaSala | null {
  return estado.partida && !estado.partida.estado.fim ? estado.partida : null;
}

/** O índice da pessoa `id` na partida em jogo, se ela ainda está na partida; senão -1. */
function indiceNaPartida(estado: EstadoDaSala, id: string): number {
  const partida = partidaEmJogo(estado);
  const indice = partida?.pessoas.findIndex((p) => p.id === id) ?? -1;
  return indice >= 0 && partida!.estado.pessoas[indice].fora === null ? indice : -1;
}

/** Quem caiu e ainda está na partida: a partida para até essa lista esvaziar (spec, item 14). */
function semRede(estado: EstadoDaSala): PessoaNaSala[] {
  return estado.pessoas.filter((p) => !p.conectada && indiceNaPartida(estado, p.id) >= 0);
}

/** O `id` de quem escolhe na partida em jogo, ou `null`. */
function idDaVez(estado: EstadoDaSala): string | null {
  const partida = partidaEmJogo(estado);
  return partida ? partida.pessoas[partida.estado.quemEscolhe].id : null;
}

/** Os outros podem cutucar quem escolhe: a vez demorou e a partida não está parada. */
function cutucavel(estado: EstadoDaSala): boolean {
  return !!partidaEmJogo(estado)?.podeCutucar && semRede(estado).length === 0;
}

/**
 * O Anfitrião `saindo` deixa o papel: vai para a próxima pessoa da Ordem da
 * mesa (spec, item 17), de preferência conectada e, com partida em jogo, ainda
 * nela. Quem não é Anfitrião não muda nada.
 */
function passarAnfitriao(estado: EstadoDaSala, saindo: string): string | null {
  if (estado.anfitriao !== saindo) return estado.anfitriao;
  const inicio = estado.pessoas.findIndex((p) => p.id === saindo);
  const seguintes = [...estado.pessoas.slice(inicio + 1), ...estado.pessoas.slice(0, inicio)];
  const escolhida =
    seguintes.find((p) => p.conectada && (!partidaEmJogo(estado) || indiceNaPartida(estado, p.id) >= 0)) ??
    seguintes.find((p) => p.conectada) ??
    seguintes[0];
  return escolhida?.id ?? null;
}

/** A pessoa `id` vai embora da sala: some da lista e, se era o Anfitrião, o papel passa adiante. */
function irEmbora(estado: EstadoDaSala, id: string): EstadoDaSala {
  const anfitriao = passarAnfitriao(estado, id);
  return { ...estado, pessoas: estado.pessoas.filter((p) => p.id !== id), anfitriao };
}

/**
 * Sem partida em jogo, quem caiu e não voltou no tempo de queda já foi embora
 * (spec, item 18): sai da lista, para não ocupar vaga nem entrar na próxima partida.
 */
function semQuemFoiEmbora(estado: EstadoDaSala): EstadoDaSala {
  if (partidaEmJogo(estado)) return estado;
  return estado.pessoas.reduce((sala, p) => (!p.conectada && p.caiuEm === null ? irEmbora(sala, p.id) : sala), estado);
}

/** Sem partida em jogo e com 2 a 4 pessoas (sem contar quem já foi embora), a partida pode começar. */
function podeComecar(estado: EstadoDaSala): boolean {
  if (partidaEmJogo(estado)) return false;
  const quantas = semQuemFoiEmbora(estado).pessoas.length;
  return quantas >= MINIMO_PARA_COMECAR && quantas <= MAXIMO_DE_PESSOAS;
}

/** A sala como cada pessoa conectada a vê. */
function avisarTodos(estado: EstadoDaSala): Resultado["paraPessoas"] {
  const pessoas = estado.pessoas.map(({ apelido, conectada }) => ({ apelido, conectada }));
  const anfitriao = estado.pessoas.findIndex((p) => p.id === estado.anfitriao);
  const caidas = semRede(estado).map((p) => estado.pessoas.indexOf(p));
  const comecar = podeComecar(estado);
  const podeCutucar = cutucavel(estado);
  const daVez = idDaVez(estado);
  return estado.pessoas.flatMap((pessoa, voce) =>
    pessoa.conectada
      ? [
          {
            id: pessoa.id,
            mensagem: {
              tipo: "sala",
              codigo: estado.codigo,
              pessoas,
              voce,
              anfitriao,
              emPartida: partidaEmJogo(estado) !== null,
              podeComecar: comecar,
              semRede: caidas,
              podeCutucar: podeCutucar && pessoa.id !== daVez,
            } as const,
          },
        ]
      : [],
  );
}

function resultadoComSala(estado: EstadoDaSala, conexao: string | null): Resultado {
  return { estado, conexao, paraPessoas: avisarTodos(estado) };
}

/** A partida como a pessoa `voce` (índice na partida) pode vê-la: só a própria carta de cima. */
function vistaDaPartida(partida: PartidaNaSala, voce: number): PartidaVista {
  const { estado } = partida;
  return {
    pessoas: partida.pessoas.map(({ apelido }, i) => ({
      apelido,
      cartas: estado.pessoas[i].monte.length,
      fora: estado.pessoas[i].fora,
    })),
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

/** A sala mudou e a partida também: todos recebem a sala, e quem está na partida (ou De fora) recebe a partida como está. */
function resultadoComPartida(estado: EstadoDaSala, conexao: string | null): Resultado {
  const resultado = resultadoComSala(estado, conexao);
  const partida = estado.partida!;
  resultado.paraPessoas.push(...paraQuemJoga(estado, partida, (voce) => ({ tipo: "partida", vista: vistaDaPartida(partida, voce) })));
  return resultado;
}

/**
 * A pessoa `indice` sai da partida em jogo (ação `sair` das regras: as cartas
 * saem do jogo). Ela continua na sala, De fora. Se era a vez dela, a vez muda.
 */
function tirarDaPartida(estado: EstadoDaSala, indice: number, agora: number): EstadoDaSala {
  const partida = estado.partida!;
  const { estado: depois } = aplicar(partida.estado, { tipo: "sair", pessoa: indice });
  const novaVez = depois.quemEscolhe !== partida.estado.quemEscolhe;
  const jogada: PartidaNaSala = {
    ...partida,
    estado: depois,
    vezDesde: novaVez ? agora : partida.vezDesde,
    podeCutucar: novaVez ? false : partida.podeCutucar,
  };
  return { ...estado, partida: jogada, atualizadaEm: agora };
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
  tempos: TemposDaSala = TEMPOS_DA_SALA,
): Resultado {
  const mensagem = lerMensagemDoCliente(texto);
  if (mensagem === null) return semMudanca(estado, conexao);

  if (mensagem.tipo === "entrar") {
    if (!emUso(estado, agora, tempos)) return recusar(estado, conexao, "acabou");
    const apelido = limparApelido(mensagem.apelido);
    if (apelido === "") return semMudanca(estado, conexao);
    const quemVolta = estado.pessoas.find((p) => p.id === mensagem.id);
    if (quemVolta) {
      const pessoas = estado.pessoas.map((p) => (p === quemVolta ? { ...p, conectada: true, caiuEm: null } : p));
      const voltou = resultadoComSala({ ...estado, pessoas, atualizadaEm: agora }, quemVolta.id);
      // No meio da partida, quem volta recebe a partida como está.
      const partida = estado.partida;
      const voce = partida?.pessoas.findIndex((p) => p.id === quemVolta.id) ?? -1;
      if (partida && voce >= 0) voltou.paraPessoas.push({ id: quemVolta.id, mensagem: { tipo: "partida", vista: vistaDaPartida(partida, voce) } });
      return voltou;
    }
    if (partidaEmJogo(estado)) return recusar(estado, conexao, "emPartida");
    // Entre partidas, gente nova entra no fim da Ordem da mesa (spec, item 25).
    const sala = semQuemFoiEmbora(estado);
    if (sala.pessoas.length >= MAXIMO_DE_PESSOAS) return recusar(estado, conexao, "cheia");
    const nova = { id: mensagem.id, apelido: apelidoUnico(apelido, sala.pessoas), conectada: true, caiuEm: null };
    return resultadoComSala(
      { ...sala, pessoas: [...sala.pessoas, nova], anfitriao: sala.anfitriao ?? nova.id, atualizadaEm: agora },
      nova.id,
    );
  }

  // As outras mensagens só valem de quem já entrou.
  if (estado === null || conexao === null || !estado.pessoas.some((p) => p.id === conexao)) return semMudanca(estado, conexao);

  // "Começar" e, no fim, "Jogar de novo" (spec, item 23): com quem está na sala, inclusive quem estava De fora.
  if (mensagem.tipo === "comecar") {
    if (conexao !== estado.anfitriao || !podeComecar(estado)) return semMudanca(estado, conexao);
    const sala = semQuemFoiEmbora(estado);
    const partida: PartidaNaSala = {
      estado: criarPartida({
        baralho: baralho.cartas,
        pessoas: sala.pessoas.map(() => "humano"),
        // O Nível é do Computador; numa partida só de pessoas, não vale nada.
        nivel: "normal",
        semente: novaPartida.semente,
      }),
      pessoas: sala.pessoas.map(({ id, apelido }) => ({ id, apelido })),
      vezDesde: agora,
      podeCutucar: false,
    };
    const comecada = { ...sala, partida, atualizadaEm: agora };
    const resultado = resultadoComSala(comecada, conexao);
    resultado.paraPessoas.push(
      ...paraQuemJoga(comecada, partida, (voce) => ({ tipo: "partida", vista: vistaDaPartida(partida, voce) })),
    );
    return resultado;
  }

  if (mensagem.tipo === "escolher") {
    const partida = estado.partida;
    const pessoa = partida?.pessoas.findIndex((p) => p.id === conexao) ?? -1;
    if (!partida || partida.estado.fim || pessoa !== partida.estado.quemEscolhe) return semMudanca(estado, conexao);
    // Partida parada: alguém caiu e ainda pode voltar (spec, item 14).
    if (semRede(estado).length > 0) return semMudanca(estado, conexao);
    const { estado: depois, eventos } = aplicar(partida.estado, { tipo: "escolher", pessoa, atributo: mensagem.atributo });
    const evento = eventos.find((e): e is EventoDaRodada => e.tipo === "rodada")!;
    const jogada: PartidaNaSala = { ...partida, estado: depois, vezDesde: agora, podeCutucar: false };
    const sala = { ...estado, partida: jogada, atualizadaEm: agora };
    const paraPessoas = paraQuemJoga(sala, jogada, (voce) => ({ tipo: "rodada", evento, depois: vistaDaPartida(jogada, voce) }));
    // O "Cutucar" que estava na tela some.
    if (partida.podeCutucar) paraPessoas.push(...avisarTodos(sala));
    return { estado: sala, conexao, paraPessoas };
  }

  if (mensagem.tipo === "cutucar") {
    const daVez = idDaVez(estado);
    if (!cutucavel(estado) || daVez === null || daVez === conexao) return semMudanca(estado, conexao);
    return { ...semMudanca(estado, conexao), paraPessoas: [{ id: daVez, mensagem: { tipo: "cutucada" } }] };
  }

  if (mensagem.tipo === "tirar") {
    const caida = estado.pessoas[mensagem.pessoa];
    if (conexao !== estado.anfitriao || !caida || !semRede(estado).includes(caida)) return semMudanca(estado, conexao);
    const pessoas = estado.pessoas.map((p) => (p === caida ? { ...p, caiuEm: null } : p));
    return resultadoComPartida(tirarDaPartida({ ...estado, pessoas }, indiceNaPartida(estado, caida.id), agora), conexao);
  }

  // sair, no meio da partida: sai da partida e fica De fora na sala (spec, itens 15 e 19).
  const indice = indiceNaPartida(estado, conexao);
  if (indice >= 0) {
    const saiu = tirarDaPartida(estado, indice, agora);
    return resultadoComPartida({ ...saiu, anfitriao: passarAnfitriao(saiu, conexao) }, conexao);
  }
  // sair, antes da partida, no fim dela ou já De fora: a pessoa some da lista.
  return resultadoComSala({ ...irEmbora(estado, conexao), atualizadaEm: agora }, null);
}

/** A última conexão da pessoa `id` fechou (rede caiu, aba fechou). */
export function desconectar(estado: EstadoDaSala | null, id: string, agora: number): Resultado {
  if (estado === null || !estado.pessoas.some((p) => p.id === id && p.conectada)) {
    return semMudanca(estado);
  }
  const pessoas = estado.pessoas.map((p) => (p.id === id ? { ...p, conectada: false, caiuEm: agora } : p));
  return resultadoComSala({ ...estado, pessoas, atualizadaEm: agora }, null);
}

/** Ninguém conectado: a sala conta o tempo para fechar desde a última mudança. */
function semNinguem(estado: EstadoDaSala): boolean {
  return !estado.pessoas.some((p) => p.conectada);
}

/**
 * Quando o Durable Object deve chamar `alarme` (ms), ou `null` se não há o que
 * esperar: o fim do tempo de queda de quem caiu, o tempo de cutucar quem
 * escolhe e o fechamento da sala sem ninguém. O DO agenda este instante com
 * `ctx.storage.setAlarm` depois de cada mudança.
 */
export function proximoAlarme(estado: EstadoDaSala | null, tempos: TemposDaSala = TEMPOS_DA_SALA): number | null {
  if (estado === null) return null;
  const instantes = estado.pessoas.flatMap((p) => (!p.conectada && p.caiuEm !== null ? [p.caiuEm + tempos.queda] : []));
  if (semNinguem(estado)) instantes.push(estado.atualizadaEm + tempos.vazia);
  const partida = partidaEmJogo(estado);
  if (partida && !partida.podeCutucar) instantes.push(partida.vezDesde + tempos.cutucar);
  return instantes.length > 0 ? Math.min(...instantes) : null;
}

/**
 * O alarme tocou (ou o tempo passou): a sala sem ninguém há `tempos.vazia`
 * fecha (`estado: null`: o DO apaga o storage e o código fica livre); quem
 * caiu há `tempos.queda` sai da partida (e deixa de ser Anfitrião); e quem
 * escolhe há `tempos.cutucar` pode ser cutucado. Sem nada vencido, devolve o
 * mesmo estado.
 */
export function alarme(estado: EstadoDaSala | null, agora: number, tempos: TemposDaSala = TEMPOS_DA_SALA): Resultado {
  if (estado === null) return semMudanca(estado);
  if (semNinguem(estado) && agora - estado.atualizadaEm >= tempos.vazia) return semMudanca(null);
  let sala = estado;
  let mudouASala = false;
  let mudouAPartida = false;
  for (const caida of estado.pessoas) {
    if (caida.conectada || caida.caiuEm === null || agora - caida.caiuEm < tempos.queda) continue;
    mudouASala = true;
    sala = { ...sala, pessoas: sala.pessoas.map((p) => (p.id === caida.id ? { ...p, caiuEm: null } : p)), atualizadaEm: agora };
    const indice = indiceNaPartida(sala, caida.id);
    if (indice >= 0) {
      sala = tirarDaPartida(sala, indice, agora);
      mudouAPartida = true;
    }
    // Sem partida em jogo, quem não voltou vai embora da sala; com partida, fica De fora.
    sala = partidaEmJogo(sala) ? { ...sala, anfitriao: passarAnfitriao(sala, caida.id) } : irEmbora(sala, caida.id);
  }
  const partida = partidaEmJogo(sala);
  if (partida && !partida.podeCutucar && agora - partida.vezDesde >= tempos.cutucar) {
    mudouASala = true;
    sala = { ...sala, partida: { ...partida, podeCutucar: true } };
  }
  if (!mudouASala) return semMudanca(estado);
  return mudouAPartida ? resultadoComPartida(sala, null) : resultadoComSala(sala, null);
}
