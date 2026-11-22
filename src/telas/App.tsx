// Navegação entre as telas: Início (↔ Como jogar) → Sorteio → Partida → Fim.
// A tela não decide regra: cria a partida e manda ações para o módulo de regras.
import { useState } from "preact/hooks";
import baralho from "../dados/baralho.json";
import { criarPartida, type Estado, type Nivel } from "../regras";
import { ComoJogar } from "./ComoJogar";
import { Fim } from "./Fim";
import { Inicio } from "./Inicio";
import { Partida } from "./Partida";
import { Sorteio } from "./Sorteio";

type Tela =
  | { nome: "inicio" }
  | { nome: "comoJogar" }
  | { nome: "sorteio"; estado: Estado }
  | { nome: "partida"; estado: Estado }
  | { nome: "fim"; estado: Estado };

/**
 * A semente da fonte de sorteio. `?semente=123` na URL fixa a partida (o teste
 * Playwright usa isso para jogar sempre a mesma partida). Sem ela, é aleatória.
 */
function semente(): number {
  const daUrl = new URLSearchParams(location.search).get("semente");
  if (daUrl !== null && /^-?\d+$/.test(daUrl)) return Number(daUrl) | 0;
  return (Math.random() * 2 ** 32) | 0;
}

function novaPartida(nivel: Nivel): Estado {
  return criarPartida({ baralho: baralho.cartas, pessoas: ["humano", "computador"], nivel, semente: semente() });
}

export function App() {
  const [tela, setTela] = useState<Tela>({ nome: "inicio" });
  // O Nível escolhido no Início vale para a partida (e para "Jogar de novo").
  const [nivel, setNivel] = useState<Nivel>("facil");

  switch (tela.nome) {
    case "inicio":
      return (
        <Inicio
          nivel={nivel}
          aoMudarNivel={setNivel}
          aoJogar={() => setTela({ nome: "sorteio", estado: novaPartida(nivel) })}
          aoComoJogar={() => setTela({ nome: "comoJogar" })}
        />
      );
    case "comoJogar":
      return <ComoJogar aoVoltar={() => setTela({ nome: "inicio" })} />;
    case "sorteio":
      return <Sorteio estado={tela.estado} aoComecar={() => setTela({ nome: "partida", estado: tela.estado })} />;
    case "partida":
      return <Partida inicial={tela.estado} aoTerminar={(estado) => setTela({ nome: "fim", estado })} />;
    case "fim":
      return (
        <Fim
          estado={tela.estado}
          aoJogarDeNovo={() => setTela({ nome: "sorteio", estado: novaPartida(nivel) })}
          aoVoltar={() => setTela({ nome: "inicio" })}
        />
      );
  }
}
