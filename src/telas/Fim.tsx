// Fim da partida (docs/spec.md, parte 6): quem ganhou, o motivo, o placar e as rodadas jogadas.
import type { Estado, MotivoDoFim } from "../regras";

const VOCE = 0;
const COMPUTADOR = 1;

const MOTIVO: Record<MotivoDoFim, string> = {
  todasAsCartas: "Ficou com todas as cartas.",
  limiteDeRodadas: "Chegou ao limite de rodadas. Ganha quem tem mais cartas.",
  saida: "Alguém saiu da partida.",
};

interface Props {
  estado: Estado;
  aoJogarDeNovo: () => void;
  aoVoltar: () => void;
}

export function Fim({ estado, aoJogarDeNovo, aoVoltar }: Props) {
  const fim = estado.fim!;
  const titulo = fim.vencedor === VOCE ? "Você ganhou!" : fim.vencedor === COMPUTADOR ? "O computador ganhou." : "Empate.";
  return (
    <div class="tela">
      <main class="fim">
        <h1 class="fim__titulo">{titulo}</h1>
        <p>{MOTIVO[fim.motivo]}</p>
        <p>
          Você {estado.pessoas[VOCE].monte.length} × {estado.pessoas[COMPUTADOR].monte.length} Computador
        </p>
        <p>Rodadas jogadas: {fim.rodadasJogadas}</p>
        <button type="button" class="botao" onClick={aoJogarDeNovo}>
          Jogar de novo
        </button>
        <button type="button" class="botao botao--secundario" onClick={aoVoltar}>
          Voltar ao início
        </button>
      </main>
    </div>
  );
}
