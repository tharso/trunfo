import PartySocket from "partysocket";
import { useEffect, useRef, useState } from "preact/hooks";
import { lerMensagemDaSala, type MensagemDaSala, type MensagemDoCliente, type MotivoDaRecusa } from "../sala/protocolo";
import { avancar, filaVazia, receberNaFila, type FilaDaPartida } from "./fila";

// A conversa do celular com a Sala (Durable Object atrás de /sala/<código>).
// partysocket reconecta sozinho quando a rede cai ou o servidor reinicia; a cada
// conexão (inclusive a reconexão) o celular manda "entrar" de novo, e o
// identificador secreto faz a sala reconhecer a mesma pessoa.

/** Pede ao Worker um código livre. Lança erro sem internet. */
export async function criarSala(): Promise<string> {
  const resposta = await fetch("/sala/nova", { method: "POST" });
  if (!resposta.ok) throw new Error(`Não deu para criar a sala (${resposta.status}).`);
  const { codigo } = (await resposta.json()) as { codigo: string };
  return codigo;
}

export function conectarSala(codigo: string): PartySocket {
  return new PartySocket({
    host: location.host,
    protocol: location.protocol === "https:" ? "wss" : "ws",
    basePath: `sala/${encodeURIComponent(codigo)}`,
    // Quem cai tem 60 s para voltar (spec, item 14): tentar de novo a cada 4 s
    // no máximo (o padrão do partysocket chega a 10 s).
    minReconnectionDelay: 1000,
    maxReconnectionDelay: 4000,
  });
}

/** Quem entra em qual sala: o código, o Apelido e o identificador secreto do celular. */
export interface EntradaNaSala {
  codigo: string;
  apelido: string;
  id: string;
}

/** Se o navegador diz que tem internet; muda quando a rede cai ou volta. */
export function useInternet(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    addEventListener("online", atualizar);
    addEventListener("offline", atualizar);
    return () => {
      removeEventListener("online", atualizar);
      removeEventListener("offline", atualizar);
    };
  }, []);
  return online;
}

export type SalaVista = Extract<MensagemDaSala, { tipo: "sala" }>;

export type SituacaoDaSala =
  | { tipo: "conectando" }
  /** `conectado` é falso enquanto a rede caiu e o partysocket tenta de novo. */
  | { tipo: "naSala"; sala: SalaVista; conectado: boolean }
  | { tipo: "recusada"; motivo: MotivoDaRecusa };

/**
 * Entra na sala `codigo` e acompanha o que ela manda. As rodadas da partida vão
 * para a fila (`fila`); "Próxima rodada" chama `avancarFila`. `online` diz se o
 * navegador tem internet (os mesmos avisos de rede que fazem reconectar).
 */
export function useSala({ codigo, apelido, id }: EntradaNaSala) {
  const [online, setOnline] = useState(navigator.onLine);
  const [situacao, setSituacao] = useState<SituacaoDaSala>({ tipo: "conectando" });
  const [fila, setFila] = useState<FilaDaPartida>(filaVazia);
  /** Quantas vezes alguém cutucou você (a tela vibra a cada uma). */
  const [cutucadas, setCutucadas] = useState(0);
  const socket = useRef<PartySocket | null>(null);

  useEffect(() => {
    const conexao = conectarSala(codigo);
    socket.current = conexao;
    /** Fechada de vez (saiu da tela ou a sala recusou): não reconecta mais. */
    let fechada = false;
    conexao.addEventListener("open", () => {
      conexao.send(JSON.stringify({ tipo: "entrar", id, apelido } satisfies MensagemDoCliente));
    });
    conexao.addEventListener("close", () => {
      setSituacao((antes) => (antes.tipo === "naSala" ? { ...antes, conectado: false } : antes));
    });
    conexao.addEventListener("message", (evento: MessageEvent<string>) => {
      const mensagem = lerMensagemDaSala(evento.data);
      if (mensagem === null) return;
      if (mensagem.tipo === "recusada") {
        fechada = true;
        conexao.close();
        setSituacao({ tipo: "recusada", motivo: mensagem.motivo });
      } else if (mensagem.tipo === "sala") {
        setSituacao({ tipo: "naSala", sala: mensagem, conectado: true });
      } else if (mensagem.tipo === "cutucada") {
        setCutucadas((n) => n + 1);
      } else {
        setFila((antes) => receberNaFila(antes, mensagem));
      }
    });
    // O navegador avisa que a rede caiu: um WebSocket aberto pode ficar "pendurado"
    // sem o servidor saber. Fechar agora faz a sala ver a queda (a partida para,
    // spec item 14); quando a rede volta, reconecta na hora, sem esperar o
    // intervalo do partysocket.
    const mudouARede = () => {
      setOnline(navigator.onLine);
      if (!fechada) conexao.reconnect();
    };
    addEventListener("offline", mudouARede);
    addEventListener("online", mudouARede);
    return () => {
      fechada = true;
      removeEventListener("offline", mudouARede);
      removeEventListener("online", mudouARede);
      conexao.close();
    };
  }, [codigo, apelido, id]);

  function enviar(mensagem: MensagemDoCliente) {
    socket.current?.send(JSON.stringify(mensagem));
  }

  return { online, situacao, enviar, fila, avancarFila: () => setFila(avancar), cutucadas };
}
