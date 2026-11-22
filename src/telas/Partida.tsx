// Rodadas da partida solo, num visual simples (o visual de verdade vem nos
// tickets 24 e 25). A tela só manda ações e desenha o estado e os eventos.
import { useState } from "preact/hooks";
import baralho from "../dados/baralho.json";
import {
  ATRIBUTOS,
  aplicar,
  atributoDoComputador,
  cartaDeCima,
  type Acao,
  type Carta,
  type ChaveAtributo,
  type Estado,
  type Evento,
} from "../regras";
import { Selos, textoDoMotivo } from "./Selos";

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

function VezDeVoce({ carta, aoEscolher }: { carta: Carta; aoEscolher: (a: ChaveAtributo) => void }) {
  const [marcado, setMarcado] = useState<ChaveAtributo | null>(null);
  // 2 toques na mesma linha: o 1º marca, o 2º envia. Tocar em outra linha troca a marcação.
  function tocar(atributo: ChaveAtributo) {
    if (marcado === atributo) aoEscolher(atributo);
    else setMarcado(atributo);
  }
  return (
    <main class="rodada">
      <p class="rodada__aviso">Sua vez: escolha um atributo.</p>
      <CartaSimples carta={carta} marcado={marcado} aoTocar={tocar} />
    </main>
  );
}

function VezDoComputador({ carta, atributo, aoCorrer }: { carta: Carta; atributo: ChaveAtributo; aoCorrer: () => void }) {
  return (
    <main class="rodada">
      <p class="rodada__aviso">O computador escolheu {NOME_DO_ATRIBUTO[atributo]}.</p>
      <CartaSimples carta={carta} marcado={atributo} />
      <button type="button" class="botao" onClick={aoCorrer}>
        Correr!
      </button>
    </main>
  );
}

function CartaSimples({
  carta,
  marcado,
  aoTocar,
}: {
  carta: Carta;
  marcado: ChaveAtributo | null;
  aoTocar?: (a: ChaveAtributo) => void;
}) {
  return (
    <section class="carta" aria-label={`Sua carta: ${carta.nome}`}>
      <h2 class="carta__nome">{carta.nome}</h2>
      <Selos carta={carta} />
      <ul class="carta__linhas">
        {ATRIBUTOS.map((atributo) => (
          <li key={atributo}>
            <button
              type="button"
              class={`carta__linha${marcado === atributo ? " carta__linha--marcada" : ""}`}
              aria-pressed={marcado === atributo}
              disabled={!aoTocar}
              onClick={() => aoTocar?.(atributo)}
            >
              <span>{NOME_DO_ATRIBUTO[atributo]}</span>
              {marcado === atributo && aoTocar && <span class="carta__dica">toque de novo ▶</span>}
              <span class="carta__nota">{carta.notas[atributo]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Resultado({ evento, aoSeguir }: { evento: EventoDaRodada; aoSeguir: () => void }) {
  const voce = evento.mesa.find((m) => m.pessoa === VOCE);
  const computador = evento.mesa.find((m) => m.pessoa === COMPUTADOR);
  const titulo =
    evento.vencedor === VOCE ? "Você ganhou a rodada!" : evento.vencedor === COMPUTADOR ? "O computador ganhou." : "Empate!";
  const motivo = textoDoMotivo(evento);
  const leva =
    evento.vencedor === null
      ? null
      : `${evento.vencedor === VOCE ? "Você leva" : "O computador leva"} ${evento.cartasLevadas} cartas.`;
  return (
    <main class="resultado" aria-live="polite">
      <p class="resultado__etapa">{NOME_DO_ATRIBUTO[evento.atributo]}</p>
      <p>
        Você: {voce?.nota ?? "—"} · Computador: {computador?.nota ?? "—"}
      </p>
      <h2 class="resultado__titulo">{titulo}</h2>
      {motivo && <p class="resultado__motivo">{motivo}</p>}
      {leva && <p>{leva}</p>}
      <button type="button" class="botao" onClick={aoSeguir}>
        Próxima rodada
      </button>
    </main>
  );
}
