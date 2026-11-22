// Testes do módulo de regras pela interface pública (docs/spec.md, partes 3 e 4).
import { describe, expect, it } from "vitest";
import baralhoJson from "../dados/baralho.json";
import {
  ATRIBUTOS,
  aplicar,
  atributoDoComputador,
  criarPartida,
  escolhaDoComputador,
  type Carta,
  type Estado,
} from "./index";

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

describe("rodada", () => {
  const forte = carta("F", 50, { montanha: 90 });
  const fraca = carta("f", 50, { montanha: 30, sprint: 80 });

  it("a nota mais alta no atributo escolhido ganha", () => {
    const estado = partidaArrumada([[fraca, carta("x")], [forte, carta("y")]]);
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" });
    expect(eventos[0]).toMatchObject({ tipo: "rodada", atributo: "montanha", vencedor: 1, motivo: "nota", cartasLevadas: 2 });

    const outra = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(outra.eventos[0]).toMatchObject({ vencedor: 0 });
  });

  it("quem ganha leva as cartas da mesa para o fundo do monte", () => {
    const estado = partidaArrumada([[forte, carta("a"), carta("b")], [fraca, carta("c")]]);
    const depois = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" }).estado;
    expect(depois.pessoas[0].monte).toEqual(["a", "b", "F", "f"]);
    expect(depois.pessoas[1].monte).toEqual(["c"]);
  });

  it("quem ganha escolhe a próxima rodada", () => {
    const estado = partidaArrumada([[fraca, carta("a")], [forte, carta("b")]], 0);
    const depois = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" }).estado;
    expect(depois.quemEscolhe).toBe(1);
    expect(depois.rodada).toBe(2);
  });

  it("no empate, as cartas vão para o monte de empate e quem escolheu escolhe de novo", () => {
    const estado = partidaArrumada([[carta("A", 60), carta("B", 90)], [carta("C", 60), carta("D", 10)]], 1);
    const empate = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(empate.eventos[0]).toMatchObject({ vencedor: null, motivo: "empate", cartasLevadas: 0 });
    expect(empate.estado.monteDeEmpate).toEqual(["A", "C"]);
    expect(empate.estado.quemEscolhe).toBe(1);

    const depois = aplicar(empate.estado, { tipo: "computadorEscolhe" });
    expect(depois.eventos[0]).toMatchObject({ vencedor: 0, cartasLevadas: 4 });
    expect(depois.estado.monteDeEmpate).toEqual([]);
  });

  it("não deixa escolher quem não é a vez", () => {
    const estado = partidaArrumada([[forte], [fraca]], 1);
    expect(() => aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" })).toThrow();
  });

  it("não muda o estado recebido", () => {
    const estado = partidaArrumada([[forte, carta("a")], [fraca, carta("b")]]);
    const copia = structuredClone(estado);
    aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" });
    expect(estado).toEqual(copia);
  });
});

describe("Super Trunfo e Carta A", () => {
  const superTrunfo: Carta = { ...carta("ST", 20), superTrunfo: true };
  const cartaA: Carta = { ...carta("A1", 30), cartaA: true };

  it("o Super Trunfo ganha de qualquer carta, em qualquer atributo", () => {
    const estado = partidaArrumada([[carta("N", 99), carta("x")], [superTrunfo, carta("y")]]);
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(eventos[0]).toMatchObject({ vencedor: 1, motivo: "superTrunfo", cartasLevadas: 2 });
  });

  it("com 2 pessoas, a Carta A ganha do Super Trunfo", () => {
    const estado = partidaArrumada([[cartaA, carta("x")], [superTrunfo, carta("y")]], 1);
    const { eventos } = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(eventos[0]).toMatchObject({ vencedor: 0, motivo: "cartaA", cartasLevadas: 2 });
  });

  it("com 3 pessoas, a Carta A tira o Super Trunfo da disputa e a nota mais alta ganha", () => {
    const estado = partidaArrumada([[cartaA, carta("x")], [superTrunfo, carta("y")], [carta("N", 70), carta("z")]]);
    const { estado: depois, eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "pave" });
    expect(eventos[0]).toMatchObject({ vencedor: 2, motivo: "cartaA", cartasLevadas: 3 });
    expect(depois.pessoas[2].monte).toEqual(["z", "A1", "ST", "N"]);
  });

  it("com 4 pessoas, a Carta A pode ganhar a disputa sem o Super Trunfo", () => {
    const estado = partidaArrumada([
      [carta("N1", 10), carta("w")],
      [superTrunfo, carta("x")],
      [{ ...cartaA, notas: { ...cartaA.notas, voltas: 95 } }, carta("y")],
      [carta("N2", 60), carta("z")],
    ]);
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "voltas" });
    expect(eventos[0]).toMatchObject({ vencedor: 2, motivo: "cartaA", cartasLevadas: 4 });
  });

  it("com 3 pessoas sem Carta A na mesa, o Super Trunfo ganha", () => {
    const estado = partidaArrumada([[carta("N1", 99), carta("x")], [superTrunfo, carta("y")], [carta("N2", 98), carta("z")]]);
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(eventos[0]).toMatchObject({ vencedor: 1, motivo: "superTrunfo", cartasLevadas: 3 });
  });

  it("com 3 pessoas, se o Super Trunfo sai da disputa e as outras empatam, é empate", () => {
    const estado = partidaArrumada([[cartaA, carta("x")], [superTrunfo, carta("y")], [carta("N", 30), carta("z")]]);
    const { estado: depois, eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(eventos[0]).toMatchObject({ vencedor: null, motivo: "empate", cartasLevadas: 0 });
    expect(depois.monteDeEmpate).toEqual(["A1", "ST", "N"]);
  });

  it("com 4 pessoas e só 2 ainda na partida, vale a regra de 2: a Carta A ganha", () => {
    const inicial = partidaArrumada([[cartaA, carta("x")], [superTrunfo, carta("y")], [carta("c")], [carta("d")]]);
    const estado: Estado = {
      ...inicial,
      pessoas: inicial.pessoas.map((p, i) => (i >= 2 ? { ...p, monte: [], fora: "semCartas" } : p)),
    };
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(eventos[0]).toMatchObject({ vencedor: 0, motivo: "cartaA", cartasLevadas: 2 });
  });

  it("a Carta A sem o Super Trunfo na mesa é uma carta normal", () => {
    const estado = partidaArrumada([[cartaA, carta("x")], [carta("N", 80), carta("y")]]);
    const { eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "montanha" });
    expect(eventos[0]).toMatchObject({ vencedor: 1, motivo: "nota" });
  });
});

