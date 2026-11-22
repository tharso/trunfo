// O lado do celular do sinal de vida (src/sala/sinal.ts): ping a cada
// INTERVALO_DO_PING; se o pong do ping anterior não veio, a conexão está
// pendurada e o celular reconecta (a Sala vê a queda e a volta).
import { INTERVALO_DO_PING, PING, PONG } from "../sala/sinal";

/** O que o vigia usa da conexão (o PartySocket tem tudo isso). */
interface ConexaoVigiada extends EventTarget {
  readyState: number;
  send(texto: string): void;
  reconnect(): void;
}

/** `readyState` do WebSocket aberto. */
const ABERTA = 1;

/** Começa a vigiar a conexão. Devolve a função que para. */
export function vigiarSinal(conexao: ConexaoVigiada): () => void {
  let esperandoPong = false;
  const aoAbrir = () => {
    esperandoPong = false;
  };
  const aoReceber = (evento: Event) => {
    if ((evento as MessageEvent).data === PONG) esperandoPong = false;
  };
  conexao.addEventListener("open", aoAbrir);
  conexao.addEventListener("message", aoReceber);
  const relogio = setInterval(() => {
    // Fechada (já reconectando): o partysocket cuida; ping agora ficaria na fila.
    if (conexao.readyState !== ABERTA) return;
    if (esperandoPong) {
      esperandoPong = false;
      conexao.reconnect();
      return;
    }
    esperandoPong = true;
    conexao.send(PING);
  }, INTERVALO_DO_PING);
  return () => {
    clearInterval(relogio);
    conexao.removeEventListener("open", aoAbrir);
    conexao.removeEventListener("message", aoReceber);
  };
}
