// "Jogar com amigos" na tela (docs/spec.md, parte 9): textos e endereços usados
// por mais de uma tela. As decisões da sala são de src/sala/sala.ts.
import { useEffect, useState } from "preact/hooks";
import type { MotivoDaRecusa } from "../sala/protocolo";

export const PRECISA_DE_INTERNET = "Precisa de internet";

export const MOTIVO_DA_RECUSA: Record<MotivoDaRecusa, string> = {
  cheia: "Esta sala está cheia: já tem 4 pessoas.",
  emPartida: "Esta sala está no meio de uma partida. Durante a partida, ninguém entra.",
  acabou: "Esta sala já acabou",
};

/**
 * A página do link da sala. Não é /sala/<código>: essa é a rota do WebSocket
 * (o Worker manda para o Durable Object). /s/<código> é arquivo do site (SPA).
 */
export function caminhoDaSala(codigo: string): string {
  return `/s/${codigo}`;
}

/** O código do link (/s/<código>), se a página foi aberta por um. */
export function codigoDoCaminho(caminho: string): string | null {
  return /^\/s\/([^/]+)\/?$/.exec(caminho)?.[1] ?? null;
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
