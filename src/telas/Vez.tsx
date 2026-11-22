// A rodada antes do duelo (docs/spec.md, partes 5, 6 e 9): só a sua carta na
// tela. Serve ao modo solo e à sala.
// - Sua vez: 2 toques na linha.
// - A outra pessoa escolheu: a linha marcada, "Ana escolheu Montanha." e "Mostrar cartas!".
// - A outra pessoa está escolhendo (só na sala): "Ana está escolhendo…".
// Na sala, quem está De fora (saiu, caiu de vez ou ficou sem cartas com 3 ou 4
// pessoas) continua vendo as rodadas, sem carta: o aviso fica no topo da partida.
import { useState } from "preact/hooks";
import type { Carta as CartaDasRegras, ChaveAtributo } from "../regras";
import { Carta } from "./Carta";
import { NOME_DO_ATRIBUTO } from "./doBaralho";
import { selo } from "./Selos";

interface VezDeVoceProps {
  carta: CartaDasRegras;
  aoTocar: () => void;
  aoEscolher: (a: ChaveAtributo) => void;
  /** Na sala, com a partida parada (alguém caiu): a carta não aceita toque. */
  bloqueada?: boolean;
}

export function VezDeVoce({ carta, aoTocar, aoEscolher, bloqueada = false }: VezDeVoceProps) {
  const [marcado, setMarcado] = useState<ChaveAtributo | null>(null);
  // Na sala, o duelo chega pela rede: depois de escolher, a carta não aceita outro toque.
  const [escolhido, setEscolhido] = useState(false);
  // 2 toques na mesma linha: o 1º marca, o 2º envia. Tocar em outra linha troca a marcação.
  function tocar(atributo: ChaveAtributo) {
    if (escolhido || bloqueada) return;
    aoTocar();
    if (marcado === atributo) {
      setEscolhido(true);
      aoEscolher(atributo);
    } else setMarcado(atributo);
  }
  return (
    <main class="rodada">
      <p class="rodada__aviso">Sua vez: escolha um atributo.</p>
      <Carta carta={carta} marcado={marcado} aoTocar={tocar} selo={selo(carta)} rotulo={`Sua carta: ${carta.nome}`} />
    </main>
  );
}

/** A sua carta de cima; De fora, nada (o texto De fora fica no topo da partida). */
function SuaCarta({ carta, marcado }: { carta: CartaDasRegras | null; marcado: ChaveAtributo | null }) {
  if (carta === null) return null;
  return <Carta carta={carta} marcado={marcado} selo={selo(carta)} rotulo={`Sua carta: ${carta.nome}`} />;
}

interface EscolhaDoOutroProps {
  /** Sua carta; `null` De fora (spec, parte 9, item 19: sem carta própria). */
  carta: CartaDasRegras | null;
  atributo: ChaveAtributo;
  /** Quem escolheu, no começo da frase: "O computador", "Ana". */
  sujeito: string;
  aoMostrar: () => void;
}

export function EscolhaDoOutro({ carta, atributo, sujeito, aoMostrar }: EscolhaDoOutroProps) {
  return (
    <main class="rodada">
      <p class="rodada__aviso">
        {sujeito} escolheu {NOME_DO_ATRIBUTO[atributo]}.
      </p>
      <SuaCarta carta={carta} marcado={atributo} />
      <button type="button" class="botao" onClick={aoMostrar}>
        Mostrar cartas!
      </button>
    </main>
  );
}

/** `carta`: a sua; `null` De fora. */
export function OutroEscolhendo({ carta, sujeito }: { carta: CartaDasRegras | null; sujeito: string }) {
  return (
    <main class="rodada">
      <p class="rodada__aviso" aria-live="polite">
        {sujeito} está escolhendo…
      </p>
      <SuaCarta carta={carta} marcado={null} />
    </main>
  );
}
