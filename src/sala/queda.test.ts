// Queda de rede, saída no meio e De fora (docs/spec.md, parte 9, itens 14 a 19).
// O tempo passa pelo `alarme`: o Durable Object agenda `proximoAlarme` e chama
// `alarme(estado, agora)` quando ele toca.
import { describe, expect, it } from "vitest";
import type { MensagemDaSala } from "./protocolo";
import { alarme, desconectar, proximoAlarme, receber, reservar, TEMPOS_DA_SALA, type EstadoDaSala, type Resultado } from "./sala";

const AGORA = 1_000_000;
const SEGUNDO = 1000;
const SEMENTE = 9966;

function comPessoas(...apelidos: string[]): EstadoDaSala {
  let estado = reservar(null, "ABC", AGORA)!;
  for (const apelido of apelidos) {
    estado = receber(estado, null, JSON.stringify({ tipo: "entrar", id: `id-${apelido}`, apelido }), AGORA).estado!;
  }
  return estado;
}

/** Ana (a Anfitriã) começa a partida com estas pessoas. */
function emPartida(...apelidos: string[]): EstadoDaSala {
  return receber(comPessoas(...apelidos), "id-Ana", '{"tipo":"comecar"}', AGORA, { semente: SEMENTE }).estado!;
}

function mandar(estado: EstadoDaSala, id: string, mensagem: object, agora = AGORA): Resultado {
  return receber(estado, id, JSON.stringify(mensagem), agora);
}

function entrar(estado: EstadoDaSala, apelido: string, agora = AGORA): Resultado {
  return receber(estado, null, JSON.stringify({ tipo: "entrar", id: `id-${apelido}`, apelido }), agora);
}

function todasPara(resultado: Resultado, id: string): MensagemDaSala[] {
  return resultado.paraPessoas.filter((envio) => envio.id === id).map((envio) => envio.mensagem);
}

function salaPara(resultado: Resultado, id: string) {
  const mensagem = todasPara(resultado, id).find((m) => m.tipo === "sala");
  if (mensagem?.tipo !== "sala") throw new Error(`${id} não recebeu a sala`);
  return mensagem;
}

function vistaPara(resultado: Resultado, id: string) {
  const mensagem = todasPara(resultado, id).find((m) => m.tipo === "partida");
  if (mensagem?.tipo !== "partida") throw new Error(`${id} não recebeu a partida`);
  return mensagem.vista;
}

/** O número público da pessoa na sala (o que o "Tirar" manda). */
function numeroDe(estado: EstadoDaSala, id: string): number {
  return estado.pessoas.find((p) => p.id === id)!.numero;
}

function quemEscolhe(estado: EstadoDaSala): string {
  return estado.partida!.pessoas[estado.partida!.estado.quemEscolhe].id;
}

function escolher(estado: EstadoDaSala, agora = AGORA): Resultado {
  return mandar(estado, quemEscolhe(estado), { tipo: "escolher", atributo: "sprint" }, agora);
}

/** Quem escolhe chegou na vez na tela: a sala começa a contar o tempo de cutucar. */
function naVez(estado: EstadoDaSala, agora = AGORA): EstadoDaSala {
  return mandar(estado, quemEscolhe(estado), { tipo: "naVez", rodada: estado.partida!.estado.rodada }, agora).estado!;
}

/** O alarme toca quando acaba o tempo de queda de quem caiu em AGORA. */
function depoisDaQueda(estado: EstadoDaSala): Resultado {
  return alarme(estado, AGORA + 60 * SEGUNDO);
}

/** Toca o alarme na hora em que ele foi agendado. */
function tocarAlarme(estado: EstadoDaSala): Resultado {
  const quando = proximoAlarme(estado);
  if (quando === null) throw new Error("nenhum alarme agendado");
  return alarme(estado, quando);
}

