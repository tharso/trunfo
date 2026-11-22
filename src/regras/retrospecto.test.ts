// Testes do Retrospecto (docs/spec.md, parte 8) pela interface pública do módulo de regras.
import { describe, expect, it } from "vitest";
import baralhoJson from "../dados/baralho.json";
import {
  aplicar,
  criarPartida,
  registrarPartida,
  resultadoDaPartida,
  retrospectoVazio,
  type Carta,
  type Retrospecto,
} from "./index";

const baralho: Carta[] = baralhoJson.cartas;

describe("retrospecto", () => {
  it("começa zerado nos dois níveis", () => {
    expect(retrospectoVazio()).toEqual({
      facil: { vitorias: 0, derrotas: 0, empates: 0 },
      normal: { vitorias: 0, derrotas: 0, empates: 0 },
    });
  });

  it("conta vitória, derrota e empate só no nível da partida", () => {
    let r = retrospectoVazio();
    r = registrarPartida(r, "normal", "vitoria");
    r = registrarPartida(r, "normal", "vitoria");
    r = registrarPartida(r, "normal", "derrota");
    r = registrarPartida(r, "normal", "empate");
    r = registrarPartida(r, "facil", "derrota");
    expect(r).toEqual({
      facil: { vitorias: 0, derrotas: 1, empates: 0 },
      normal: { vitorias: 2, derrotas: 1, empates: 1 },
    });
  });

  it("sair no meio conta como derrota", () => {
    const r = registrarPartida(retrospectoVazio(), "facil", "saida");
    expect(r.facil).toEqual({ vitorias: 0, derrotas: 1, empates: 0 });
  });

  it("não muda o retrospecto recebido", () => {
    const antes = retrospectoVazio();
    const copia: Retrospecto = JSON.parse(JSON.stringify(antes));
    registrarPartida(antes, "normal", "vitoria");
    expect(antes).toEqual(copia);
  });
});

describe("resultado da partida para uma pessoa", () => {
  const partida = () => criarPartida({ baralho, pessoas: ["humano", "computador"], nivel: "normal", semente: 7 });

  it("quem sai pelo menu tem saída; quem fica ganha", () => {
    const { estado } = aplicar(partida(), { tipo: "sair", pessoa: 0 });
    expect(resultadoDaPartida(estado, 0)).toBe("saida");
    expect(resultadoDaPartida(estado, 1)).toBe("vitoria");
  });

  it("vitória, derrota e empate pelo Fim", () => {
    const base = partida();
    const ganhou = { ...base, fim: { vencedor: 0, motivo: "todasAsCartas" as const, rodadasJogadas: 20 } };
    expect(resultadoDaPartida(ganhou, 0)).toBe("vitoria");
    expect(resultadoDaPartida(ganhou, 1)).toBe("derrota");
    const empatou = { ...base, fim: { vencedor: null, motivo: "limiteDeRodadas" as const, rodadasJogadas: 100 } };
    expect(resultadoDaPartida(empatou, 0)).toBe("empate");
  });

  it("sem resultado enquanto a partida não acabou", () => {
    expect(resultadoDaPartida(partida(), 0)).toBeNull();
  });
});
