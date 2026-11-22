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
      const r = escolhaDoComputador(cartaDele, "facil", sorteio, baralho);
      escolhas.add(r.atributo);
      sorteio = r.sorteio;
    }
    expect(escolhas).toEqual(new Set(ATRIBUTOS));
    expect(escolhaDoComputador(cartaDele, "facil", 42, baralho)).toEqual(
      escolhaDoComputador(cartaDele, "facil", 42, baralho),
    );
  });

  // Baralho de teste: a carta do Computador (C) e as outras.
  // Montanha 80 ganha de 3 cartas; Sprint 60 ganha de 2; os outros 50 ganham de 1 (de D).
  const C = carta("C", 50, { sprint: 60, montanha: 80 });
  const outras = [carta("D", 10), carta("E", 55, { montanha: 70 }), carta("F", 55, { sprint: 70, montanha: 79 })];

  it("Normal: escolhe o atributo em que a carta ganha de mais cartas do baralho", () => {
    const r = escolhaDoComputador(C, "normal", 7, [C, ...outras]);
    expect(r.atributo).toBe("montanha");
  });

  it("Normal: nota igual não conta como ganhar", () => {
    // Sprint 90 ganha de 2 cartas; Voltas 50 empata com as duas (não ganha de nenhuma).
    const X = carta("X", 50, { sprint: 90 });
    const baralhoX = [X, carta("Y", 50, { sprint: 89 }), carta("Z", 50, { sprint: 10 })];
    for (const sorteio of [1, 2, 3, 42]) expect(escolhaDoComputador(X, "normal", sorteio, baralhoX).atributo).toBe("sprint");
  });

  it("Normal: empate entre atributos é sorteado, só entre os empatados, e o sorteio fixo repete", () => {
    // Sprint e Pavê ganham das 2 outras cartas; os outros atributos, de nenhuma.
    const X = carta("X", 10, { sprint: 90, pave: 90 });
    const baralhoX = [X, carta("Y", 50), carta("Z", 50)];
    const escolhas = new Set<string>();
    let sorteio = 1;
    for (let i = 0; i < 40; i++) {
      const r = escolhaDoComputador(X, "normal", sorteio, baralhoX);
      escolhas.add(r.atributo);
      expect(r.sorteio).not.toBe(sorteio);
      sorteio = r.sorteio;
    }
    expect(escolhas).toEqual(new Set(["sprint", "pave"]));
    expect(escolhaDoComputador(X, "normal", 42, baralhoX)).toEqual(escolhaDoComputador(X, "normal", 42, baralhoX));
  });

  it("Normal: com o baralho de verdade, escolhe o melhor atributo da carta", () => {
    // Para cada carta, a escolha ganha de pelo menos tantas cartas quanto qualquer outro atributo.
    const ganhaDe = (c: Carta, a: (typeof ATRIBUTOS)[number]) =>
      baralho.filter((o) => o.codigo !== c.codigo && c.notas[a] > o.notas[a]).length;
    for (const c of baralho) {
      const { atributo } = escolhaDoComputador(c, "normal", 3, baralho);
      expect(ganhaDe(c, atributo)).toBe(Math.max(...ATRIBUTOS.map((a) => ganhaDe(c, a))));
    }
  });

  it("Normal: na partida, o Computador escolhe pelo nível da partida", () => {
    const C2 = carta("C", 50, { montanha: 99 });
    const estado = { ...partidaArrumada([[carta("H", 60, { montanha: 98 })], [C2]], 1), nivel: "normal" as const };
    expect(atributoDoComputador(estado)).toBe("montanha");
    const { eventos } = aplicar(estado, { tipo: "computadorEscolhe" });
    expect(eventos[0]).toMatchObject({ tipo: "rodada", atributo: "montanha" });
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
