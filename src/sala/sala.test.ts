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

// A partida na sala (docs/spec.md, parte 9, itens 9 a 11): a sala roda o módulo
// de regras e cada pessoa recebe só o que pode ver.
describe("a partida", () => {
  const SEMENTE = 9966;

  function comecar(estado: EstadoDaSala, semente = SEMENTE): Resultado {
    return receber(estado, "id-Ana", '{"tipo":"comecar"}', AGORA, { semente });
  }

  function escolher(estado: EstadoDaSala, id: string, atributo = "sprint"): Resultado {
    return receber(estado, id, JSON.stringify({ tipo: "escolher", atributo }), AGORA);
  }

  /** Todas as mensagens que a pessoa `id` recebe neste resultado. */
  function todasPara(resultado: Resultado, id: string): MensagemDaSala[] {
    return resultado.paraPessoas.filter((envio) => envio.id === id).map((envio) => envio.mensagem);
  }

  function vistaDe(resultado: Resultado, id: string) {
    const mensagem = todasPara(resultado, id).find((m) => m.tipo === "partida");
    if (mensagem?.tipo !== "partida") throw new Error(`${id} não recebeu a partida`);
    return mensagem.vista;
  }

  /** A carta de cima de cada pessoa, direto do estado da sala (o que ninguém de fora pode ver). */
  function cartasDeCima(estado: EstadoDaSala): string[] {
    return estado.partida!.estado.pessoas.map((p) => p.monte[0]);
  }

  /** Quem escolhe agora, pelo id. */
  function quemEscolhe(estado: EstadoDaSala): string {
    return estado.partida!.pessoas[estado.partida!.estado.quemEscolhe].id;
  }

  it("ao começar, cada pessoa recebe a partida com só a própria carta de cima", () => {
    const resultado = comecar(comPessoas("Ana", "Bia"));
    const [deAna, deBia] = cartasDeCima(resultado.estado!);
    const ana = vistaDe(resultado, "id-Ana");
    expect(ana).toMatchObject({
      pessoas: [
        { apelido: "Ana", cartas: 16 },
        { apelido: "Bia", cartas: 16 },
      ],
      voce: 0,
      monteDeEmpate: 0,
      rodada: 1,
      limiteDeRodadas: 100,
      suaCarta: deAna,
      fim: null,
    });
    expect(vistaDe(resultado, "id-Bia")).toMatchObject({ voce: 1, suaCarta: deBia });
    expect(ana.quemEscolhe).toBe(vistaDe(resultado, "id-Bia").quemEscolhe);
  });

  it("joga limpo: fora do duelo, a mensagem de uma pessoa nunca tem a carta de cima da outra", () => {
    let resultado = comecar(comPessoas("Ana", "Bia"));
    for (let rodada = 0; rodada < 15; rodada++) {
      const estado = resultado.estado!;
      const [deAna, deBia] = cartasDeCima(estado);
      for (const [id, daOutra] of [["id-Ana", deBia], ["id-Bia", deAna]] as const) {
        for (const mensagem of todasPara(resultado, id)) {
          // No evento da rodada, só o duelo mostra as cartas; a partida depois dele, não.
          const foraDoDuelo = mensagem.tipo === "rodada" ? mensagem.depois : mensagem;
          expect(JSON.stringify(foraDoDuelo)).not.toContain(`"${daOutra}"`);
        }
      }
      resultado = escolher(estado, quemEscolhe(estado));
      expect(resultado.paraPessoas.length).toBeGreaterThan(0);
    }
  });

  it("quem escolhe manda o atributo e as duas pessoas recebem o duelo, com a partida depois dele", () => {
    const comecada = comecar(comPessoas("Ana", "Bia")).estado!;
    const [deAna, deBia] = cartasDeCima(comecada);
    const resultado = escolher(comecada, quemEscolhe(comecada), "montanha");
    for (const id of ["id-Ana", "id-Bia"]) {
      const [mensagem] = todasPara(resultado, id);
      expect(mensagem).toMatchObject({ tipo: "rodada", evento: { rodada: 1, atributo: "montanha" }, depois: { rodada: 2 } });
      expect(mensagem.tipo === "rodada" && mensagem.evento.mesa.map((m) => m.codigo)).toEqual([deAna, deBia]);
    }
    const [novaDeAna] = cartasDeCima(resultado.estado!);
    expect(todasPara(resultado, "id-Ana")[0]).toMatchObject({ depois: { voce: 0, suaCarta: novaDeAna } });
  });

  it("quem não escolhe não consegue escolher, nem com atributo inventado", () => {
    const comecada = comecar(comPessoas("Ana", "Bia")).estado!;
    const outra = quemEscolhe(comecada) === "id-Ana" ? "id-Bia" : "id-Ana";
    expect(escolher(comecada, outra).estado).toBe(comecada);
    expect(escolher(comecada, quemEscolhe(comecada), "velocidade").estado).toBe(comecada);
    expect(escolher(comPessoas("Ana", "Bia"), "id-Ana").paraPessoas).toEqual([]);
  });

  it("a partida vai até o fim, e o fim chega para todos", () => {
    let estado = comecar(comPessoas("Ana", "Bia")).estado!;
    let ultimo: Resultado | null = null;
    while (!estado.partida!.estado.fim) {
      ultimo = escolher(estado, quemEscolhe(estado));
      estado = ultimo.estado!;
    }
    // Com esta semente e sempre Sprint, Ana fica com todas as cartas em 20 rodadas.
    expect(todasPara(ultimo!, "id-Bia")[0]).toMatchObject({
      tipo: "rodada",
      depois: {
        pessoas: [
          { apelido: "Ana", cartas: 32 },
          { apelido: "Bia", cartas: 0 },
        ],
        suaCarta: null,
        fim: { vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 20 },
      },
    });
  });

  it("quem volta para a sala no meio da partida recebe a partida como está", () => {
    const comecada = comecar(comPessoas("Ana", "Bia")).estado!;
    const depois = escolher(comecada, quemEscolhe(comecada)).estado!;
    const caiu = desconectar(depois, "id-Bia", AGORA).estado!;
    const voltou = entrar(caiu, "id-Bia", "Bia");
    expect(todasPara(voltou, "id-Bia").map((m) => m.tipo)).toEqual(["sala", "partida"]);
    expect(vistaDe(voltou, "id-Bia")).toMatchObject({ voce: 1, rodada: 2, suaCarta: cartasDeCima(depois)[1] });
    expect(todasPara(voltou, "id-Ana").map((m) => m.tipo)).toEqual(["sala"]);
  });

  it("no fim, quem toca em Sair sai da sala", () => {
    let estado = comecar(comPessoas("Ana", "Bia")).estado!;
    expect(receber(estado, "id-Bia", '{"tipo":"sair"}', AGORA).estado).toBe(estado);
    while (!estado.partida!.estado.fim) estado = escolher(estado, quemEscolhe(estado)).estado!;
    const saiu = receber(estado, "id-Bia", '{"tipo":"sair"}', AGORA);
    expect(saiu.conexao).toBeNull();
    expect(saiu.estado!.pessoas.map((p) => p.apelido)).toEqual(["Ana"]);
  });

  it("com 4 pessoas, quem fica sem cartas sai, continua vendo as rodadas e a partida vai até o fim", () => {
    // Com esta semente e estas escolhas (índices de ATRIBUTOS), Caio sai na 8ª rodada,
    // Bia na 12ª, Duda na 16ª e Ana fica com todas as cartas na 17ª (e2e/partida-sala.spec.ts).
    const escolhas = "50200042440402244";
    const atributos = ["sprint", "explosao", "montanha", "contrarrelogio", "pave", "voltas"];
    let estado = comecar(comPessoas("Ana", "Bia", "Caio", "Duda")).estado!;
    let ultimo: Resultado | null = null;
    for (const indice of escolhas) {
      ultimo = escolher(estado, quemEscolhe(estado), atributos[Number(indice)]);
      estado = ultimo.estado!;
      if (estado.partida!.estado.rodada === 9) {
        // Caio, sem cartas, ainda recebe a rodada, sem carta própria, e todo mundo vê que ele está fora.
        expect(todasPara(ultimo, "id-Caio")[0]).toMatchObject({ tipo: "rodada", depois: { suaCarta: null } });
        expect(todasPara(ultimo, "id-Ana")[0]).toMatchObject({
          depois: { pessoas: [{ fora: null }, { fora: null }, { apelido: "Caio", cartas: 0, fora: "semCartas" }, { fora: null }] },
        });
      }
    }
    for (const id of ["id-Ana", "id-Bia", "id-Caio", "id-Duda"]) {
      expect(todasPara(ultimo!, id)[0]).toMatchObject({
        tipo: "rodada",
        depois: {
          pessoas: [
            { apelido: "Ana", cartas: 32, fora: null },
            { apelido: "Bia", cartas: 0, fora: "semCartas" },
            { apelido: "Caio", cartas: 0, fora: "semCartas" },
            { apelido: "Duda", cartas: 0, fora: "semCartas" },
          ],
          fim: { vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 17 },
        },
      });
    }
  });
});