describe("queda de rede", () => {
  it("quem cai no meio da partida para a partida: os outros sabem e ninguém escolhe", () => {
    const partida = emPartida("Ana", "Bia", "Caio");
    const caiu = desconectar(partida, "id-Bia", AGORA);
    expect(salaPara(caiu, "id-Ana")).toMatchObject({ semRede: [1] });
    const estado = caiu.estado!;
    expect(escolher(estado).estado).toBe(estado);
  });

  it("volta em até 60 s com as mesmas cartas, e a partida segue", () => {
    const partida = emPartida("Ana", "Bia");
    const cartas = partida.partida!.estado.pessoas[1].monte;
    const caiu = desconectar(partida, "id-Bia", AGORA).estado!;
    const voltou = entrar(caiu, "Bia", AGORA + 59 * SEGUNDO);
    expect(salaPara(voltou, "id-Ana")).toMatchObject({ semRede: [] });
    expect(voltou.estado!.partida!.estado.pessoas[1].monte).toEqual(cartas);
    expect(vistaPara(voltou, "id-Bia")).toMatchObject({ suaCarta: cartas[0] });
    expect(escolher(voltou.estado!).estado!.partida!.estado.rodada).toBe(2);
  });

  it("depois de 60 s, a pessoa sai da partida (as cartas saem do jogo) e o jogo continua", () => {
    const partida = emPartida("Ana", "Bia", "Caio");
    const caiu = desconectar(partida, "id-Bia", AGORA).estado!;
    const tocou = depoisDaQueda(caiu);
    const estado = tocou.estado!;
    expect(estado.partida!.estado.pessoas[1]).toMatchObject({ monte: [], fora: "saiu" });
    expect(estado.partida!.estado.fim).toBeNull();
    expect(salaPara(tocou, "id-Ana")).toMatchObject({ semRede: [] });
    expect(vistaPara(tocou, "id-Caio").pessoas[1]).toMatchObject({ cartas: 0, fora: "saiu" });
    expect(escolher(estado).estado!.partida!.estado.rodada).toBe(2);
  });

  it("com 2 pessoas, quem fica ganha quando a outra não volta", () => {
    const caiu = desconectar(emPartida("Ana", "Bia"), "id-Bia", AGORA).estado!;
    const tocou = depoisDaQueda(caiu);
    expect(tocou.estado!.partida!.estado.fim).toMatchObject({ vencedor: 0, motivo: "saida" });
    expect(vistaPara(tocou, "id-Ana").fim).toMatchObject({ vencedor: 0 });
  });

  it("quem volta depois de 60 s está De fora: sem carta própria, vendo a partida", () => {
    const caiu = desconectar(emPartida("Ana", "Bia", "Caio"), "id-Bia", AGORA).estado!;
    const saiu = depoisDaQueda(caiu).estado!;
    const voltou = entrar(saiu, "Bia", AGORA + 70 * SEGUNDO);
    expect(vistaPara(voltou, "id-Bia")).toMatchObject({ voce: 1, suaCarta: null });
    expect(vistaPara(voltou, "id-Bia").pessoas[1].fora).toBe("saiu");
    const rodada = escolher(voltou.estado!);
    expect(todasPara(rodada, "id-Bia")[0]).toMatchObject({ tipo: "rodada", depois: { voce: 1, suaCarta: null } });
  });

  it("o Anfitrião tira quem caiu antes dos 60 s; mais ninguém tira", () => {
    const caiu = desconectar(emPartida("Ana", "Bia", "Caio"), "id-Bia", AGORA).estado!;
    expect(mandar(caiu, "id-Caio", { tipo: "tirar", numero: numeroDe(caiu, "id-Bia") }).estado).toBe(caiu);
    expect(mandar(caiu, "id-Ana", { tipo: "tirar", numero: numeroDe(caiu, "id-Caio") }).estado).toBe(caiu);
    const tirou = mandar(caiu, "id-Ana", { tipo: "tirar", numero: numeroDe(caiu, "id-Bia") }, AGORA + 5 * SEGUNDO);
    expect(tirou.estado!.partida!.estado.pessoas[1].fora).toBe("saiu");
    expect(salaPara(tirou, "id-Caio")).toMatchObject({ semRede: [] });
    expect(proximoAlarme(tirou.estado!)).not.toBe(AGORA + 60 * SEGUNDO);
  });

  it("Tirar aponta a pessoa pelo número dela: se a lista muda no caminho, não tira outra pessoa", () => {
    const deFora = mandar(emPartida("Ana", "Bia", "Caio", "Davi"), "id-Bia", { tipo: "sair" }).estado!;
    const caidos = desconectar(desconectar(deFora, "id-Caio", AGORA).estado!, "id-Davi", AGORA).estado!;
    // Ana vê Caio em 3º na lista; antes do "Tirar" chegar, Bia vai embora e Davi passa a ser o 3º.
    const caio = salaPara(desconectar(deFora, "id-Caio", AGORA), "id-Ana").pessoas[2];
    const biaFoi = mandar(caidos, "id-Bia", { tipo: "sair" }).estado!;
    const tirou = mandar(biaFoi, "id-Ana", { tipo: "tirar", numero: caio.numero });
    const naPartida = tirou.estado!.partida!.estado.pessoas;
    expect(naPartida[2].fora).toBe("saiu");
    expect(naPartida[3].fora).toBeNull();
  });

  it("os tempos vêm de fora (o build do teste encurta)", () => {
    const caiu = desconectar(emPartida("Ana", "Bia"), "id-Bia", AGORA).estado!;
    // Cutucar mais tarde que a queda, para o primeiro alarme ser o da queda.
    const tempos = { ...TEMPOS_DA_SALA, queda: 5 * SEGUNDO };
    expect(proximoAlarme(caiu, tempos)).toBe(AGORA + 5 * SEGUNDO);
    expect(alarme(caiu, AGORA + 5 * SEGUNDO, tempos).estado!.partida!.estado.fim).not.toBeNull();
    expect(alarme(caiu, AGORA + 4 * SEGUNDO, tempos).estado).toBe(caiu);
  });
});

