// O arquivo do Baralho que o jogo lê (gerado por scripts/gerar_baralho.py).
// Os mesmos pontos do teste em Python (scripts/tests), aqui do lado do jogo.
import { describe, expect, it } from "vitest";
import baralho from "./baralho.json";

const cartas = baralho.cartas;

describe("baralho.json", () => {
  it("tem 32 cartas com códigos de 1A a 8D", () => {
    const esperados = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((g) => ["A", "B", "C", "D"].map((l) => `${g}${l}`));
    expect(cartas.map((c) => c.codigo).sort()).toEqual(esperados.sort());
  });

  it("tem notas de 1 a 99 nos 6 atributos", () => {
    const chaves = baralho.atributos.map((a) => a.chave);
    expect(chaves).toHaveLength(6);
    for (const c of cartas) {
      expect(Object.keys(c.notas)).toEqual(chaves);
      for (const n of Object.values(c.notas)) {
        expect(Number.isInteger(n) && n >= 1 && n <= 99).toBe(true);
      }
    }
  });

  it("tem 1 Super Trunfo e 4 Cartas A", () => {
    expect(cartas.filter((c) => c.superTrunfo).map((c) => c.nome)).toEqual(["Valentin Paret-Peintre"]);
    expect(cartas.filter((c) => c.cartaA).map((c) => c.nome).sort()).toEqual([
      "Jasper Philipsen",
      "Jonathan Milan",
      "Paul Magnier",
      "Tim Merlier",
    ]);
  });

  it("não tem Pavê 10 sem estimativa", () => {
    for (const c of cartas) {
      if (c.notas.pave === 10) expect(c.estimadas).toContain("pave");
    }
  });

  it("dá 2 cores a toda equipe e país ISO-2 a toda carta", () => {
    for (const c of cartas) {
      expect(c.cores).toHaveLength(2);
      for (const cor of c.cores) expect(cor).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.pais).toMatch(/^[A-Z]{2}$/);
    }
  });
});
