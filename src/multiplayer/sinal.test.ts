// O celular manda ping de tempos em tempos e reconecta se o pong não vem: um
// socket "pendurado" (o sinal sumiu sem o navegador disparar `offline`) não
// fica parado para sempre.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVALO_DO_PING, PING, PONG } from "../sala/sinal";
import { vigiarSinal } from "./sinal";

class ConexaoDeTeste extends EventTarget {
  readyState = 1;
  enviadas: string[] = [];
  reconexoes = 0;
  send(texto: string) {
    this.enviadas.push(texto);
  }
  reconnect() {
    this.reconexoes++;
  }
  responder(texto: string) {
    this.dispatchEvent(new MessageEvent("message", { data: texto }));
  }
}

describe("vigiar o sinal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("manda ping a cada intervalo e, com pong, não reconecta", () => {
    const conexao = new ConexaoDeTeste();
    vigiarSinal(conexao);
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(INTERVALO_DO_PING);
      conexao.responder(PONG);
    }
    expect(conexao.enviadas).toEqual([PING, PING, PING]);
    expect(conexao.reconexoes).toBe(0);
  });

  it("sem pong até o próximo ping, reconecta", () => {
    const conexao = new ConexaoDeTeste();
    vigiarSinal(conexao);
    vi.advanceTimersByTime(INTERVALO_DO_PING);
    vi.advanceTimersByTime(INTERVALO_DO_PING);
    expect(conexao.reconexoes).toBe(1);
  });

  it("com o socket fechado (reconectando), não manda ping nem reconecta de novo", () => {
    const conexao = new ConexaoDeTeste();
    conexao.readyState = 3;
    vigiarSinal(conexao);
    vi.advanceTimersByTime(3 * INTERVALO_DO_PING);
    expect(conexao.enviadas).toEqual([]);
    expect(conexao.reconexoes).toBe(0);
  });

  it("ao parar de vigiar, os pings param", () => {
    const conexao = new ConexaoDeTeste();
    const parar = vigiarSinal(conexao);
    parar();
    vi.advanceTimersByTime(3 * INTERVALO_DO_PING);
    expect(conexao.enviadas).toEqual([]);
  });
});
