// Rodadas da partida solo. A carta tem o visual da parte 5 da spec; o resto
// é simples (o visual de verdade vem no ticket 25). A tela só manda ações e
// desenha o estado e os eventos.
import { useState } from "preact/hooks";
import baralho from "../dados/baralho.json";
import {
  aplicar,
  atributoDoComputador,
  cartaDeCima,
  type Acao,
  type Carta as CartaDasRegras,
  type ChaveAtributo,
  type Estado,
  type Evento,
} from "../regras";
import { Carta } from "./Carta";

// No modo solo, a Ordem da mesa é: você, depois o Computador.
const VOCE = 0;
const COMPUTADOR = 1;

const NOME_DO_ATRIBUTO = Object.fromEntries(baralho.atributos.map((a) => [a.chave, a.nome])) as Record<
  ChaveAtributo,
  string
>;

type EventoDaRodada = Extract<Evento, { tipo: "rodada" }>;

interface Props {
  inicial: Estado;
  aoTerminar: (estado: Estado) => void;
}

export function Partida({ inicial, aoTerminar }: Props) {
  const [estado, setEstado] = useState(inicial);
  const [resultado, setResultado] = useState<EventoDaRodada | null>(null);

  function mandar(acao: Acao) {
    const r = aplicar(estado, acao);
    setEstado(r.estado);
    setResultado(r.eventos.find((e): e is EventoDaRodada => e.tipo === "rodada") ?? null);
  }

  function proximaRodada() {
    setResultado(null);
    if (estado.fim) aoTerminar(estado);
  }

  return (
    <div class="tela partida">
      <Placar estado={estado} />
      {resultado ? (
        <Resultado evento={resultado} aoSeguir={proximaRodada} />
      ) : estado.quemEscolhe === VOCE ? (
        <VezDeVoce carta={cartaDeCima(estado, VOCE)!} aoEscolher={(atributo) => mandar({ tipo: "escolher", pessoa: VOCE, atributo })} />
      ) : (
        <VezDoComputador
          carta={cartaDeCima(estado, VOCE)!}
          atributo={atributoDoComputador(estado)!}
          aoCorrer={() => mandar({ tipo: "computadorEscolhe" })}
        />
      )}
    </div>
  );
}

function Placar({ estado }: { estado: Estado }) {
  const empate = estado.monteDeEmpate.length;
  return (
    <header class="placar">
      <span>
        Você {estado.pessoas[VOCE].monte.length} × {estado.pessoas[COMPUTADOR].monte.length} Computador
        {empate > 0 && ` · ${empate} no empate`}
      </span>
      <span>
        Rodada {estado.rodada}/{estado.limiteDeRodadas}
      </span>
    </header>
  );
}

function VezDeVoce({ carta, aoEscolher }: { carta: CartaDasRegras; aoEscolher: (a: ChaveAtributo) => void }) {
  const [marcado, setMarcado] = useState<ChaveAtributo | null>(null);
  // 2 toques na mesma linha: o 1º marca, o 2º envia. Tocar em outra linha troca a marcação.
  function tocar(atributo: ChaveAtributo) {
    if (marcado === atributo) aoEscolher(atributo);
    else setMarcado(atributo);
  }
  return (
    <main class="rodada">
      <p class="rodada__aviso">Sua vez: escolha um atributo.</p>
      <Carta carta={carta} marcado={marcado} aoTocar={tocar} rotulo={`Sua carta: ${carta.nome}`} />
    </main>
  );
}

function VezDoComputador({ carta, atributo, aoCorrer }: { carta: CartaDasRegras; atributo: ChaveAtributo; aoCorrer: () => void }) {
  return (
    <main class="rodada">
      <p class="rodada__aviso">O computador escolheu {NOME_DO_ATRIBUTO[atributo]}.</p>
      <Carta carta={carta} marcado={atributo} rotulo={`Sua carta: ${carta.nome}`} />
      <button type="button" class="botao" onClick={aoCorrer}>
        Correr!
      </button>
    </main>
  );
}

function Resultado({ evento, aoSeguir }: { evento: EventoDaRodada; aoSeguir: () => void }) {
  const voce = evento.mesa.find((m) => m.pessoa === VOCE);
  const computador = evento.mesa.find((m) => m.pessoa === COMPUTADOR);
  const titulo =
    evento.vencedor === VOCE ? "Você ganhou a rodada!" : evento.vencedor === COMPUTADOR ? "O computador ganhou." : "Empate!";
  const detalhe =
    evento.vencedor === null
      ? "As cartas vão para o monte de empate."
      : `${evento.vencedor === VOCE ? "Você leva" : "O computador leva"} ${evento.cartasLevadas} cartas.`;
  return (
    <main class="resultado" aria-live="polite">
      <p class="resultado__etapa">{NOME_DO_ATRIBUTO[evento.atributo]}</p>
      <p>
        Você: {voce?.nota ?? "—"} · Computador: {computador?.nota ?? "—"}
      </p>
      <h2 class="resultado__titulo">{titulo}</h2>
      <p>{detalhe}</p>
      <button type="button" class="botao" onClick={aoSeguir}>
        Próxima rodada
      </button>
    </main>
  );
}
