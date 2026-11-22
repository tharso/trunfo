// Vida da sala (docs/spec.md, parte 9, itens 21 a 25): "Jogar de novo", gente
// nova entre partidas e a sala que fecha 10 min depois que a última pessoa sai.
import { describe, expect, it } from "vitest";
import type { MensagemDaSala } from "./protocolo";
import { alarme, desconectar, proximoAlarme, receber, reservar, type EstadoDaSala, type Resultado } from "./sala";

const AGORA = 1_000_000;
const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const SEMENTE = 9966;

function mandar(estado: EstadoDaSala, id: string, mensagem: object, agora = AGORA): Resultado {
  return receber(estado, id, JSON.stringify(mensagem), agora, { semente: SEMENTE });
}

function entrar(estado: EstadoDaSala | null, apelido: string, agora = AGORA): Resultado {
  return receber(estado, null, JSON.stringify({ tipo: "entrar", id: `id-${apelido}`, apelido }), agora);
}

function comPessoas(...apelidos: string[]): EstadoDaSala {
  let estado = reservar(null, "ABC", AGORA)!;
  for (const apelido of apelidos) estado = entrar(estado, apelido).estado!;
  return estado;
}

/** Ana (a Anfitriã) começa; as outras pessoas saem da partida até sobrar Ana, que ganha. */
function partidaQueAcabou(...apelidos: string[]): EstadoDaSala {
  let estado = mandar(comPessoas(...apelidos), "id-Ana", { tipo: "comecar" }).estado!;
  for (const apelido of apelidos.slice(1)) estado = mandar(estado, `id-${apelido}`, { tipo: "sair" }).estado!;
  expect(estado.partida!.estado.fim).toMatchObject({ vencedor: 0 });
  return estado;
}

function salaPara(resultado: Resultado, id: string) {
  const mensagem = resultado.paraPessoas.map((e) => (e.id === id ? e.mensagem : null)).find((m) => m?.tipo === "sala");
  if (mensagem?.tipo !== "sala") throw new Error(`${id} não recebeu a sala`);
  return mensagem;
}

function vistaPara(resultado: Resultado, id: string) {
  const mensagem = resultado.paraPessoas.find((e) => e.id === id && e.mensagem.tipo === "partida")?.mensagem as
    | Extract<MensagemDaSala, { tipo: "partida" }>
    | undefined;
  if (!mensagem) throw new Error(`${id} não recebeu a partida`);
  return mensagem.vista;
}

