import { describe, expect, it } from "vitest";
import baralho from "../dados/baralho.json";
import { aparencia, cartaPeloCodigo, CREDITOS_DAS_FOTOS, enderecoDaLicenca } from "./doBaralho";

describe("foto da carta", () => {
  it("carta com foto aponta para /fotos/<slug>.webp; sem foto, null", () => {
    const comFoto = new Set(CREDITOS_DAS_FOTOS.map((c) => c.nome));
    for (const dados of baralho.cartas) {
      const { foto } = aparencia(cartaPeloCodigo(dados.codigo));
      expect(foto).toBe(comFoto.has(dados.nome) ? `/fotos/${dados.slug}.webp` : null);
    }
  });

  it("carta fora do baralho fica sem foto e com iniciais", () => {
    const carta = { codigo: "ZZ", nome: "Fulano", notas: cartaPeloCodigo("1A").notas, superTrunfo: false, cartaA: false };
    expect(aparencia(carta)).toMatchObject({ foto: null, iniciais: "Fu" });
  });

  it("todo crédito tem autor, licença e página do Commons", () => {
    for (const credito of CREDITOS_DAS_FOTOS) {
      expect(credito.autor).not.toBe("");
      expect(credito.licenca).not.toBe("");
      expect(credito.pagina).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});

describe("enderecoDaLicenca", () => {
  it("monta o endereço das licenças Creative Commons", () => {
    expect(enderecoDaLicenca("CC BY-SA 4.0")).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(enderecoDaLicenca("CC BY 2.0")).toBe("https://creativecommons.org/licenses/by/2.0/");
  });

  it("sem endereço para CC0 e domínio público", () => {
    expect(enderecoDaLicenca("CC0")).toBeNull();
    expect(enderecoDaLicenca("Public domain")).toBeNull();
  });
});
