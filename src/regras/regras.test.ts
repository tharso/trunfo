// Testes do módulo de regras pela interface pública (docs/spec.md, partes 3 e 4).
import { describe, expect, it } from "vitest";
import baralhoJson from "../dados/baralho.json";
import { ATRIBUTOS, aplicar, criarPartida, type Carta, type Estado } from "./index";

const baralho: Carta[] = baralhoJson.cartas;

// Carta de teste: todas as notas iguais a `nota`, menos as que vierem em `notas`.
function carta(codigo: string, nota = 50, notas: Partial<Carta["notas"]> = {}): Carta {
  return {
    codigo,
    nome: `Ciclista ${codigo}`,
    notas: { sprint: nota, explosao: nota, montanha: nota, contrarrelogio: nota, pave: nota, voltas: nota, ...notas },
    superTrunfo: false,
    cartaA: false,
  };
}

function partidaSolo(semente = 1): Estado {
  return criarPartida({ baralho, pessoas: ["humano", "computador"], nivel: "facil", semente });
}

// Partida com os montes já arrumados, para testar uma rodada conhecida.
function partidaArrumada(montes: Carta[][], quemEscolhe = 0, rodada = 1): Estado {
  const cartas = montes.flat();
  const estado = criarPartida({
    baralho: cartas,
    pessoas: montes.map((_, i) => (i === 0 ? "humano" : "computador")),
    nivel: "facil",
    semente: 1,
  });
  return {
    ...estado,
    pessoas: estado.pessoas.map((p, i) => ({ ...p, monte: montes[i].map((c) => c.codigo) })),
    quemEscolhe,
    rodada,
  };
}

describe("criar partida", () => {
  it("embaralha e divide o baralho igualmente entre as pessoas", () => {
    const estado = partidaSolo();
    const [voce, computador] = estado.pessoas;
    expect(voce.monte).toHaveLength(16);
    expect(computador.monte).toHaveLength(16);
    expect([...voce.monte, ...computador.monte].sort()).toEqual(baralho.map((c) => c.codigo).sort());
  });

  it("dá montes diferentes com sementes diferentes e iguais com a mesma semente", () => {
    expect(partidaSolo(1).pessoas[0].monte).toEqual(partidaSolo(1).pessoas[0].monte);
    expect(partidaSolo(1).pessoas[0].monte).not.toEqual(partidaSolo(2).pessoas[0].monte);
  });

  it("sorteia quem escolhe na 1ª rodada", () => {
    const quemComeca = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => partidaSolo(s).quemEscolhe));
    expect(quemComeca).toEqual(new Set([0, 1]));
  });
});
