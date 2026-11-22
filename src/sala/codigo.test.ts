import { describe, expect, it } from "vitest";
import { lerCodigo, sortearCodigo } from "./codigo";

describe("sortearCodigo", () => {
  it("tem 3 letras, sem O e sem I", () => {
    let i = 0;
    const valores = [0, 0.5, 0.999];
    for (let vez = 0; vez < 500; vez++) {
      const codigo = sortearCodigo(() => Math.random());
      expect(codigo).toMatch(/^[A-HJ-NP-Z]{3}$/);
    }
    expect(sortearCodigo(() => valores[i++ % 3])).toBe("ANZ");
  });
});

describe("lerCodigo", () => {
  it("aceita minúsculas e espaços em volta", () => {
    expect(lerCodigo(" abc ")).toBe("ABC");
  });

  it("recusa O, I, números e tamanho errado", () => {
    for (const texto of ["ABO", "IAB", "AB1", "AB", "ABCD", "", "nova"]) {
      expect(lerCodigo(texto)).toBeNull();
    }
  });
});