describe("Jogar de novo", () => {
  it("o Anfitrião começa uma nova partida na mesma sala, com quem estava De fora", () => {
    const acabou = partidaQueAcabou("Ana", "Bia", "Caio");
    const denovo = mandar(acabou, "id-Ana", { tipo: "comecar" });
    const partida = denovo.estado!.partida!;
    expect(partida.estado.fim).toBeNull();
    expect(partida.estado.rodada).toBe(1);
    expect(partida.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio"]);
    expect(partida.estado.pessoas.every((p) => p.monte.length > 0 && p.fora === null)).toBe(true);
    expect(vistaPara(denovo, "id-Bia")).toMatchObject({ voce: 1, rodada: 1, fim: null });
    expect(salaPara(denovo, "id-Caio")).toMatchObject({ emPartida: true });
  });

  it("no fim, a sala diz que não há partida em jogo; só o Anfitrião joga de novo", () => {
    const comecada = mandar(comPessoas("Ana", "Bia"), "id-Ana", { tipo: "comecar" }).estado!;
    const fim = mandar(comecada, "id-Bia", { tipo: "sair" });
    expect(salaPara(fim, "id-Ana")).toMatchObject({ emPartida: false });
    expect(mandar(fim.estado!, "id-Bia", { tipo: "comecar" }).estado).toBe(fim.estado);
  });
});

describe("gente nova entre partidas", () => {
  it("entra no fim da Ordem da mesa e joga a próxima partida", () => {
    const acabou = partidaQueAcabou("Ana", "Bia");
    const caio = entrar(acabou, "Caio", AGORA + SEGUNDO);
    expect(caio.resposta).toBeUndefined();
    expect(salaPara(caio, "id-Caio")).toMatchObject({ voce: 2, anfitriao: 0, emPartida: false });
    expect(salaPara(caio, "id-Ana").pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio"]);
    const denovo = mandar(caio.estado!, "id-Ana", { tipo: "comecar" });
    expect(vistaPara(denovo, "id-Caio")).toMatchObject({ voce: 2, rodada: 1 });
  });

  it("não entra se a sala já tem 4 pessoas", () => {
    const acabou = partidaQueAcabou("Ana", "Bia", "Caio", "Duda");
    expect(entrar(acabou, "Eva").resposta).toEqual({ tipo: "recusada", motivo: "cheia" });
  });
});

describe("a sala fecha", () => {
  it("10 min depois que a última pessoa sai, a sala deixa de existir e o link mostra que acabou", () => {
    const vazia = receber(comPessoas("Ana"), "id-Ana", '{"tipo":"sair"}', AGORA).estado!;
    expect(proximoAlarme(vazia)).toBe(AGORA + 10 * MINUTO);
    expect(alarme(vazia, AGORA + 9 * MINUTO).estado).toBe(vazia);
    const fechou = alarme(vazia, AGORA + 10 * MINUTO);
    expect(fechou.estado).toBeNull();
    expect(entrar(fechou.estado, "Bia").resposta).toEqual({ tipo: "recusada", motivo: "acabou" });
    expect(reservar(fechou.estado, "ABC", AGORA + 10 * MINUTO)).not.toBeNull();
  });

  it("quem cai também conta como saída: sem ninguém conectado, a sala fecha", () => {
    const anaCaiu = desconectar(partidaQueAcabou("Ana", "Bia"), "id-Ana", AGORA).estado!;
    expect(proximoAlarme(anaCaiu)).toBe(AGORA + MINUTO);
    const todasCairam = desconectar(anaCaiu, "id-Bia", AGORA).estado!;
    expect(alarme(todasCairam, AGORA + 10 * MINUTO).estado).toBeNull();
  });

  it("com alguém na sala, não fecha", () => {
    const sala = comPessoas("Ana", "Bia");
    expect(proximoAlarme(sala)).toBeNull();
    expect(alarme(sala, AGORA + 60 * MINUTO).estado).toBe(sala);
  });

  it("o tempo vem de fora (o build do teste encurta)", () => {
    const vazia = reservar(null, "ABC", AGORA)!;
    const tempos = { queda: MINUTO, cutucar: 30 * SEGUNDO, vazia: 5 * SEGUNDO };
    expect(proximoAlarme(vazia, tempos)).toBe(AGORA + 5 * SEGUNDO);
    expect(alarme(vazia, AGORA + 5 * SEGUNDO, tempos).estado).toBeNull();
  });
});

describe("quem foi embora", () => {
  it("quem cai entre partidas e não volta no tempo de queda sai da sala", () => {
    const acabou = partidaQueAcabou("Ana", "Bia", "Caio");
    const caiu = desconectar(acabou, "id-Bia", AGORA).estado!;
    const tocou = alarme(caiu, AGORA + MINUTO);
    expect(salaPara(tocou, "id-Ana").pessoas.map((p) => p.apelido)).toEqual(["Ana", "Caio"]);
    const denovo = mandar(tocou.estado!, "id-Ana", { tipo: "comecar" }).estado!;
    expect(denovo.partida!.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Caio"]);
  });

  it("quem caiu no meio da partida e não voltou fica fora da próxima, e a vaga abre", () => {
    const comecada = mandar(comPessoas("Ana", "Bia", "Caio", "Duda"), "id-Ana", { tipo: "comecar" }).estado!;
    let acabou = alarme(desconectar(comecada, "id-Duda", AGORA).estado!, AGORA + MINUTO).estado!;
    for (const id of ["id-Bia", "id-Caio"]) acabou = mandar(acabou, id, { tipo: "sair" }).estado!;
    expect(acabou.partida!.estado.fim).not.toBeNull();
    const eva = entrar(acabou, "Eva", AGORA + 2 * MINUTO);
    expect(salaPara(eva, "id-Eva").pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio", "Eva"]);
    const denovo = mandar(eva.estado!, "id-Ana", { tipo: "comecar" }).estado!;
    expect(denovo.partida!.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio", "Eva"]);
  });

  it("quem caiu há pouco (ainda no tempo de queda) continua e entra na próxima", () => {
    const acabou = partidaQueAcabou("Ana", "Bia", "Caio");
    const caiu = desconectar(acabou, "id-Bia", AGORA).estado!;
    const denovo = mandar(caiu, "id-Ana", { tipo: "comecar" }, AGORA + 10 * SEGUNDO).estado!;
    expect(denovo.partida!.pessoas.map((p) => p.apelido)).toEqual(["Ana", "Bia", "Caio"]);
  });
});
