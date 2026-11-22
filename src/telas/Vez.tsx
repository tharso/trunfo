// A rodada antes do duelo (docs/spec.md, partes 5, 6 e 9): só a sua carta na
// tela. Serve ao modo solo e à sala.
// - Sua vez: 2 toques na linha.
// - A outra pessoa escolheu: a linha marcada, "Ana escolheu Montanha." e "Mostrar cartas!".
// - A outra pessoa está escolhendo (só na sala): "Ana está escolhendo…".
import { useState } from "preact/hooks";
import type { Carta as CartaDasRegras, ChaveAtributo } from "../regras";
import { Carta } from "./Carta";
import { NOME_DO_ATRIBUTO } from "./doBaralho";
import { selo } from "./Selos";

interface VezDeVoceProps {
  carta: CartaDasRegras;
  aoTocar: () => void;
  aoEscolher: (a: ChaveAtributo) => void;
}

export function VezDeVoce({ carta, aoTocar, aoEscolher }: VezDeVoceProps) {
  const [marcado, setMarcado] = useState<ChaveAtributo | null>(null);
  // Na sala, o duelo chega pela rede: depois de escolher, a carta não aceita outro toque.
  const [escolhido, setEscolhido] = useState(false);
  // 2 toques na mesma linha: o 1º marca, o 2º envia. Tocar em outra linha troca a marcação.
  function tocar(atributo: ChaveAtributo) {
    if (escolhido) return;
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

interface EscolhaDoOutroProps {
  carta: CartaDasRegras;
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
      <Carta carta={carta} marcado={atributo} selo={selo(carta)} rotulo={`Sua carta: ${carta.nome}`} />
      <button type="button" class="botao" onClick={aoMostrar}>
        Mostrar cartas!
      </button>
    </main>
  );
}

export function OutroEscolhendo({ carta, sujeito }: { carta: CartaDasRegras; sujeito: string }) {
  return (
    <main class="rodada">
      <p class="rodada__aviso" aria-live="polite">
        {sujeito} está escolhendo…
      </p>
      <Carta carta={carta} marcado={null} selo={selo(carta)} rotulo={`Sua carta: ${carta.nome}`} />
    </main>
  );
}
