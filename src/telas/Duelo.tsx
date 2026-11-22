// Tela do duelo (docs/spec.md, partes 6 e 7). Fundo escuro, ocupa a janela.
// Tempo (~3 s): a sua barra cresce (1,2 s) com o número contando, depois a do
// Computador (1,2 s); pausa (0,35 s); aparecem o resultado e os botões.
// "Pular ⏩" ou um toque em qualquer lugar vai direto ao resultado.
// A rodada já foi decidida pelo módulo de regras: o duelo só mostra o evento.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Carta as CartaDasRegras, EventoDaRodada } from "../regras";
import { Carta, TEXTO_DA_ETAPA } from "./Carta";
import { corDaNota } from "./cores";
import { aparencia, NOME_DO_ATRIBUTO } from "./doBaralho";
import type { AoMomento } from "./momentos";
import { selo, textoDoMotivo } from "./Selos";
import { COMPUTADOR, rodadaParaVoce, VOCE } from "./solo";

const BARRA_MS = 1200;
const PAUSA_MS = 350;
const TOTAL_MS = 2 * BARRA_MS + PAUSA_MS;

const TITULO = {
  ganhar: "Você ganhou a rodada!",
  perder: "O computador ganhou.",
  empate: "Empate!",
};

interface Props {
  evento: EventoDaRodada;
  /** As cartas da mesa, para as faixas e para "Ver as duas cartas". */
  cartas: { voce: CartaDasRegras; computador: CartaDasRegras };
  aoProximaRodada: () => void;
  /** Gancho para som e vibração (ticket 28): largada, barras subindo e resultado. */
  aoMomento?: AoMomento;
}

/** Sai rápido e chega devagar, como o protótipo. */
function suave(k: number): number {
  const t = Math.min(1, Math.max(0, k));
  return 1 - (1 - t) ** 3;
}

