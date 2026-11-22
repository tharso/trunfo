// Cada um no seu ritmo (docs/spec.md, parte 9, item 11): o celular guarda as
// rodadas numa fila e mostra uma de cada vez.
import { describe, expect, it } from "vitest";
import type { EventoDaRodada } from "../regras";
import type { PartidaVista } from "../sala/protocolo";
import { avancar, filaVazia, receberNaFila, type FilaDaPartida } from "./fila";

function vista(rodada: number, quemEscolhe = 0, fim: PartidaVista["fim"] = null): PartidaVista {
  return {
    pessoas: [
      { apelido: "Ana", cartas: 16 },
      { apelido: "Bia", cartas: 16 },
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
    expect(receberNaFila(fila, { tipo: "partida", vista: vista(3) })).toBe(fila);
  });

  it("uma partida diferente do que o celular sabe (perdeu rodadas sem rede) toma o lugar da fila", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) }, rodada(1));
    const nova = receberNaFila(fila, { tipo: "partida", vista: vista(5, 1) });
    expect(nova).toEqual({ vista: vista(5, 1), duelo: null, esperando: [] });
  });

  it("Próxima rodada sem duelo não muda nada", () => {
    const fila = receberTodas({ tipo: "partida", vista: vista(1) });
    expect(avancar(fila)).toBe(fila);
  });
});
