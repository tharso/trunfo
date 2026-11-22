// Como a tela fala das pessoas da mesa com 3 ou 4 pessoas (docs/spec.md, parte 9,
// itens 13 e 20): iniciais do Apelido no placar e a ordem da lista do fim.
import { describe, expect, it } from "vitest";
import { iniciaisDoApelido, ordemDoFim } from "./mesa";

describe("iniciais do Apelido", () => {
  it("uma palavra: a primeira letra, maiúscula", () => {
    expect(iniciaisDoApelido("ana")).toBe("A");
  });

  it("duas ou mais palavras: a primeira letra das duas primeiras", () => {
    expect(iniciaisDoApelido("Ana Clara")).toBe("AC");
    expect(iniciaisDoApelido("joão pedro da silva")).toBe("JP");
  });

  it("o número do Apelido repetido entra nas iniciais", () => {
    expect(iniciaisDoApelido("Ana 2")).toBe("A2");
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
