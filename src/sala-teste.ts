// Página de prova do ticket #36: conecta na sala ?sala=<código>, manda o que
// for digitado e lista o que o Durable Object repassa. Cada linha mostra a
// `instancia` do DO: se ela muda sem a página reconectar, o DO hibernou e acordou.
import { conectarSala } from "./multiplayer/conexao";

const codigo = new URLSearchParams(location.search).get("sala") ?? "TESTE";
const estado = document.getElementById("estado")!;
const formulario = document.getElementById("formulario") as HTMLFormElement;
const campo = document.getElementById("mensagem") as HTMLInputElement;
const lista = document.getElementById("recebidas")!;

const socket = conectarSala(codigo);
let conexoes = 0;

socket.addEventListener("open", () => {
  conexoes += 1;
  estado.textContent = `Conectado (sala ${codigo}, conexão ${conexoes})`;
});
socket.addEventListener("close", () => {
  estado.textContent = "Reconectando…";
});
socket.addEventListener("message", (evento: MessageEvent<string>) => {
  const { texto, instancia, recebidas } = JSON.parse(evento.data) as {
    texto: string;
    instancia: string;
    recebidas: number;
  };
  const item = document.createElement("li");
  item.textContent = `${texto} (instância ${instancia}, mensagem ${recebidas})`;
  lista.append(item);
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (campo.value === "") return;
  socket.send(campo.value);
  campo.value = "";
});
