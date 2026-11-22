// Sorteio (docs/spec.md, parte 6): mostra quem começa. Quem começa já foi
// sorteado pelo módulo de regras ao criar a partida; a tela só conta.
import type { Estado } from "../regras";
import { NOME_DO_NIVEL, VOCE } from "./solo";

interface Props {
  estado: Estado;
  aoComecar: () => void;
}

export function Sorteio({ estado, aoComecar }: Props) {
  const voceComeca = estado.quemEscolhe === VOCE;
  const cada = estado.pessoas[VOCE].monte.length;
  const total = estado.pessoas.reduce((soma, p) => soma + p.monte.length, 0);
  return (
    <div class="tela">
      <main class="sorteio">
        <p class="sorteio__nivel">Partida nova · Nível {NOME_DO_NIVEL[estado.nivel]}</p>
        <div class="sorteio__moeda" aria-hidden="true">
          {voceComeca ? "🙋" : "🤖"}
        </div>
        <h1 class="sorteio__titulo">{voceComeca ? "Você começa!" : "O computador começa."}</h1>
        <p class="sorteio__texto">
          As {total} cartas foram embaralhadas. Cada um tem {cada}.
          <br />
          {voceComeca ? "Você escolhe o atributo da 1ª rodada." : "Ele escolhe o atributo da 1ª rodada."}
        </p>
        <button type="button" class="botao" onClick={aoComecar}>
          Ver minha primeira carta
        </button>
      </main>
    </div>
  );
}
