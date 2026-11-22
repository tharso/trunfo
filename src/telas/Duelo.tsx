// Tela do duelo (docs/spec.md, partes 6 e 7). Fundo escuro, ocupa a janela.
// Tempo (~3 s): a sua barra cresce (1,2 s) com o número contando, depois as das
// outras pessoas, juntas (1,2 s); pausa (0,35 s); aparecem o resultado e os botões.
// Serve ao modo solo (contra o Computador) e à sala (contra os Apelidos): quem é
// quem vem de `voce` e `nomes`. Com 3 ou 4 pessoas (spec, parte 9, item 12), uma
// faixa por pessoa da mesa, com o Apelido, mais baixas para caber no celular.
// "Pular ⏩" ou um toque em qualquer lugar vai direto ao resultado.
// A rodada já foi decidida pelo módulo de regras: o duelo só mostra o evento.
import { useEffect, useRef, useState } from "preact/hooks";
import { resultadoDoVencedor, type Carta as CartaDasRegras, type EventoDaRodada } from "../regras";
import { Carta, TEXTO_DA_ETAPA } from "./Carta";
import { corDaNota } from "./cores";
import { aparencia, cartaPeloCodigo, NOME_DO_ATRIBUTO } from "./doBaralho";
import type { NomeNaTela } from "./mesa";
import type { AoMomento } from "./momentos";
import { selo, textoDoMotivo } from "./Selos";

const BARRA_MS = 1200;
const PAUSA_MS = 350;
const TOTAL_MS = 2 * BARRA_MS + PAUSA_MS;

/** O título do resultado. Quem perdeu vê quem ganhou: "O computador ganhou.", "Ana ganhou.". */
function titulo(evento: EventoDaRodada, voce: number, nomes: NomeNaTela[]): string {
  const resultado = resultadoDoVencedor(evento.vencedor, voce);
  if (resultado === "vitoria") return "Você ganhou a rodada!";
  if (resultado === "empate") return "Empate!";
  return `${nomes[evento.vencedor!].sujeito} ganhou.`;
}

interface Props {
  evento: EventoDaRodada;
  /** Quem olha: o índice da pessoa na mesa. */
  voce: number;
  /** Os nomes da mesa, na Ordem da mesa. */
  nomes: NomeNaTela[];
  aoProximaRodada: () => void;
  /** Gancho para som e vibração (ticket 28): largada, barras subindo e resultado. */
  aoMomento?: AoMomento;
}

/** Sai rápido e chega devagar, como o protótipo. */
function suave(progresso: number): number {
  const limitado = Math.min(1, Math.max(0, progresso));
  return 1 - (1 - limitado) ** 3;
}

export function Duelo({ evento, voce, nomes, aoProximaRodada, aoMomento }: Props) {
  const [tempo, setTempo] = useState(0);
  const [verCartas, setVerCartas] = useState(false);
  const pulou = useRef(false);
  const momento = useRef(aoMomento);
  momento.current = aoMomento;
  const proxima = useRef<HTMLButtonElement>(null);

  const pronto = tempo >= TOTAL_MS;
  const outrosCorrendo = tempo >= BARRA_MS;

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
    if (outrosCorrendo && !pronto) momento.current?.({ tipo: "barra", duracaoMs: BARRA_MS });
  }, [outrosCorrendo]);

  useEffect(() => {
    if (!pronto) return;
    momento.current?.({ tipo: "resultado", resultado: resultadoDoVencedor(evento.vencedor, voce) });
    proxima.current?.focus();
  }, [pronto]);

  function pular() {
    if (pronto) return;
    pulou.current = true;
    setTempo(TOTAL_MS);
  }

  const etapa = TEXTO_DA_ETAPA[evento.atributo];
  const quemEscolheu = evento.quemEscolheu === voce ? "Você escolheu" : `${nomes[evento.quemEscolheu].sujeito} escolheu`;
  // As cartas da mesa, a sua primeira; as outras na Ordem da mesa.
  const mesa = [...evento.mesa]
    .sort((a, b) => Number(b.pessoa === voce) - Number(a.pessoa === voce))
    .map((m) => ({ ...m, carta: cartaPeloCodigo(m.codigo) }));
  const rotulo = (pessoa: number, carta: CartaDasRegras) =>
    `${pessoa === voce ? "Sua carta" : `Carta ${nomes[pessoa].de}`}: ${carta.nome}`;

  // Com 3 ou 4 cartas na mesa, as faixas ficam mais baixas e o botão não diz "duas".
  const mesaCheia = mesa.length > 2;

  if (verCartas) {
    return (
      <div class="duelo" role="dialog" aria-modal="true" aria-label="Duelo">
        <div class="duelo__conteudo">
          <h2 class="duelo__etapa">{etapa}</h2>
          <div class="duelo__cartas">
            {mesa.map(({ pessoa, carta }) => (
              <Carta key={pessoa} carta={carta} marcado={evento.atributo} selo={selo(carta)} rotulo={rotulo(pessoa, carta)} />
            ))}
          </div>
          <button type="button" class="botao botao--secundario" onClick={() => setVerCartas(false)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // O motivo (Super Trunfo, Carta A, monte de empate) vem do evento `rodada` (ticket 23).
  const motivo = textoDoMotivo(evento);
  const leva =
    evento.vencedor === null
      ? null
      : `${evento.vencedor === voce ? "Você leva" : `${nomes[evento.vencedor].sujeito} leva`} ${evento.cartasLevadas} cartas.`;

  return (
    <div
      class={`duelo${pronto ? " duelo--pronto" : ""}${mesaCheia ? " duelo--mesa-cheia" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Duelo"
      onClick={pular}
    >
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
        {mesa.map(({ pessoa, carta, nota }) => (
          <Faixa
            key={pessoa}
            carta={carta}
            quem={pessoa === voce ? "Você" : nomes[pessoa].nome}
            nota={nota}
            evento={evento}
            pessoa={pessoa}
            // A sua barra cresce primeiro; as das outras pessoas, juntas, depois.
            crescimento={suave((pessoa === voce ? tempo : tempo - BARRA_MS) / BARRA_MS)}
            pronto={pronto}
          />
        ))}
        {!pronto && <p class="duelo__dica">toque na tela para pular</p>}
        <div class="duelo__resultado" aria-live="polite">
          {pronto && (
            <>
              <h3 class="duelo__titulo">{titulo(evento, voce, nomes)}</h3>
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
            {mesaCheia ? "Ver as cartas" : "Ver as duas cartas"}
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
  nota: number;
  evento: EventoDaRodada;
  /** Quanto a barra já cresceu, de 0 a 1. */
  crescimento: number;
  pronto: boolean;
}

function Faixa({ carta, quem, pessoa, nota, evento, crescimento, pronto }: FaixaProps) {
  const { cores, iniciais } = aparencia(carta);
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
        <span class="duelo__nomes">
          {carta.nome}
          <span class="duelo__pessoa">{quem}</span>
        </span>
        <span class="duelo__nota">{Math.round(nota * crescimento)}</span>
      </div>
      <div class="duelo__pista" aria-hidden="true">
        <i style={{ width: `${alvo * crescimento}%`, background: corDaNota(nota) }} />
      </div>
    </div>
  );
}
