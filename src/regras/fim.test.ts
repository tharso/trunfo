// Contas do fim da rodada e da partida que o solo e a sala mostram
// (docs/spec.md, partes 6 e 9, itens 20 e 21).
import { describe, expect, it } from "vitest";
import { ordemDoFim, quemFicouSemCartas, resultadoDoFim, resultadoDoVencedor } from "./index";

describe("resultado pelo vencedor", () => {
  it("quem é o vencedor ganha; as outras pessoas perdem; sem vencedor é empate", () => {
    expect(resultadoDoVencedor(2, 2)).toBe("vitoria");
    expect(resultadoDoVencedor(2, 0)).toBe("derrota");
    expect(resultadoDoVencedor(null, 1)).toBe("empate");
  });

  it("o fim da partida usa a mesma conta", () => {
    expect(resultadoDoFim({ vencedor: 1, motivo: "todasAsCartas", rodadasJogadas: 20 }, 1)).toBe("vitoria");
    expect(resultadoDoFim({ vencedor: null, motivo: "limiteDeRodadas", rodadasJogadas: 100 }, 0)).toBe("empate");
  });
});

describe("quem ficou sem cartas no empate", () => {
  it("com 2 pessoas, é quem não ganhou", () => {
    expect(quemFicouSemCartas({ vencedor: 0, motivo: "ultimaNaPartida", rodadasJogadas: 30 }, 2)).toBe(1);
    expect(quemFicouSemCartas({ vencedor: 1, motivo: "ultimaNaPartida", rodadasJogadas: 30 }, 2)).toBe(0);
  });

  it("com 3 ou 4 pessoas, ou por outro motivo, não dá para dizer uma pessoa só", () => {
    expect(quemFicouSemCartas({ vencedor: 0, motivo: "ultimaNaPartida", rodadasJogadas: 30 }, 3)).toBeNull();
    expect(quemFicouSemCartas({ vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 30 }, 2)).toBeNull();
  });
});

describe("ordem da lista do fim", () => {
  const pessoa = (cartas: number, fora: "semCartas" | "saiu" | null = null) => ({ cartas, fora });

  it("em ordem de cartas no monte, quem tem mais primeiro", () => {
    expect(ordemDoFim([pessoa(5), pessoa(20), pessoa(0, "semCartas"), pessoa(7)])).toEqual([1, 3, 0, 2]);
  });

  it("quem saiu fica no fim da lista, mesmo depois de quem ficou sem cartas", () => {
    expect(ordemDoFim([pessoa(0, "saiu"), pessoa(0, "semCartas"), pessoa(32)])).toEqual([2, 1, 0]);
  });

  it("com o mesmo número de cartas, vale a Ordem da mesa", () => {
    expect(ordemDoFim([pessoa(10), pessoa(12), pessoa(10)])).toEqual([1, 0, 2]);
  });
});
