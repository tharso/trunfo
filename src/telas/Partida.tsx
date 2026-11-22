// Rodadas da partida solo (docs/spec.md, partes 6 e 7): placar em cabo de
// guerra no topo, só a sua carta na tela; a escolha abre o Duelo. A tela só
// manda ações ao módulo de regras e desenha o estado e os eventos.
import { useState } from "preact/hooks";
import { aplicar, atributoDoComputador, cartaDeCima, type Acao, type Estado, type EventoDaRodada } from "../regras";
import { BotaoSom } from "./BotaoSom";
import { Duelo } from "./Duelo";
import { MenuPartida } from "./MenuPartida";
import type { AoMomento } from "./momentos";
import { Placar } from "./Placar";
import { COMPUTADOR, NOMES_DO_SOLO, VOCE } from "./solo";
import { EscolhaDoOutro, VezDeVoce } from "./Vez";

/** O duelo em curso: o evento da rodada e o estado de antes dela (o placar só anda depois de "Próxima rodada"). */
interface DueloEmCurso {
  evento: EventoDaRodada;
  antes: Estado;
}

interface Props {
  inicial: Estado;
  aoTerminar: (estado: Estado) => void;
  /** Gancho para som e vibração (ticket 28). */
  aoMomento?: AoMomento;
  /** Depois de cada rodada, com o estado novo (o App guarda a partida). */
  aoMudar: (estado: Estado) => void;
  /** "Sair" no menu ☰, com o estado atual. */
  aoSair: (estado: Estado) => void;
}

export function Partida({ inicial, aoTerminar, aoMomento, aoMudar, aoSair }: Props) {
  const [estado, setEstado] = useState(inicial);
  const [duelo, setDuelo] = useState<DueloEmCurso | null>(null);

  function mandar(acao: Acao) {
    const r = aplicar(estado, acao);
    const evento = r.eventos.find((e): e is EventoDaRodada => e.tipo === "rodada");
    setEstado(r.estado);
    aoMudar(r.estado);
    if (evento) setDuelo({ evento, antes: estado });
    else if (r.estado.fim) aoTerminar(r.estado);
  }

  function proximaRodada() {
    setDuelo(null);
    if (estado.fim) aoTerminar(estado);
  }

  // Durante o duelo, o placar mostra o estado de antes da rodada.
  const noPlacar = duelo?.antes ?? estado;

  return (
    <div class="tela partida">
      <div class="partida__topo">
        <BotaoSom />
        <MenuPartida aoSair={() => aoSair(estado)} />
      </div>
      <Placar
        voce={noPlacar.pessoas[VOCE].monte.length}
        empate={noPlacar.monteDeEmpate.length}
        outros={[{ nome: NOMES_DO_SOLO[COMPUTADOR].nome, cartas: noPlacar.pessoas[COMPUTADOR].monte.length }]}
        rodada={noPlacar.rodada}
        limite={noPlacar.limiteDeRodadas}
      />
      {duelo ? (
        <Duelo
          key={duelo.evento.rodada}
          evento={duelo.evento}
          voce={VOCE}
          nomes={NOMES_DO_SOLO}
          aoProximaRodada={proximaRodada}
          aoMomento={aoMomento}
        />
      ) : estado.quemEscolhe === VOCE ? (
        <VezDeVoce
          key={estado.rodada}
          carta={cartaDeCima(estado, VOCE)!}
          aoTocar={() => aoMomento?.({ tipo: "escolha" })}
          aoEscolher={(atributo) => mandar({ tipo: "escolher", pessoa: VOCE, atributo })}
        />
      ) : (
        <EscolhaDoOutro
          carta={cartaDeCima(estado, VOCE)!}
          atributo={atributoDoComputador(estado)!}
          sujeito={NOMES_DO_SOLO[COMPUTADOR].sujeito}
          aoMostrar={() => mandar({ tipo: "computadorEscolhe" })}
        />
      )}
    </div>
  );
}