describe("empate e monte de empate", () => {
  it("empates seguidos acumulam no monte de empate, e quem ganha a próxima leva tudo", () => {
    const estado = partidaArrumada(
      [
        [carta("A", 50), carta("B", 40), carta("C", 90), carta("a")],
        [carta("D", 50), carta("E", 40), carta("F", 10), carta("d")],
      ],
      0,
    );
    const primeiro = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" }).estado;
    const segundo = aplicar(primeiro, { tipo: "escolher", pessoa: 0, atributo: "sprint" }).estado;
    expect(segundo.monteDeEmpate).toEqual(["A", "D", "B", "E"]);
    expect(segundo.quemEscolhe).toBe(0);

    const { estado: depois, eventos } = aplicar(segundo, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(eventos[0]).toMatchObject({ vencedor: 0, motivo: "nota", cartasLevadas: 6 });
    expect(depois.pessoas[0].monte).toEqual(["a", "C", "F", "A", "D", "B", "E"]);
    expect(depois.monteDeEmpate).toEqual([]);
  });

  it("se a última carta de quem escolhia foi para o monte de empate, essa pessoa sai e a próxima da Ordem da mesa escolhe", () => {
    const estado = partidaArrumada(
      [[carta("a", 10), carta("b")], [carta("X", 60)], [carta("c", 60), carta("d")]],
      1,
    );
    const { estado: depois, eventos } = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(eventos[0]).toMatchObject({ vencedor: null, motivo: "empate" });
    expect(eventos).toContainEqual({ tipo: "saiu", pessoa: 1, motivo: "semCartas" });
    expect(depois.pessoas[1].fora).toBe("semCartas");
    expect(depois.quemEscolhe).toBe(2);
    expect(depois.fim).toBeNull();
  });

  it("a Ordem da mesa dá a volta: depois da última pessoa, escolhe a primeira", () => {
    const estado = partidaArrumada([[carta("a", 60), carta("b")], [carta("c", 10), carta("d")], [carta("X", 60)]], 2);
    const { estado: depois } = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(depois.pessoas[2].fora).toBe("semCartas");
    expect(depois.quemEscolhe).toBe(0);
  });

  it("com 2 pessoas, se quem escolhia sai no empate, a outra ganha a partida", () => {
    const estado = partidaArrumada([[carta("X", 60)], [carta("c", 60), carta("d")]], 0);
    const { estado: depois } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(depois.fim).toMatchObject({ vencedor: 1, motivo: "todasAsCartas" });
  });

  it("se todo mundo fica sem cartas num empate, a partida termina empatada", () => {
    const estado = partidaArrumada([[carta("X", 60)], [carta("Y", 60)]], 0);
    const { estado: depois } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "sprint" });
    expect(depois.fim).toEqual({ vencedor: null, motivo: "semCartas", rodadasJogadas: 1 });
  });
});

