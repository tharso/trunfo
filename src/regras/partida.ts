// A partida: criar, aplicar ações e ler o estado (docs/spec.md, parte 3).
// Funções puras: nunca mudam o estado recebido; devolvem um estado novo.
import { escolhaDoComputador } from "./computador";
import { embaralhar, sortear, type Sorteio } from "./sorteio";
import type {
  Acao,
  Carta,
  ChaveAtributo,
  Estado,
  Evento,
  MotivoDaRodada,
  Nivel,
  MotivoDoFim,
  TipoDePessoa,
} from "./tipos";

export const LIMITE_DE_RODADAS = 100;

export interface NovaPartida {
  baralho: readonly Carta[];
  /** De 2 a 4 pessoas, na Ordem da mesa. No modo solo: `["humano", "computador"]`. */
  pessoas: readonly TipoDePessoa[];
  nivel: Nivel;
  /** A fonte de sorteio. Fixe a semente para ter sempre a mesma partida. */
  semente: Sorteio;
}

export function criarPartida({ baralho, pessoas, nivel, semente }: NovaPartida): Estado {
  if (pessoas.length < 2 || pessoas.length > 4) throw new Error("A partida é de 2 a 4 pessoas.");
  const embaralhado = embaralhar(
    baralho.map((c) => c.codigo),
    semente,
  );
  // Divide igualmente: cada pessoa recebe o mesmo número de cartas. Se a
  // divisão não é exata (32 cartas para 3 pessoas), a sobra fica fora da partida.
  const porPessoa = Math.floor(baralho.length / pessoas.length);
  const primeira = sortear(embaralhado.sorteio, pessoas.length);
  return {
    baralho: baralho.map((c) => ({ ...c })),
    pessoas: pessoas.map((tipo, i) => ({
      tipo,
      monte: embaralhado.lista.slice(i * porPessoa, (i + 1) * porPessoa),
      fora: null,
    })),
    nivel,
    monteDeEmpate: [],
    quemEscolhe: primeira.valor,
    rodada: 1,
    limiteDeRodadas: LIMITE_DE_RODADAS,
    sorteio: primeira.sorteio,
    fim: null,
  };
}

/** A carta de cima do monte de uma pessoa, ou `null` se o monte está vazio. */
export function cartaDeCima(estado: Estado, pessoa: number): Carta | null {
  const codigo = estado.pessoas[pessoa]?.monte[0];
  return codigo === undefined ? null : buscarCarta(estado, codigo);
}

/**
 * O atributo que o Computador vai escolher na rodada atual, para a tela
 * mostrar antes de disputar ("O computador escolheu …"). `null` se não é a vez dele.
 */
export function atributoDoComputador(estado: Estado): ChaveAtributo | null {
  if (estado.fim || estado.pessoas[estado.quemEscolhe].tipo !== "computador") return null;
  const carta = cartaDeCima(estado, estado.quemEscolhe)!;
  return escolhaDoComputador(carta, estado.nivel, estado.sorteio, estado.baralho).atributo;
}

/** Aplica uma ação. Devolve o estado novo e o que aconteceu. Ação inválida lança erro. */
export function aplicar(estado: Estado, acao: Acao): { estado: Estado; eventos: Evento[] } {
  if (estado.fim) throw new Error("A partida já acabou.");
  const novo = copiar(estado);
  switch (acao.tipo) {
    case "escolher": {
      const quem = novo.pessoas[acao.pessoa];
      if (acao.pessoa !== novo.quemEscolhe) throw new Error("Não é a vez desta pessoa escolher.");
      if (quem.tipo === "computador") throw new Error("O Computador escolhe com a ação computadorEscolhe.");
      return { estado: novo, eventos: disputarRodada(novo, acao.atributo) };
    }
    case "computadorEscolhe": {
      if (novo.pessoas[novo.quemEscolhe].tipo !== "computador") throw new Error("Não é a vez do Computador.");
      const carta = cartaDeCima(novo, novo.quemEscolhe)!;
      const escolha = escolhaDoComputador(carta, novo.nivel, novo.sorteio, novo.baralho);
      novo.sorteio = escolha.sorteio;
      return { estado: novo, eventos: disputarRodada(novo, escolha.atributo) };
    }
    case "sair":
      return { estado: novo, eventos: sair(novo, acao.pessoa) };
  }
}

// ---- Por dentro ----

function copiar(estado: Estado): Estado {
  return {
    ...estado,
    pessoas: estado.pessoas.map((p) => ({ ...p, monte: [...p.monte] })),
    monteDeEmpate: [...estado.monteDeEmpate],
  };
}

function buscarCarta(estado: Estado, codigo: string): Carta {
  const carta = estado.baralho.find((c) => c.codigo === codigo);
  if (!carta) throw new Error(`Carta ${codigo} não está no baralho.`);
  return carta;
}

function naPartida(estado: Estado): number[] {
  return estado.pessoas.flatMap((p, i) => (p.fora === null ? [i] : []));
}

type CartaNaMesa = { pessoa: number; nota: number; superTrunfo: boolean; cartaA: boolean };

/** Quem ganha a disputa entre as cartas da mesa (docs/spec.md, parte 3, itens 3, 4 e 6). */
function decidirRodada(mesa: CartaNaMesa[]): { vencedor: number | null; motivo: MotivoDaRodada } {
  const superTrunfo = mesa.find((m) => m.superTrunfo);
  if (!superTrunfo) return compararNotas(mesa, "nota");
  const cartaA = mesa.find((m) => m.cartaA);
  if (!cartaA) return { vencedor: superTrunfo.pessoa, motivo: "superTrunfo" };
  // Com 2 cartas na mesa, a Carta A ganha. Com 3–4, o Super Trunfo sai da disputa
  // e as outras cartas comparam o atributo.
  if (mesa.length === 2) return { vencedor: cartaA.pessoa, motivo: "cartaA" };
  return compararNotas(
    mesa.filter((m) => m !== superTrunfo),
    "cartaA",
  );
}

