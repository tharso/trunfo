import { describe, expect, it } from "vitest";
import { codigoDaSala } from "./rota";

describe("codigoDaSala", () => {
  it("tira o código de /sala/<código>", () => {
    expect(codigoDaSala("/sala/ABC")).toBe("ABC");
  });

  it("ignora o que vem depois do código", () => {
    expect(codigoDaSala("/sala/XYZ/qualquer")).toBe("XYZ");
  });

  it("não é sala fora de /sala/", () => {
    expect(codigoDaSala("/")).toBeNull();
    expect(codigoDaSala("/salada")).toBeNull();
    expect(codigoDaSala("/assets/sala/ABC.js")).toBeNull();
  });

  it("não é sala sem código", () => {
    expect(codigoDaSala("/sala/")).toBeNull();
    expect(codigoDaSala("/sala")).toBeNull();
  });
});
