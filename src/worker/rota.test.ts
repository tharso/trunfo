import { describe, expect, it } from "vitest";
import { rotaDaSala } from "./rota";

describe("rotaDaSala", () => {
  it("/sala/<código> é a conexão com aquela sala", () => {
    expect(rotaDaSala("/sala/ABC")).toEqual({ tipo: "sala", codigo: "ABC" });
  });

  it("ignora o que vem depois do código", () => {
    expect(rotaDaSala("/sala/XYZ/qualquer")).toEqual({ tipo: "sala", codigo: "XYZ" });
  });

  it("/sala/nova cria uma sala", () => {
    expect(rotaDaSala("/sala/nova")).toEqual({ tipo: "criar" });
  });

  it("código fora do formato (O, I, minúsculas, tamanho) não é sala", () => {
    for (const caminho of ["/sala/ABO", "/sala/abc", "/sala/ABCD", "/sala/", "/sala/TESTE"]) {
      expect(rotaDaSala(caminho)).toEqual({ tipo: "naoExiste" });
    }
  });

  it("fora de /sala/ é arquivo do site", () => {
    expect(rotaDaSala("/")).toBeNull();
    expect(rotaDaSala("/sala")).toBeNull();
    expect(rotaDaSala("/salada")).toBeNull();
    expect(rotaDaSala("/s/ABC")).toBeNull();
    expect(rotaDaSala("/assets/sala/ABC.js")).toBeNull();
  });
});