function compararNotas(
  mesa: CartaNaMesa[],
  motivo: MotivoDaRodada,
): { vencedor: number | null; motivo: MotivoDaRodada } {
  const maior = Math.max(...mesa.map((m) => m.nota));
  const comMaior = mesa.filter((m) => m.nota === maior);
  if (comMaior.length > 1) return { vencedor: null, motivo: "empate" };
  return { vencedor: comMaior[0].pessoa, motivo };
}

/** Muda `estado` (já copiado) e devolve os eventos. */
function disputarRodada(estado: Estado, atributo: ChaveAtributo): Evento[] {
  const quemEscolheu = estado.quemEscolhe;
  const mesa = naPartida(estado).map((pessoa) => {
    const codigo = estado.pessoas[pessoa].monte.shift()!;
    const carta = buscarCarta(estado, codigo);
    return { pessoa, codigo, nota: carta.notas[atributo], superTrunfo: carta.superTrunfo, cartaA: carta.cartaA };
  });
  const { vencedor, motivo } = decidirRodada(mesa);
  const cartasDaMesa = mesa.map((m) => m.codigo);

  let cartasLevadas = 0;
  let doMonteDeEmpate = 0;
  if (vencedor === null) {
    estado.monteDeEmpate.push(...cartasDaMesa);
  } else {
    doMonteDeEmpate = estado.monteDeEmpate.length;
    const levadas = [...cartasDaMesa, ...estado.monteDeEmpate];
    estado.pessoas[vencedor].monte.push(...levadas);
    estado.monteDeEmpate = [];
    cartasLevadas = levadas.length;
  }

  const eventos: Evento[] = [
    {
      tipo: "rodada",
      rodada: estado.rodada,
      quemEscolheu,
      atributo,
      mesa: mesa.map(({ pessoa, codigo, nota }) => ({ pessoa, codigo, nota })),
      vencedor,
      motivo,
      cartasLevadas,
      doMonteDeEmpate,
    },
  ];

  // Quem ficou sem cartas sai.
  for (const pessoa of naPartida(estado)) {
    if (estado.pessoas[pessoa].monte.length === 0) {
      estado.pessoas[pessoa].fora = "semCartas";
      eventos.push({ tipo: "saiu", pessoa, motivo: "semCartas" });
    }
  }

  // Quem ganha escolhe. No empate, quem escolheu escolhe de novo; se saiu, a próxima da Ordem da mesa.
  estado.quemEscolhe = vencedor ?? proximaNaPartida(estado, quemEscolheu);

  const restantes = naPartida(estado);
  if (restantes.length === 1) {
    // Se a rodada empatou, as cartas dela ficaram no monte de empate: quem sobrou não tem todas.
    const motivoDoFim = estado.monteDeEmpate.length > 0 ? "ultimaNaPartida" : "todasAsCartas";
    terminar(estado, eventos, restantes[0], motivoDoFim, estado.rodada);
  } else if (restantes.length === 0) {
    // Todo mundo ficou sem cartas no mesmo empate.
    terminar(estado, eventos, null, "semCartas", estado.rodada);
  } else if (estado.rodada >= estado.limiteDeRodadas) {
    terminar(estado, eventos, quemTemMaisCartas(estado), "limiteDeRodadas", estado.rodada);
  } else {
    estado.rodada += 1;
  }
  return eventos;
}

function sair(estado: Estado, pessoa: number): Evento[] {
  const quem = estado.pessoas[pessoa];
  if (!quem || quem.fora !== null) throw new Error("Esta pessoa não está na partida.");
  // As cartas de quem sai saem do jogo e não vão para ninguém.
  quem.monte = [];
  quem.fora = "saiu";
  const eventos: Evento[] = [{ tipo: "saiu", pessoa, motivo: "saiu" }];
  const restantes = naPartida(estado);
  if (restantes.length <= 1) {
    terminar(estado, eventos, restantes[0] ?? null, "saida", estado.rodada - 1);
  } else if (estado.quemEscolhe === pessoa) {
    estado.quemEscolhe = proximaNaPartida(estado, pessoa);
  }
  return eventos;
}

/** A própria pessoa, se ainda está na partida; senão, a próxima na Ordem da mesa. */
function proximaNaPartida(estado: Estado, pessoa: number): number {
  const n = estado.pessoas.length;
  for (let i = 0; i < n; i++) {
    const candidata = (pessoa + i) % n;
    if (estado.pessoas[candidata].fora === null) return candidata;
  }
  return pessoa;
}

function quemTemMaisCartas(estado: Estado): number | null {
  const tamanhos = naPartida(estado).map((pessoa) => ({ pessoa, cartas: estado.pessoas[pessoa].monte.length }));
  const maior = Math.max(...tamanhos.map((t) => t.cartas));
  const comMaior = tamanhos.filter((t) => t.cartas === maior);
  return comMaior.length === 1 ? comMaior[0].pessoa : null;
}

function terminar(
  estado: Estado,
  eventos: Evento[],
  vencedor: number | null,
  motivo: MotivoDoFim,
  rodadasJogadas: number,
): void {
  estado.fim = { vencedor, motivo, rodadasJogadas };
  eventos.push({ tipo: "fim", ...estado.fim });
}
