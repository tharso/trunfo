// A Sala antes da partida (docs/spec.md, parte 9, itens 1 a 8): reservar o
// código, entrar com Apelido e identificador secreto, Ordem da mesa, Anfitrião,
// sala cheia, partida em andamento e "Começar".
import { describe, expect, it } from "vitest";
import type { MensagemDaSala } from "./protocolo";
import { desconectar, receber, reservar, type EstadoDaSala, type Resultado } from "./sala";

const AGORA = 1_000_000;
const MINUTO = 60_000;

function salaNova(): EstadoDaSala {
  const estado = reservar(null, "ABC", AGORA);
  if (!estado) throw new Error("a sala devia estar livre");
  return estado;
}

function entrar(estado: EstadoDaSala | null, id: string, apelido: string, agora = AGORA): Resultado {
  return receber(estado, null, JSON.stringify({ tipo: "entrar", id, apelido }), agora);
}

/** Entra várias pessoas em sequência e devolve o estado final. */
function comPessoas(...apelidos: string[]): EstadoDaSala {
  let estado = salaNova();
  for (const apelido of apelidos) estado = entrar(estado, `id-${apelido}`, apelido).estado!;
  return estado;
}

/** A mensagem que a pessoa `id` recebe neste resultado. */
function paraQuem(resultado: Resultado, id: string): MensagemDaSala | undefined {
  return resultado.paraPessoas.find((envio) => envio.id === id)?.mensagem;
}

describe("reservar o código", () => {
  it("reserva um código livre", () => {
    expect(reservar(null, "ABC", AGORA)).not.toBeNull();
  });

  it("não reserva um código em uso", () => {
    expect(reservar(salaNova(), "ABC", AGORA + MINUTO)).toBeNull();
    expect(reservar(comPessoas("Ana"), "ABC", AGORA + 60 * MINUTO)).toBeNull();
  });

  it("a sala vazia há mais de 10 min está livre de novo", () => {
    const vazia = salaNova();
    expect(reservar(vazia, "ABC", AGORA + 11 * MINUTO)).not.toBeNull();
    const todosSairam = desconectar(comPessoas("Ana"), "id-Ana", AGORA).estado!;
    expect(reservar(todosSairam, "ABC", AGORA + 9 * MINUTO)).toBeNull();
    expect(reservar(todosSairam, "ABC", AGORA + 11 * MINUTO)).not.toBeNull();
  });
});

