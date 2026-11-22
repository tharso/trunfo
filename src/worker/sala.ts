import { DurableObject } from "cloudflare:workers";

// Um Durable Object por sala (spec, parte 10). Usa a WebSocket Hibernation API:
// o DO aceita o socket com ctx.acceptWebSocket e pode sair da memória enquanto
// as conexões continuam abertas; quando chega mensagem, a Cloudflare recria o
// objeto (o construtor roda de novo) e chama webSocketMessage.
//
// Por isso nada importante pode ficar só em campo da classe: o que precisa
// sobreviver vai no storage do DO ou no attachment de cada socket.
//
// Versão do ticket #36 (prova de tecnologia): repassa cada mensagem a todos da
// sala. `instancia` muda quando o objeto foi recriado, o que mostra a hibernação.
export class Sala extends DurableObject {
  // Muda a cada vez que o objeto nasce (primeira conexão ou volta da hibernação).
  private readonly instancia = crypto.randomUUID().slice(0, 8);

  async fetch(pedido: Request): Promise<Response> {
    if (pedido.headers.get("Upgrade") !== "websocket") {
      return new Response("Esta rota só aceita WebSocket.", { status: 426 });
    }
    const { 0: cliente, 1: servidor } = new WebSocketPair();
    this.ctx.acceptWebSocket(servidor);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(_socket: WebSocket, mensagem: string | ArrayBuffer): Promise<void> {
    if (typeof mensagem !== "string") return;
    const recebidas = ((await this.ctx.storage.get<number>("recebidas")) ?? 0) + 1;
    await this.ctx.storage.put("recebidas", recebidas);
    const saida = JSON.stringify({ texto: mensagem, instancia: this.instancia, recebidas });
    for (const socket of this.ctx.getWebSockets()) socket.send(saida);
  }

  async webSocketClose(socket: WebSocket, codigo: number, motivo: string): Promise<void> {
    socket.close(codigo, motivo);
  }
}
