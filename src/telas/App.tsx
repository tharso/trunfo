// Navegação entre as telas: Início → Partida → Fim.
// A tela não decide regra: cria a partida e manda ações para o módulo de regras.
import { useState } from "preact/hooks";
import baralho from "../dados/baralho.json";
import { criarPartida, type Estado } from "../regras";
import { Fim } from "./Fim";
import { Inicio } from "./Inicio";
import { Partida } from "./Partida";

type Tela = { nome: "inicio" } | { nome: "partida"; estado: Estado } | { nome: "fim"; estado: Estado };

/**
 * A semente da fonte de sorteio. `?semente=123` na URL fixa a partida (o teste
 * Playwright usa isso para jogar sempre a mesma partida). Sem ela, é aleatória.
 */
function semente(): number {
  const daUrl = new URLSearchParams(location.search).get("semente");
  if (daUrl !== null && /^-?\d+$/.test(daUrl)) return Number(daUrl) | 0;
  return (Math.random() * 2 ** 32) | 0;
}

function novaPartida(): Estado {
  return criarPartida({ baralho: baralho.cartas, pessoas: ["humano", "computador"], nivel: "facil", semente: semente() });
}

export function App() {
  const [tela, setTela] = useState<Tela>({ nome: "inicio" });

  switch (tela.nome) {
    case "inicio":
      return <Inicio aoJogar={() => setTela({ nome: "partida", estado: novaPartida() })} />;
    case "partida":
      return <Partida inicial={tela.estado} aoTerminar={(estado) => setTela({ nome: "fim", estado })} />;
    case "fim":
      return (
        <Fim
          estado={tela.estado}
          aoJogarDeNovo={() => setTela({ nome: "partida", estado: novaPartida() })}
          aoVoltar={() => setTela({ nome: "inicio" })}
        />
      );
  }
}