describe("entrar na sala", () => {
  it("quem entra recebe a sala com o código, a lista e quem é", () => {
    const resultado = entrar(salaNova(), "id-ana", "Ana");
    expect(resultado.conexao).toBe("id-ana");
    expect(paraQuem(resultado, "id-ana")).toEqual({
      tipo: "sala",
      codigo: "ABC",
      pessoas: [{ apelido: "Ana", conectada: true }],
      voce: 0,
      anfitriao: 0,
      emPartida: false,
    });
  });

  it("a Ordem da mesa é a ordem de entrada, e todos recebem a lista nova", () => {
    const antes = comPessoas("Ana", "Bia");
    const resultado = entrar(antes, "id-Caio", "Caio");
    for (const [id, voce] of [["id-Ana", 0], ["id-Bia", 1], ["id-Caio", 2]] as const) {
      const mensagem = paraQuem(resultado, id);
      expect(mensagem).toMatchObject({ tipo: "sala", voce, anfitriao: 0 });
      expect(mensagem?.tipo === "sala" && mensagem.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio"]);
    }
  });

  it("quem entra primeiro é o Anfitrião", () => {
    expect(comPessoas("Bia", "Ana").anfitriao).toBe("id-Bia");
  });

  it("Apelido repetido recebe um número", () => {
    let estado = salaNova();
    for (const [id, apelido] of [["1", "Ana"], ["2", "ana"], ["3", "Ana"], ["4", "Bia"]]) {
      estado = entrar(estado, id, apelido).estado!;
    }
    expect(estado.pessoas.map((p) => p.apelido)).toEqual(["Ana", "ana 2", "Ana 3", "Bia"]);
  });

  it("o Apelido perde os espaços em volta e fica com no máximo 20 letras", () => {
    const estado = comPessoas("  Ana  Maria ", "x".repeat(30));
    expect(estado.pessoas.map((p) => p.apelido)).toEqual(["Ana Maria", "x".repeat(20)]);
  });

  it("Apelido vazio ou mensagem estragada não mudam nada", () => {
    const estado = salaNova();
    for (const texto of ["", "{", "null", '{"tipo":"entrar","id":"x"}', '{"tipo":"entrar","id":"x","apelido":"  "}']) {
      const resultado = receber(estado, null, texto, AGORA);
      expect(resultado.estado).toBe(estado);
      expect(resultado.paraPessoas).toEqual([]);
      expect(resultado.resposta).toBeUndefined();
    }
  });

  it("o mesmo identificador secreto volta no mesmo lugar, com o mesmo Apelido", () => {
    const antes = desconectar(comPessoas("Ana", "Bia"), "id-Ana", AGORA).estado!;
    expect(antes.pessoas[0].conectada).toBe(false);
    const resultado = entrar(antes, "id-Ana", "Outro nome");
    expect(resultado.estado!.pessoas).toEqual([
      { id: "id-Ana", apelido: "Ana", conectada: true },
      { id: "id-Bia", apelido: "Bia", conectada: true },
    ]);
    expect(paraQuem(resultado, "id-Ana")).toMatchObject({ voce: 0 });
  });

  it("a quinta pessoa não entra: a sala está cheia", () => {
    const cheia = comPessoas("Ana", "Bia", "Caio", "Davi");
    const resultado = entrar(cheia, "id-Eva", "Eva");
    expect(resultado.resposta).toEqual({ tipo: "recusada", motivo: "cheia" });
    expect(resultado.estado).toBe(cheia);
    expect(resultado.conexao).toBeNull();
  });

  it("durante a partida ninguém novo entra, mas quem já estava volta", () => {
    const comecada = receber(comPessoas("Ana", "Bia"), "id-Ana", '{"tipo":"comecar"}', AGORA).estado!;
    expect(entrar(comecada, "id-Caio", "Caio").resposta).toEqual({ tipo: "recusada", motivo: "emPartida" });
    expect(entrar(comecada, "id-Bia", "Bia").conexao).toBe("id-Bia");
  });

  it("sala que não existe ou que já acabou: recusa com o motivo", () => {
    expect(entrar(null, "id-Ana", "Ana").resposta).toEqual({ tipo: "recusada", motivo: "acabou" });
    expect(entrar(salaNova(), "id-Ana", "Ana", AGORA + 11 * MINUTO).resposta).toEqual({
      tipo: "recusada",
      motivo: "acabou",
    });
  });
});

describe("começar", () => {
  it("o Anfitrião começa com 2 pessoas e todos ficam sabendo", () => {
    const resultado = receber(comPessoas("Ana", "Bia"), "id-Ana", '{"tipo":"comecar"}', AGORA);
    expect(resultado.estado!.emPartida).toBe(true);
    expect(paraQuem(resultado, "id-Bia")).toMatchObject({ tipo: "sala", emPartida: true });
  });

  it("só o Anfitrião começa", () => {
    const estado = comPessoas("Ana", "Bia");
    expect(receber(estado, "id-Bia", '{"tipo":"comecar"}', AGORA).estado).toBe(estado);
    expect(receber(estado, null, '{"tipo":"comecar"}', AGORA).estado).toBe(estado);
  });

  it("sozinho não dá para começar", () => {
    const estado = comPessoas("Ana");
    expect(receber(estado, "id-Ana", '{"tipo":"comecar"}', AGORA).estado).toBe(estado);
  });
});

describe("sair e cair", () => {
  it("quem sai antes da partida some da lista; o Anfitrião passa para o próximo da mesa", () => {
    const resultado = receber(comPessoas("Ana", "Bia", "Caio"), "id-Ana", '{"tipo":"sair"}', AGORA);
    expect(resultado.conexao).toBeNull();
    expect(resultado.estado!.pessoas.map((p) => p.apelido)).toEqual(["Bia", "Caio"]);
    expect(paraQuem(resultado, "id-Bia")).toMatchObject({ voce: 0, anfitriao: 0 });
    expect(paraQuem(resultado, "id-Ana")).toBeUndefined();
  });

  it("quem cai continua na lista, como desconectado, e os outros ficam sabendo", () => {
    const resultado = desconectar(comPessoas("Ana", "Bia"), "id-Bia", AGORA);
    expect(paraQuem(resultado, "id-Ana")).toMatchObject({
      pessoas: [
        { apelido: "Ana", conectada: true },
        { apelido: "Bia", conectada: false },
      ],
    });
    expect(paraQuem(resultado, "id-Bia")).toBeUndefined();
  });
});