describe("Anfitrião cai ou sai", () => {
  it("o Anfitrião que cai passa o papel na hora para a próxima pessoa conectada, que já pode Tirar", () => {
    const caiu = desconectar(emPartida("Ana", "Bia", "Caio"), "id-Ana", AGORA);
    expect(caiu.estado!.anfitriao).toBe("id-Bia");
    expect(salaPara(caiu, "id-Bia")).toMatchObject({ voce: 1, anfitriao: 1 });
    const tirou = mandar(caiu.estado!, "id-Bia", { tipo: "tirar", numero: numeroDe(caiu.estado!, "id-Ana") });
    expect(tirou.estado!.partida!.estado.pessoas[0].fora).toBe("saiu");
  });

  it("o papel pula quem também está sem rede", () => {
    const biaCaiu = desconectar(emPartida("Ana", "Bia", "Caio"), "id-Bia", AGORA).estado!;
    expect(desconectar(biaCaiu, "id-Ana", AGORA).estado!.anfitriao).toBe("id-Caio");
  });

  it("sem mais ninguém conectado, o papel fica com quem caiu", () => {
    const biaCaiu = desconectar(emPartida("Ana", "Bia"), "id-Bia", AGORA).estado!;
    expect(desconectar(biaCaiu, "id-Ana", AGORA).estado!.anfitriao).toBe("id-Ana");
  });

  it("o Anfitrião que não volta em 60 s passa o papel para a próxima pessoa da Ordem da mesa", () => {
    const caiu = desconectar(emPartida("Ana", "Bia", "Caio"), "id-Ana", AGORA).estado!;
    const tocou = depoisDaQueda(caiu);
    expect(tocou.estado!.anfitriao).toBe("id-Bia");
    expect(salaPara(tocou, "id-Bia")).toMatchObject({ voce: 1, anfitriao: 1 });
  });

  it("o Anfitrião sai pelo menu: fica De fora e o papel passa para a próxima pessoa", () => {
    const saiu = mandar(emPartida("Ana", "Bia", "Caio"), "id-Ana", { tipo: "sair" });
    expect(saiu.estado!.anfitriao).toBe("id-Bia");
    expect(saiu.estado!.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio"]);
    expect(saiu.conexao).toBe("id-Ana");
    expect(vistaPara(saiu, "id-Ana")).toMatchObject({ suaCarta: null });
    expect(salaPara(saiu, "id-Ana")).toMatchObject({ anfitriao: 1 });
  });

  it("o papel pula quem já está fora da partida", () => {
    const biaSaiu = mandar(emPartida("Ana", "Bia", "Caio", "Davi"), "id-Bia", { tipo: "sair" }).estado!;
    expect(mandar(biaSaiu, "id-Ana", { tipo: "sair" }).estado!.anfitriao).toBe("id-Caio");
  });
});

describe("saída no meio", () => {
  it("as cartas de quem sai saem do jogo; com 2 pessoas, quem fica ganha", () => {
    const saiu = mandar(emPartida("Ana", "Bia"), "id-Bia", { tipo: "sair" });
    const { estado } = saiu.estado!.partida!;
    expect(estado.pessoas[1].monte).toEqual([]);
    expect(estado.fim).toMatchObject({ vencedor: 0, motivo: "saida" });
    expect(vistaPara(saiu, "id-Ana")).toMatchObject({ fim: { vencedor: 0 } });
  });

  it("se quem escolhe sai, a próxima pessoa da partida escolhe", () => {
    const partida = emPartida("Ana", "Bia", "Caio");
    const saiu = mandar(partida, quemEscolhe(partida), { tipo: "sair" }).estado!;
    expect(quemEscolhe(saiu)).not.toBe(quemEscolhe(partida));
    expect(escolher(saiu).estado!.partida!.estado.rodada).toBe(2);
  });

  it("De fora, Sair de novo tira a pessoa da sala", () => {
    const deFora = mandar(emPartida("Ana", "Bia", "Caio"), "id-Bia", { tipo: "sair" }).estado!;
    const foiEmbora = mandar(deFora, "id-Bia", { tipo: "sair" });
    expect(foiEmbora.conexao).toBeNull();
    expect(foiEmbora.estado!.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Caio"]);
    expect(escolher(foiEmbora.estado!).estado!.partida!.estado.rodada).toBe(2);
  });

  it("quem saiu e cai depois não para a partida", () => {
    const deFora = mandar(emPartida("Ana", "Bia", "Caio"), "id-Bia", { tipo: "sair" }).estado!;
    const caiu = desconectar(deFora, "id-Bia", AGORA);
    expect(salaPara(caiu, "id-Ana")).toMatchObject({ semRede: [] });
    expect(escolher(caiu.estado!).estado!.partida!.estado.rodada).toBe(2);
  });
});

describe("cutucar", () => {
  it("depois de 30 s sem escolha, os outros podem cutucar; quem escolhe recebe a cutucada", () => {
    const partida = naVez(emPartida("Ana", "Bia"));
    const vez = quemEscolhe(partida);
    const outra = vez === "id-Ana" ? "id-Bia" : "id-Ana";
    expect(proximoAlarme(partida)).toBe(AGORA + 30 * SEGUNDO);
    expect(mandar(partida, outra, { tipo: "cutucar" }).paraPessoas).toEqual([]);

    const tocou = tocarAlarme(partida);
    expect(salaPara(tocou, outra)).toMatchObject({ podeCutucar: true });
    expect(salaPara(tocou, vez)).toMatchObject({ podeCutucar: false });
    expect(proximoAlarme(tocou.estado!)).toBeNull();

    const cutucou = mandar(tocou.estado!, outra, { tipo: "cutucar" });
    expect(cutucou.paraPessoas).toEqual([{ id: vez, mensagem: { tipo: "cutucada" } }]);
    expect(mandar(tocou.estado!, vez, { tipo: "cutucar" }).paraPessoas).toEqual([]);
  });

  it("os 30 s contam de quando quem escolhe chega na vez (depois do próprio Próxima rodada), não da escolha anterior", () => {
    const partida = emPartida("Ana", "Bia");
    expect(proximoAlarme(partida)).toBeNull();
    expect(proximoAlarme(naVez(partida, AGORA + 10 * SEGUNDO))).toBe(AGORA + 40 * SEGUNDO);
  });

  it("só quem escolhe marca a vez, e só na rodada em jogo; marcar de novo não reinicia a conta", () => {
    const partida = emPartida("Ana", "Bia");
    const vez = quemEscolhe(partida);
    const outra = vez === "id-Ana" ? "id-Bia" : "id-Ana";
    expect(mandar(partida, outra, { tipo: "naVez", rodada: 1 }).estado).toBe(partida);
    expect(mandar(partida, vez, { tipo: "naVez", rodada: 2 }).estado).toBe(partida);
    const marcada = naVez(partida);
    expect(proximoAlarme(naVez(marcada, AGORA + 20 * SEGUNDO))).toBe(AGORA + 30 * SEGUNDO);
  });

  it("a rodada nova zera a espera de 30 s", () => {
    const cutucavel = tocarAlarme(naVez(emPartida("Ana", "Bia"))).estado!;
    const depois = escolher(cutucavel, AGORA + 40 * SEGUNDO);
    expect(salaPara(depois, "id-Ana")).toMatchObject({ podeCutucar: false });
    expect(proximoAlarme(depois.estado!)).toBeNull();
    expect(proximoAlarme(naVez(depois.estado!, AGORA + 50 * SEGUNDO))).toBe(AGORA + 80 * SEGUNDO);
  });

  it("com a partida parada (alguém caiu), ninguém cutuca", () => {
    const cutucavel = tocarAlarme(naVez(emPartida("Ana", "Bia", "Caio"))).estado!;
    const [caiu, olha] = ["id-Ana", "id-Bia", "id-Caio"].filter((id) => id !== quemEscolhe(cutucavel));
    const parada = desconectar(cutucavel, caiu, AGORA);
    expect(salaPara(parada, olha)).toMatchObject({ podeCutucar: false });
    expect(mandar(parada.estado!, olha, { tipo: "cutucar" }).paraPessoas).toEqual([]);
  });
});

describe("fora da partida, sem relógio", () => {
  it("antes de começar não há alarme de cutucar", () => {
    expect(proximoAlarme(comPessoas("Ana", "Bia"))).toBeNull();
  });

  it("o Anfitrião que cai antes da partida e não volta em 60 s passa o papel", () => {
    const caiu = desconectar(comPessoas("Ana", "Bia"), "id-Ana", AGORA).estado!;
    expect(depoisDaQueda(caiu).estado!.anfitriao).toBe("id-Bia");
  });
});
