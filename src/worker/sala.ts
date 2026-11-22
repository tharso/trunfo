import { DurableObject } from "cloudflare:workers";
import {
  alarme,
  desconectar,
  proximoAlarme,
  receber,
  reservar,
  TEMPOS_DA_SALA,
  type EstadoDaSala,
  type Resultado,
  type TemposDaSala,
} from "../sala/sala";

// Um Durable Object por sala (spec, parte 10), com a WebSocket Hibernation API:
// o DO aceita o socket com ctx.acceptWebSocket e pode sair da memória enquanto
// as conexões continuam abertas; quando chega mensagem, a Cloudflare recria o
// objeto (o construtor roda de novo) e chama webSocketMessage.
//
// Por isso nada fica em campo da classe: o estado da sala vai no storage
// (chave "sala") e quem está em cada socket vai no attachment do socket.
//
// Esta classe é só a casca de rede. As decisões (quem entra, Apelido, Ordem da
// mesa, Anfitrião, "Começar", a partida com o módulo de regras e o que cada
// pessoa pode ver) moram em src/sala/sala.ts, sem rede, com testes.

const CHAVE = "sala";

/** O que fica preso em cada socket: o identificador secreto de quem está nele. */
interface Anexo {
  id: string | null;
}

/**
 * A semente da partida que começa: aleatória. O build do teste Playwright fixa
 * uma (VITE_SEMENTE_DA_SALA, em playwright.config.ts) para jogar sempre a mesma
 * partida; no build do site ela não existe.
 */
function sementeDaPartida(): number {
  const deTeste = import.meta.env.VITE_SEMENTE_DA_SALA;
  if (deTeste !== undefined && /^-?\d+$/.test(deTeste)) return Number(deTeste) | 0;
  return crypto.getRandomValues(new Int32Array(1))[0];
}

/**
 * Os tempos de queda (60 s), de cutucar (30 s) e da sala vazia (10 min). O
 * build do teste Playwright encurta (VITE_TEMPO_DE_QUEDA_DA_SALA,
 * VITE_TEMPO_DE_CUTUCAR_DA_SALA e VITE_TEMPO_DA_SALA_VAZIA, em ms, em
 * playwright.config.ts) para o teste não esperar de verdade.
 */
function temposDaSala(): TemposDaSala {
  const ms = (texto: string | undefined, padrao: number) => (texto && /^\d+$/.test(texto) ? Number(texto) : padrao);
  return {
    queda: ms(import.meta.env.VITE_TEMPO_DE_QUEDA_DA_SALA, TEMPOS_DA_SALA.queda),
    cutucar: ms(import.meta.env.VITE_TEMPO_DE_CUTUCAR_DA_SALA, TEMPOS_DA_SALA.cutucar),
    vazia: ms(import.meta.env.VITE_TEMPO_DA_SALA_VAZIA, TEMPOS_DA_SALA.vazia),
  };
}

function idDoSocket(socket: WebSocket): string | null {
  return (socket.deserializeAttachment() as Anexo | null)?.id ?? null;
}

export class Sala extends DurableObject<Env> {
  /** Chamado pelo Worker (RPC) ao criar sala: reserva o código se está livre. */
  async reservar(codigo: string): Promise<boolean> {
    const estado = reservar(await this.ler(), codigo, Date.now());
    if (estado === null) return false;
    // Sala criada e ninguém entra: fecha como a sala vazia.
    await this.aplicar({ estado, conexao: null, paraPessoas: [] });
    return true;
  }

  async fetch(pedido: Request): Promise<Response> {
    if (pedido.headers.get("Upgrade") !== "websocket") {
      return new Response("Esta rota só aceita WebSocket.", { status: 426 });
    }
    const { 0: cliente, 1: servidor } = new WebSocketPair();
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment({ id: null } satisfies Anexo);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(socket: WebSocket, mensagem: string | ArrayBuffer): Promise<void> {
    if (typeof mensagem !== "string") return;
    const conexao = idDoSocket(socket);
    const resultado = receber(await this.ler(), conexao, mensagem, Date.now(), { semente: sementeDaPartida() });
    if (resultado.conexao !== conexao) socket.serializeAttachment({ id: resultado.conexao } satisfies Anexo);
    if (resultado.resposta) socket.send(JSON.stringify(resultado.resposta));
    await this.aplicar(resultado);
  }

  async webSocketClose(socket: WebSocket, codigo: number, motivo: string): Promise<void> {
    socket.close(codigo, motivo);
    await this.fechou(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.fechou(socket);
  }

  /**
   * O alarme do storage tocou (funciona com hibernação: a Cloudflare recria o
   * objeto se preciso). O que venceu (queda, cutucar, sala vazia) quem decide
   * é `alarme`. A sala que fecha (estado `null`) some do storage: o código fica
   * livre e um link velho recebe "acabou".
   */
  async alarm(): Promise<void> {
    const antes = await this.ler();
    const resultado = alarme(antes, Date.now(), temposDaSala());
    if (antes !== null && resultado.estado === null) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.aplicar(resultado);
  }

  /** Um socket fechou. Se era a última conexão da pessoa, ela caiu. */
  private async fechou(socket: WebSocket): Promise<void> {
    const id = idDoSocket(socket);
    if (id === null) return;
    const outraConexao = this.ctx.getWebSockets().some((s) => s !== socket && idDoSocket(s) === id);
    if (outraConexao) return;
    await this.aplicar(desconectar(await this.ler(), id, Date.now()));
  }

  private async ler(): Promise<EstadoDaSala | null> {
    return (await this.ctx.storage.get<EstadoDaSala>(CHAVE)) ?? null;
  }

  /**
   * Guarda o estado novo, agenda o próximo alarme e entrega as mensagens de
   * cada pessoa, em ordem, em todos os sockets dela.
   */
  private async aplicar(resultado: Resultado): Promise<void> {
    if (resultado.estado !== null) {
      await this.ctx.storage.put(CHAVE, resultado.estado);
      const quando = proximoAlarme(resultado.estado, temposDaSala());
      if (quando === null) await this.ctx.storage.deleteAlarm();
      else await this.ctx.storage.setAlarm(quando);
    }
    if (resultado.paraPessoas.length === 0) return;
    const porPessoa = new Map<string, string[]>();
    for (const { id, mensagem } of resultado.paraPessoas) {
      porPessoa.set(id, [...(porPessoa.get(id) ?? []), JSON.stringify(mensagem)]);
    }
    for (const socket of this.ctx.getWebSockets()) {
      for (const texto of porPessoa.get(idDoSocket(socket) ?? "") ?? []) {
        try {
          socket.send(texto);
        } catch {
          // Socket fechando: webSocketClose cuida dele.
        }
      }
    }
  }
}