export function Duelo({ evento, cartas, aoProximaRodada, aoMomento }: Props) {
  const [tempo, setTempo] = useState(0);
  const [verCartas, setVerCartas] = useState(false);
  const pulou = useRef(false);
  const momento = useRef(aoMomento);
  momento.current = aoMomento;
  const proxima = useRef<HTMLButtonElement>(null);

  const pronto = tempo >= TOTAL_MS;
  const computadorCorrendo = tempo >= BARRA_MS;

  // O relógio do duelo. Para sozinho no fim ou quando alguém pula.
  useEffect(() => {
    momento.current?.({ tipo: "largada" });
    momento.current?.({ tipo: "barra", duracaoMs: BARRA_MS });
    const inicio = performance.now();
    let quadro = 0;
    const passo = () => {
      const agora = performance.now() - inicio;
      setTempo((antes) => (antes >= TOTAL_MS ? antes : Math.min(agora, TOTAL_MS)));
      if (agora < TOTAL_MS && !pulou.current) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, []);

  useEffect(() => {
    if (computadorCorrendo && !pronto) momento.current?.({ tipo: "barra", duracaoMs: BARRA_MS });
  }, [computadorCorrendo]);

  useEffect(() => {
    if (!pronto) return;
    momento.current?.({ tipo: "resultado", resultado: rodadaParaVoce(evento.vencedor) });
    proxima.current?.focus();
  }, [pronto]);

  function pular() {
    if (pronto) return;
    pulou.current = true;
    setTempo(TOTAL_MS);
  }

  const etapa = TEXTO_DA_ETAPA[evento.atributo];
  const quemEscolheu = evento.quemEscolheu === VOCE ? "Você escolheu" : "O computador escolheu";

  if (verCartas) {
    return (
      <div class="duelo" role="dialog" aria-modal="true" aria-label="Duelo">
        <div class="duelo__conteudo">
          <h2 class="duelo__etapa">{etapa}</h2>
          <div class="duelo__cartas">
            <Carta carta={cartas.voce} marcado={evento.atributo} selo={selo(cartas.voce)} rotulo={`Sua carta: ${cartas.voce.nome}`} />
            <Carta
              carta={cartas.computador}
              marcado={evento.atributo}
              selo={selo(cartas.computador)}
              rotulo={`Carta do computador: ${cartas.computador.nome}`}
            />
          </div>
          <button type="button" class="botao botao--secundario" onClick={() => setVerCartas(false)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const titulo = TITULO[rodadaParaVoce(evento.vencedor)];
  // O motivo (Super Trunfo, Carta A, monte de empate) vem do evento `rodada` (ticket 23).
  const motivo = textoDoMotivo(evento);
  const leva =
    evento.vencedor === null
      ? null
      : `${evento.vencedor === VOCE ? "Você leva" : "O computador leva"} ${evento.cartasLevadas} cartas.`;

  return (
    <div class={`duelo${pronto ? " duelo--pronto" : ""}`} role="dialog" aria-modal="true" aria-label="Duelo" onClick={pular}>
      <div class="duelo__conteudo">
        {!pronto && (
          <button type="button" class="duelo__pular" onClick={pular}>
            Pular ⏩
          </button>
        )}
        <h2 class="duelo__etapa">{etapa}</h2>
        <p class="duelo__sub">
          {quemEscolheu} {NOME_DO_ATRIBUTO[evento.atributo]}
        </p>
        <Faixa carta={cartas.voce} quem="Você" pessoa={VOCE} evento={evento} k={suave(tempo / BARRA_MS)} pronto={pronto} />
        <Faixa
          carta={cartas.computador}
          quem="Computador"
          pessoa={COMPUTADOR}
          evento={evento}
          k={suave((tempo - BARRA_MS) / BARRA_MS)}
          pronto={pronto}
        />
        {!pronto && <p class="duelo__dica">toque na tela para pular</p>}
        <div class="duelo__resultado" aria-live="polite">
          {pronto && (
            <>
              <h3 class="duelo__titulo">{titulo}</h3>
              {motivo && <p class="resultado__motivo">{motivo}</p>}
              {leva && <p>{leva}</p>}
            </>
          )}
        </div>
        <div class="duelo__botoes">
          <button type="button" class="botao" ref={proxima} onClick={aoProximaRodada}>
            Próxima rodada
          </button>
          <button type="button" class="botao botao--secundario" onClick={() => setVerCartas(true)}>
            Ver as duas cartas
          </button>
        </div>
      </div>
    </div>
  );
}

interface FaixaProps {
  carta: CartaDasRegras;
  quem: string;
  pessoa: number;
  evento: EventoDaRodada;
  /** Quanto a barra já cresceu, de 0 a 1. */
  k: number;
  pronto: boolean;
}

function Faixa({ carta, quem, pessoa, evento, k, pronto }: FaixaProps) {
  const { cores, iniciais } = aparencia(carta);
  const nota = evento.mesa.find((m) => m.pessoa === pessoa)?.nota ?? 0;
  // O Super Trunfo enche a barra quando ganhou por ser Super Trunfo; contra a Carta A, vale a nota.
  const alvo = carta.superTrunfo && evento.motivo === "superTrunfo" ? 100 : nota;
  const vence = pronto && evento.vencedor === pessoa;
  const perde = pronto && evento.vencedor !== null && evento.vencedor !== pessoa;
  return (
    <div
      class={`duelo__faixa${vence ? " duelo__faixa--vence" : ""}${perde ? " duelo__faixa--perde" : ""}`}
      style={{ "--equipe-1": cores[0], "--equipe-2": cores[1] ?? cores[0] }}
    >
      <div class="duelo__quem">
        <span class="duelo__avatar" aria-hidden="true">
          {iniciais}
        </span>
        <span>
          {carta.nome}
          <span class="duelo__pessoa">{quem}</span>
        </span>
        <span class="duelo__nota">{Math.round(nota * k)}</span>
      </div>
      <div class="duelo__pista" aria-hidden="true">
        <i style={{ width: `${alvo * k}%`, background: corDaNota(nota) }} />
      </div>
    </div>
  );
}
