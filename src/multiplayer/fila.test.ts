// Cada um no seu ritmo (docs/spec.md, parte 9, item 11): o celular guarda as
// rodadas numa fila e mostra uma de cada vez.
import { describe, expect, it } from "vitest";
import type { EventoDaRodada } from "../regras";
import type { PartidaVista } from "../sala/protocolo";
import { avancar, filaVazia, receberNaFila, rodadaDaSuaVez, type FilaDaPartida } from "./fila";

function vista(rodada: number, quemEscolhe = 0, fim: PartidaVista["fim"] = null): PartidaVista {
  return {
    pessoas: [
      { apelido: "Ana", cartas: 16, fora: null },
      { apelido: "Bia", cartas: 16, fora: null },
    ],
    voce: 1,
    monteDeEmpate: 0,
    rodada,
    limiteDeRodadas: 100,
    quemEscolhe,
    suaCarta: "2B",
    fim,
  };
}

function rodada(numero: number, quemEscolhe = 0) {
  const evento: EventoDaRodada = {
    tipo: "rodada",
    rodada: numero,
    quemEscolheu: 0,
    atributo: "montanha",
    mesa: [
      { pessoa: 0, codigo: "1A", nota: 90 },
      { pessoa: 1, codigo: "2B", nota: 80 },
    ],
    vencedor: 0,
    motivo: "nota",
    cartasLevadas: 2,
    doMonteDeEmpate: 0,
  };
  return { tipo: "rodada", evento, depois: vista(numero + 1, quemEscolhe) } as const;
}

function receberTodas(...mensagens: Parameters<typeof receberNaFila>[1][]): FilaDaPartida {
  return mensagens.reduce(receberNaFila, filaVazia());
}

describe("a fila da partida", () => {
  it("a partida que chega vira o que a tela mostra", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) });
    expect(fila.vista).toEqual(vista(1));
    expect(fila.duelo).toBeNull();
  });

  it("a rodada que chega abre o duelo; a partida só anda em Próxima rodada", () => {
    const noDuelo = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1));
    expect(noDuelo.duelo?.evento.rodada).toBe(1);
    expect(noDuelo.vista?.rodada).toBe(1);
    const depois = avancar(noDuelo);
    expect(depois.duelo).toBeNull();
    expect(depois.vista?.rodada).toBe(2);
  });

  it("a rodada seguinte que chega no meio do duelo espera na fila", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1), rodada(2), rodada(3));
    expect(fila.duelo?.evento.rodada).toBe(1);
    const segunda = avancar(fila);
    expect(segunda.duelo?.evento.rodada).toBe(2);
    expect(segunda.vista?.rodada).toBe(2);
    const terceira = avancar(segunda);
    expect(terceira.duelo?.evento.rodada).toBe(3);
    const fim = avancar(terceira);
    expect(fim.duelo).toBeNull();
    expect(fim.vista?.rodada).toBe(4);
  });

  it("a mesma partida de novo (ao reconectar) não corta o duelo", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1), rodada(2));
    expect(receberNaFila(fila, { tipo: "partida", vista: vista(3) })).toEqual(fila);
  });

  it("alguém sai da partida no meio do duelo: o placar muda depois de Próxima rodada", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1));
    const semAna: PartidaVista = {
      ...vista(2),
      pessoas: [
        { apelido: "Ana", cartas: 0, fora: "saiu" },
        { apelido: "Bia", cartas: 16, fora: null },
      ],
      fim: { vencedor: 1, motivo: "saida", rodadasJogadas: 1 },
    };
    const saiu = receberNaFila(fila, { tipo: "partida", vista: semAna });
    expect(saiu.duelo?.evento.rodada).toBe(1);
    expect(saiu.vista).toEqual(vista(1));
    expect(avancar(saiu).vista).toEqual(semAna);
  });

  it("alguém sai fora do duelo: o placar muda na hora", () => {
    const semAna: PartidaVista = { ...vista(1), pessoas: [{ apelido: "Ana", cartas: 0, fora: "saiu" }, vista(1).pessoas[1]] };
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, { tipo: "partida", vista: semAna });
    expect(fila.vista).toEqual(semAna);
  });

  it("uma partida diferente do que o celular sabe (perdeu rodadas sem rede) toma o lugar da fila", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1));
    const nova = receberNaFila(fila, { tipo: "partida", vista: vista(5, 1) });
    expect(nova).toEqual({ vista: vista(5, 1), duelo: null, esperando: [] });
  });

  it("Jogar de novo: a partida nova toma o lugar da que acabou, mesmo na mesma rodada", () => {
    // Bia saiu na 1ª rodada: a partida acabou ali. A nova também começa na rodada 1.
    const acabou = receberTodas({ tipo: "partida", vista: vista(1, 0, { vencedor: 0, motivo: "saida", rodadasJogadas: 0 }) });
    const nova = receberNaFila(acabou, { tipo: "partida", vista: vista(1, 1) });
    expect(nova).toEqual({ vista: vista(1, 1), duelo: null, esperando: [] });
  });

  it("Próxima rodada sem duelo não muda nada", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) });
    expect(avancar(fila)).toBe(fila);
  });
});

describe("a sua vez na tela", () => {
  it("é a rodada que você escolhe, assim que ela aparece (sem duelo antes dela)", () => {
    expect(rodadaDaSuaVez(receberTodas({ tipo: "partida", vista: vista(1, 1) }))).toBe(1);
    expect(rodadaDaSuaVez(receberTodas({ tipo: "partida", vista: vista(1, 0) }))).toBeNull();
  });

  it("só chega depois do seu Próxima rodada: com o duelo na tela, ainda não", () => {
    const noDuelo = receberTodas({ tipo: "partida", vista: vista(1, 0) }, rodada(1, 1));
    expect(rodadaDaSuaVez(noDuelo)).toBeNull();
    expect(rodadaDaSuaVez(avancar(noDuelo))).toBe(2);
  });

  it("no fim e De fora não há vez", () => {
    const fim = { vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 20 } as const;
    expect(rodadaDaSuaVez(receberTodas({ tipo: "partida", vista: vista(20, 1, fim) }))).toBeNull();
    const deFora = { ...vista(3, 1), pessoas: [vista(3).pessoas[0], { apelido: "Bia", cartas: 0, fora: "saiu" as const }] };
    expect(rodadaDaSuaVez(receberTodas({ tipo: "partida", vista: deFora }))).toBeNull();
  });
});
