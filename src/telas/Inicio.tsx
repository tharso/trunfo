// Tela de Início (docs/spec.md, parte 6): título, escolha do Nível, "Jogar",
// "Como jogar" e o aviso de jogo de fã. Retrospecto, som e "Continuar partida?"
// vêm em outros tickets.
import type { Nivel } from "../regras";

const NIVEIS: { nivel: Nivel; nome: string; explicacao: string }[] = [
  { nivel: "facil", nome: "Fácil", explicacao: "O computador sorteia o atributo." },
  { nivel: "normal", nome: "Normal", explicacao: "O computador escolhe o melhor atributo da carta." },
];

interface Props {
  nivel: Nivel;
  aoMudarNivel: (nivel: Nivel) => void;
  aoJogar: () => void;
  aoComoJogar: () => void;
}

export function Inicio({ nivel, aoMudarNivel, aoJogar, aoComoJogar }: Props) {
  return (
    <div class="tela">
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
        <button type="button" class="botao" onClick={aoJogar}>
          Jogar
        </button>
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
