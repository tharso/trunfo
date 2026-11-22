// Fim da partida (docs/spec.md, parte 6): quem ganhou, o motivo, o placar e as rodadas jogadas.
// Os textos do fim (título e motivo) servem também ao fim da sala (FimDaSala, em PartidaDaSala.tsx).
import { useEffect } from "preact/hooks";
import { quemFicouSemCartas, resultadoDaPartida, resultadoDoFim, type Estado, type Fim as FimDaPartida, type MotivoDoFim } from "../regras";
import type { NomeNaTela } from "./mesa";
import type { AoMomento } from "./momentos";
import { COMPUTADOR, NOMES_DO_SOLO, VOCE } from "./solo";

const MOTIVO: Record<MotivoDoFim, string> = {
  todasAsCartas: "Ficou com todas as cartas.",
  ultimaNaPartida: "Ficou sem cartas no empate.",
  limiteDeRodadas: "Chegou ao limite de rodadas. Ganha quem tem mais cartas.",
  semCartas: "Todo mundo ficou sem cartas no mesmo empate.",
  saida: "Alguém saiu da partida.",
};

/** Quem ganhou, para quem olha (`voce`): "Você ganhou!", "O computador ganhou.", "Ana ganhou.", "Empate.". */
export function tituloDoFim(fim: FimDaPartida, voce: number, nomes: NomeNaTela[]): string {
  const resultado = resultadoDoFim(fim, voce);
  if (resultado === "vitoria") return "Você ganhou!";
  if (resultado === "empate") return "Empate.";
  return `${nomes[fim.vencedor!].sujeito} ganhou.`;
}

/** O motivo, com o caso do empate no limite de rodadas e quem ficou sem cartas no empate. */
export function motivoDoFim(fim: FimDaPartida, voce: number, nomes: NomeNaTela[]): string {
  if (fim.motivo === "limiteDeRodadas" && fim.vencedor === null)
    return "Chegou ao limite de rodadas com o mesmo número de cartas.";
  const semCartas = quemFicouSemCartas(fim, nomes.length);
  if (semCartas !== null) {
    return semCartas === voce ? "Você ficou sem cartas." : `${nomes[semCartas].sujeito} ficou sem cartas.`;
  }
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
  const daPartida = resultadoDaPartida(estado, VOCE)!;
  // Sair no meio conta como derrota.
  const resultado = daPartida === "saida" ? "derrota" : daPartida;
  useEffect(() => {
    aoMomento?.({ tipo: "fim", resultado });
  }, []);
  // Quem sai no meio deixa o Computador como vencedor: o título também diz que ele ganhou.
  const titulo = tituloDoFim(fim, VOCE, NOMES_DO_SOLO);
  return (
    <div class="tela">
      <main class="fim">
        <h1 class="fim__titulo">{titulo}</h1>
        <p>{motivoDoFim(fim, VOCE, NOMES_DO_SOLO)}</p>
        {estado.monteDeEmpate.length > 0 && (
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
