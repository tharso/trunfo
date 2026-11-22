// Tela de Início (docs/spec.md, parte 6): título, escolha do Nível, Retrospecto
// do nível, "Jogar" (ou "Continuar partida?" quando há partida guardada),
// "Como jogar" e o aviso de jogo de fã. O som vem em outro ticket.
import type { Nivel, PlacarDoNivel } from "../regras";
import { BotaoSom } from "./BotaoSom";
import "./Inicio.css";

const NIVEIS: { nivel: Nivel; nome: string; explicacao: string }[] = [
  { nivel: "facil", nome: "Fácil", explicacao: "O computador sorteia o atributo." },
  { nivel: "normal", nome: "Normal", explicacao: "O computador escolhe o melhor atributo da carta." },
];

/** "Normal: você 7 × 4 computador · 1 empate". O empate só aparece quando é maior que zero. */
function textoDoRetrospecto(nivel: Nivel, placar: PlacarDoNivel): string {
  const nome = NIVEIS.find((n) => n.nivel === nivel)!.nome;
  const empates = placar.empates === 0 ? "" : ` · ${placar.empates} ${placar.empates === 1 ? "empate" : "empates"}`;
  return `${nome}: você ${placar.vitorias} × ${placar.derrotas} computador${empates}`;
}

interface Props {
  nivel: Nivel;
  /** O Retrospecto do nível escolhido. */
  retrospecto: PlacarDoNivel;
  temPartidaGuardada: boolean;
  aoMudarNivel: (nivel: Nivel) => void;
  aoJogar: () => void;
  aoContinuar: () => void;
  /** Começa outra partida; a guardada conta como derrota. */
  aoNovaPartida: () => void;
  aoComoJogar: () => void;
}

export function Inicio({
  nivel,
  retrospecto,
  temPartidaGuardada,
  aoMudarNivel,
  aoJogar,
  aoContinuar,
  aoNovaPartida,
  aoComoJogar,
}: Props) {
  return (
    <div class="tela">
      <BotaoSom />
      <main class="inicio">
        <h1 class="inicio__titulo">Super Trunfo Ciclismo</h1>
        <fieldset class="niveis">
          <legend class="niveis__titulo">Nível</legend>
          {NIVEIS.map((n) => (
            <label key={n.nivel} class={`nivel${nivel === n.nivel ? " nivel--marcado" : ""}`}>
              <input
                type="radio"
                name="nivel"
                value={n.nivel}
                checked={nivel === n.nivel}
                onChange={() => aoMudarNivel(n.nivel)}
              />
              <span class="nivel__nome">{n.nome}</span>
              <span class="nivel__explicacao">{n.explicacao}</span>
            </label>
          ))}
        </fieldset>
        <p class="retrospecto">{textoDoRetrospecto(nivel, retrospecto)}</p>
        {temPartidaGuardada ? (
          <section class="continuar" aria-labelledby="continuar-titulo">
            <h2 id="continuar-titulo" class="continuar__titulo">
              Continuar partida?
            </h2>
            <button type="button" class="botao" onClick={aoContinuar}>
              Continuar
            </button>
            <button type="button" class="botao botao--secundario" onClick={aoNovaPartida}>
              Nova partida
            </button>
            <p class="continuar__aviso">Nova partida conta como derrota.</p>
          </section>
        ) : (
          <button type="button" class="botao" onClick={aoJogar}>
            Jogar
          </button>
        )}
        <button type="button" class="botao botao--secundario" onClick={aoComoJogar}>
          Como jogar
        </button>
      </main>
      <footer class="rodape">
        Jogo de fã, sem fins lucrativos. Sem ligação com a Grow, a UCI, as equipes ou os ciclistas.
      </footer>
    </div>
  );
}