describe("fim da partida", () => {
  it("acaba quando uma pessoa tem todas as cartas", () => {
    const estado = partidaArrumada([[carta("A", 90), carta("B", 10)], [carta("C", 20)]]);
    const { estado: depois, eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "voltas" });
    expect(depois.fim).toEqual({ vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 1 });
    expect(eventos).toContainEqual({ tipo: "saiu", pessoa: 1, motivo: "semCartas" });
    expect(eventos.at(-1)).toEqual({ tipo: "fim", vencedor: 0, motivo: "todasAsCartas", rodadasJogadas: 1 });
    expect(() => aplicar(depois, { tipo: "escolher", pessoa: 0, atributo: "voltas" })).toThrow();
  });

  it("na rodada 100 acaba e ganha quem tem mais cartas", () => {
    const estado = partidaArrumada(
      [
        [carta("A", 10), carta("B")],
        [carta("C", 90), carta("D"), carta("E"), carta("G")],
      ],
      0,
      100,
    );
    const { estado: depois } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "pave" });
    expect(depois.fim).toEqual({ vencedor: 1, motivo: "limiteDeRodadas", rodadasJogadas: 100 });
  });

  it("na rodada 100, com o mesmo número de cartas, a partida termina empatada", () => {
    const estado = partidaArrumada([[carta("A", 10), carta("B"), carta("G")], [carta("C", 90)]], 0, 100);
    const { estado: depois, eventos } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "pave" });
    expect(depois.fim).toEqual({ vencedor: null, motivo: "limiteDeRodadas", rodadasJogadas: 100 });
    expect(eventos.at(-1)).toEqual({ tipo: "fim", vencedor: null, motivo: "limiteDeRodadas", rodadasJogadas: 100 });
  });

  it("no fim, as cartas do monte de empate não contam para ninguém", () => {
    // Na rodada 100 há empate: 2 cartas vão para o meio. Contando o meio, ninguém
    // empataria; sem ele, as duas pessoas ficam com 1 carta: empate.
    const estado = partidaArrumada([[carta("A", 50), carta("B")], [carta("C", 50), carta("D")]], 0, 100);
    const { estado: depois } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "pave" });
    expect(depois.monteDeEmpate).toEqual(["A", "C"]);
    expect(depois.fim).toEqual({ vencedor: null, motivo: "limiteDeRodadas", rodadasJogadas: 100 });

    const outro = partidaArrumada(
      [[carta("A", 50), carta("B")], [carta("C", 50), carta("D"), carta("E")]],
      0,
      100,
    );
    expect(aplicar(outro, { tipo: "escolher", pessoa: 0, atributo: "pave" }).estado.fim).toMatchObject({ vencedor: 1 });
  });

  it("antes da rodada 100 a partida continua", () => {
    const estado = partidaArrumada([[carta("A", 10), carta("B")], [carta("C", 90), carta("D")]], 0, 99);
    const { estado: depois } = aplicar(estado, { tipo: "escolher", pessoa: 0, atributo: "pave" });
    expect(depois.fim).toBeNull();
    expect(depois.rodada).toBe(100);
  });

  it("quem sai no meio perde; com 2 pessoas, quem fica ganha", () => {
    const { estado, eventos } = aplicar(partidaSolo(), { tipo: "sair", pessoa: 0 });
    expect(estado.fim).toEqual({ vencedor: 1, motivo: "saida", rodadasJogadas: 0 });
    expect(eventos[0]).toEqual({ tipo: "saiu", pessoa: 0, motivo: "saiu" });
  });
});

describe("estado em JSON", () => {
  it("vira JSON e volta igual, e a partida segue igual dos dois lados", () => {
    const estado = jogar(partidaSolo(7), 10);
    const volta: Estado = JSON.parse(JSON.stringify(estado));
    expect(volta).toEqual(estado);
    expect(jogar(volta, 20)).toEqual(jogar(estado, 20));
  });
});

describe("Computador", () => {
  it("escolhe na vez dele, e a tela sabe antes o que ele vai escolher", () => {
    const estado = { ...partidaSolo(), quemEscolhe: 1 };
    const previsto = atributoDoComputador(estado);
    const { eventos } = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(eventos[0]).toMatchObject({ tipo: "rodada", quemEscolheu: 1, atributo: previsto });
  });

  it("não escolhe fora da vez dele", () => {
    const estado = { ...partidaSolo(), quemEscolhe: 0 };
    expect(() => aplicar(estado, { tipo: "computadorEscolhe" })).toThrow();
    expect(atributoDoComputador(estado)).toBeNull();
  });

  it("Fácil: recebe só a própria carta, o nível e o sorteio, e sorteia o atributo", () => {
    const cartaDele = carta("X", 50, { sprint: 99 });
    const escolhas = new Set<string>();
    let sorteio = 1;
    for (let i = 0; i < 60; i++) {
      const r = escolhaDoComputador(cartaDele, "facil", sorteio);
      escolhas.add(r.atributo);
      sorteio = r.sorteio;
    }
    expect(escolhas).toEqual(new Set(ATRIBUTOS));
    expect(escolhaDoComputador(cartaDele, "facil", 42)).toEqual(escolhaDoComputador(cartaDele, "facil", 42));
  });
});

// Joga `n` rodadas: a pessoa escolhe sempre o primeiro atributo.
function jogar(estado: Estado, n: number): Estado {
  for (let i = 0; i < n && !estado.fim; i++) {
    const acao =
      estado.pessoas[estado.quemEscolhe].tipo === "computador"
        ? ({ tipo: "computadorEscolhe" } as const)
        : ({ tipo: "escolher", pessoa: estado.quemEscolhe, atributo: ATRIBUTOS[0] } as const);
    estado = aplicar(estado, acao).estado;
  }
  return estado;
}
