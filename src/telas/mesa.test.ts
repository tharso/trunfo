// Como a tela fala das pessoas da mesa com 3 ou 4 pessoas (docs/spec.md, parte 9,
// item 13): iniciais do Apelido no placar. A ordem da lista do fim é das regras (src/regras/fim.test.ts).
import { describe, expect, it } from "vitest";
import { iniciaisDoApelido } from "./mesa";

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
