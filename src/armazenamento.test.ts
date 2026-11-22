// Partida guardada no celular (docs/spec.md, parte 8): "Continuar" só aparece
// para uma partida que ainda dá para jogar com o baralho atual.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guardarPartida, lerPartida } from "./armazenamento";
import baralhoJson from "./dados/baralho.json";
import { criarPartida, type Carta, type Estado } from "./regras";

const baralho: Carta[] = baralhoJson.cartas;

function partidaSolo(): Estado {
  return criarPartida({ baralho, pessoas: ["humano", "computador"], nivel: "facil", semente: 7 });
}

beforeEach(() => {
  const guardado = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (chave: string) => guardado.get(chave) ?? null,
    setItem: (chave: string, valor: string) => guardado.set(chave, valor),
    removeItem: (chave: string) => guardado.delete(chave),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("partida guardada", () => {
  it("volta igual depois de guardada", () => {
    const estado = partidaSolo();
    guardarPartida(estado);
    expect(lerPartida()).toEqual(estado);
  });

  it("com uma carta que não existe mais no baralho, não há partida guardada", () => {
    const estado = partidaSolo();
    estado.pessoas[1].monte[0] = "carta-que-saiu-do-baralho";
    guardarPartida(estado);
    expect(lerPartida()).toBeNull();
  });

  it("com uma pessoa de tipo desconhecido, não há partida guardada", () => {
    const estado = partidaSolo();
    (estado.pessoas[1] as { tipo: string }).tipo = "robo";
    guardarPartida(estado);
    expect(lerPartida()).toBeNull();
  });
});
