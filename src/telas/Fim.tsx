// Fim da partida (docs/spec.md, parte 6): quem ganhou, o motivo, o placar e as rodadas jogadas.
import { useEffect } from "preact/hooks";
import type { Estado, MotivoDoFim } from "../regras";
import type { AoMomento } from "./momentos";

const VOCE = 0;
const COMPUTADOR = 1;

const MOTIVO: Record<MotivoDoFim, string> = {
  todasAsCartas: "Ficou com todas as cartas.",
  limiteDeRodadas: "Chegou ao limite de rodadas. Ganha quem tem mais cartas.",
  semCartas: "Todo mundo ficou sem cartas no mesmo empate.",
  saida: "Alguém saiu da partida.",
};

/** O motivo, com o caso do empate no limite de rodadas. */
function motivo(fim: NonNullable<Estado["fim"]>): string {
  if (fim.motivo === "limiteDeRodadas" && fim.vencedor === null)
    return "Chegou ao limite de rodadas com o mesmo número de cartas.";
  return MOTIVO[fim.motivo];
}

interface Props {
  estado: Estado;
  aoJogarDeNovo: () => void;
  aoVoltar: () => void;
  /** Gancho para som e vibração (ticket 28): o fim (vitória, derrota ou empate). */
  aoMomento?: AoMomento;
}

export function Fim({ estado, aoJogarDeNovo, aoVoltar, aoMomento }: Props) {
  const fim = estado.fim!;
  useEffect(() => {
    const resultado = fim.vencedor === VOCE ? "vitoria" : fim.vencedor === COMPUTADOR ? "derrota" : "empate";
    aoMomento?.({ tipo: "fim", resultado });
  }, []);
  const titulo = fim.vencedor === VOCE ? "Você ganhou!" : fim.vencedor === COMPUTADOR ? "O computador ganhou." : "Empate.";
  return (
    <div class="tela">
      <main class="fim">
        <h1 class="fim__titulo">{titulo}</h1>
        <p>{motivo(fim)}</p>
        {fim.vencedor === null && estado.monteDeEmpate.length > 0 && (
          <p>As {estado.monteDeEmpate.length} cartas do monte de empate não contam.</p>
        )}
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
