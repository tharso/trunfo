// Navegação entre as telas: Início (↔ Como jogar) → Sorteio → Partida → Fim.
// A tela não decide regra: cria a partida e manda ações para o módulo de regras.
// O App também guarda no celular (src/armazenamento.ts) a partida solo depois de
// cada rodada e o Retrospecto quando a partida acaba (docs/spec.md, parte 8).
import { useState } from "preact/hooks";
import { guardarPartida, guardarRetrospecto, lerPartida, lerRetrospecto } from "../armazenamento";
import baralho from "../dados/baralho.json";
import { aplicar, criarPartida, registrarPartida, resultadoDaPartida, type Estado, type Nivel } from "../regras";
import { ComoJogar } from "./ComoJogar";
import { Fim } from "./Fim";
import { Inicio } from "./Inicio";
import { Partida } from "./Partida";
import { sentir } from "./sensacao";
import { VOCE } from "./solo";
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
  const [retrospecto, setRetrospecto] = useState(lerRetrospecto);
  // A partida solo que ficou no meio (aba fechada, celular travou...).
  const [guardada, setGuardada] = useState(lerPartida);

  /** Uma partida acabou: soma no Retrospecto e apaga a partida guardada. */
  function registrarFim(estado: Estado) {
    const resultado = resultadoDaPartida(estado, VOCE);
    if (resultado) {
      const novo = registrarPartida(retrospecto, estado.nivel, resultado);
      setRetrospecto(novo);
      guardarRetrospecto(novo);
    }
    setGuardada(null);
    guardarPartida(null);
  }

  /** Depois de cada rodada: guarda a partida, ou registra o fim. */
  function aoMudar(estado: Estado) {
    if (estado.fim) {
      registrarFim(estado);
    } else {
      setGuardada(estado);
      guardarPartida(estado);
    }
  }

  /**
   * Sair no meio (menu ☰ ou "Nova partida" com partida guardada): conta como derrota.
   * Se a partida já acabou (menu aberto no resultado da última rodada), o fim já foi registrado.
   */
  function sair(estado: Estado) {
    if (!estado.fim) registrarFim(aplicar(estado, { tipo: "sair", pessoa: VOCE }).estado);
  }

  /** Partida nova: passa pelo Sorteio. "Continuar" vai direto para a Partida. */
  function jogar() {
    setTela({ nome: "sorteio", estado: novaPartida(nivel) });
  }

  switch (tela.nome) {
    case "inicio":
      return (
        <Inicio
          nivel={nivel}
          retrospecto={retrospecto[nivel]}
          temPartidaGuardada={guardada !== null}
          aoMudarNivel={setNivel}
          aoJogar={jogar}
          aoContinuar={() => guardada && setTela({ nome: "partida", estado: guardada })}
          aoNovaPartida={() => {
            if (guardada) sair(guardada);
            jogar();
          }}
          aoComoJogar={() => setTela({ nome: "comoJogar" })}
        />
      );
    case "comoJogar":
      return <ComoJogar aoVoltar={() => setTela({ nome: "inicio" })} />;
    case "sorteio":
      return <Sorteio estado={tela.estado} aoComecar={() => setTela({ nome: "partida", estado: tela.estado })} />;
    case "partida":
      return (
        <Partida
          inicial={tela.estado}
          aoMudar={aoMudar}
          aoSair={(estado) => {
            sair(estado);
            setTela({ nome: "inicio" });
          }}
          aoTerminar={(estado) => setTela({ nome: "fim", estado })}
          aoMomento={sentir}
        />
      );
    case "fim":
      return (
        <Fim
          estado={tela.estado}
          aoJogarDeNovo={jogar}
          aoVoltar={() => setTela({ nome: "inicio" })}
          aoMomento={sentir}
        />
      );
  }
}
