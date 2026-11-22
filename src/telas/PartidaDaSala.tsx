// A partida na sala (docs/spec.md, parte 9, itens 9 a 11 e 20 a 21). A sala
// (Durable Object) roda as regras e manda a cada celular só a sua carta; esta
// tela desenha a fila (src/multiplayer/fila.ts) com as mesmas peças do modo
// solo: Placar em cabo de guerra, Carta, Duelo, Fim, som e vibração. No lugar
// de "computador", o Apelido da outra pessoa.
import { useEffect, useState } from "preact/hooks";
import type { FilaDaPartida } from "../multiplayer/fila";
import { resultadoDoFim, type ChaveAtributo } from "../regras";
import type { PartidaVista } from "../sala/protocolo";
import { BotaoSom } from "./BotaoSom";
import { cartaPeloCodigo } from "./doBaralho";
import { Duelo } from "./Duelo";
import { motivoDoFim, tituloDoFim } from "./Fim";
import { nomeDoApelido } from "./mesa";
import type { AoMomento } from "./momentos";
import { Placar } from "./Placar";
import { AvisoDeQueda, BotaoCutucar, MenuDaSala, TEXTO_DE_FORA, type ControlesDaSala } from "./QuedaNaSala";
import { EscolhaDoOutro, OutroEscolhendo, VezDeVoce } from "./Vez";

interface Props {
  fila: FilaDaPartida;
  /** Aviso de rede no topo ("Reconectando…"), ou `null`. */
  aviso: string | null;
  aoEscolher: (atributo: ChaveAtributo) => void;
  /** "Próxima rodada": a fila anda. */
  aoAvancar: () => void;
  /** "Sair" na tela de fim. */
  aoSair: () => void;
  /** Queda de rede, Tirar, Cutucar e o menu ☰ (src/telas/QuedaNaSala.tsx). */
  controles: ControlesDaSala;
  aoMomento?: AoMomento;
}

export function PartidaDaSala({ fila, aviso, aoEscolher, aoAvancar, aoSair, controles, aoMomento }: Props) {
  // Quem não escolheu toca em "Mostrar cartas!" para ver o duelo da rodada.
  const [mostrada, setMostrada] = useState<number | null>(null);
  const { vista, duelo } = fila;

  if (vista === null) {
    return (
      <div class="tela">
        <main class="sala">
          <p class="sala__aviso">A partida vai começar…</p>
        </main>
      </div>
    );
  }

  if (duelo === null && vista.fim) return <FimDaSala vista={vista} aoSair={aoSair} aoMomento={aoMomento} />;

  const nomes = vista.pessoas.map((p) => nomeDoApelido(p.apelido));
  const { voce } = vista;
  // A vista é a partida de antes do duelo: o placar só anda depois de "Próxima rodada".
  const suaCarta = vista.suaCarta === null ? null : cartaPeloCodigo(vista.suaCarta);
  // Saiu da partida (ou ficou sem cartas) e continua na sala: só olhando.
  const deFora = vista.pessoas[voce].fora !== null;
  const parada = controles.esperando.length > 0;

  let conteudo;
  if (duelo && (duelo.evento.quemEscolheu === voce || mostrada === duelo.evento.rodada)) {
    conteudo = (
      <Duelo
        key={duelo.evento.rodada}
        evento={duelo.evento}
        voce={voce}
        nomes={nomes}
        aoProximaRodada={aoAvancar}
        aoMomento={aoMomento}
      />
    );
  } else if (duelo) {
    conteudo = (
      <EscolhaDoOutro
        carta={suaCarta}
        atributo={duelo.evento.atributo}
        sujeito={nomes[duelo.evento.quemEscolheu].sujeito}
        aoMostrar={() => setMostrada(duelo.evento.rodada)}
      />
    );
  } else if (vista.quemEscolhe === voce) {
    conteudo = (
      <VezDeVoce
        // Parar e voltar a partida recomeça a escolha (um toque mandado na parada não vale).
        key={`${vista.rodada}-${parada}`}
        bloqueada={parada}
        carta={suaCarta!}
        aoTocar={() => aoMomento?.({ tipo: "escolha" })}
        aoEscolher={aoEscolher}
      />
    );
  } else {
    conteudo = <OutroEscolhendo carta={suaCarta} sujeito={nomes[vista.quemEscolhe].sujeito} />;
  }

  return (
    <div class="tela partida">
      <div class="partida__topo">
        <BotaoSom />
        {!vista.fim && <MenuDaSala {...controles} deFora={deFora} />}
      </div>
      {aviso && <p class="amigos__aviso">{aviso}</p>}
      <AvisoDeQueda {...controles} />
      {deFora && <p class="de-fora">{TEXTO_DE_FORA}</p>}
      <Placar
        voce={vista.pessoas[voce].cartas}
        empate={vista.monteDeEmpate}
        outros={vista.pessoas.flatMap((p, i) => (i === voce ? [] : [{ nome: p.apelido, cartas: p.cartas }]))}
        rodada={vista.rodada}
        limite={vista.limiteDeRodadas}
      />
      {conteudo}
      {controles.podeCutucar && !duelo && vista.quemEscolhe !== voce && <BotaoCutucar {...controles} />}
    </div>
  );
}

interface FimDaSalaProps {
  vista: PartidaVista;
  aoSair: () => void;
  aoMomento?: AoMomento;
}

/**
 * O fim na sala (spec, itens 20 e 21): quem ganhou e todas as pessoas, em ordem
 * de cartas no monte, e quem saiu no meio no fim, com "saiu". "Jogar de novo"
 * (só o Anfitrião) é o ticket #41.
 */
function FimDaSala({ vista, aoSair, aoMomento }: FimDaSalaProps) {
  const fim = vista.fim!;
  const nomes = vista.pessoas.map((p) => nomeDoApelido(p.apelido));
  useEffect(() => {
    aoMomento?.({ tipo: "fim", resultado: resultadoDoFim(fim, vista.voce) });
  }, []);
  // Em ordem de cartas; quem saiu no meio fica no fim, com "saiu" (spec, item 20).
  const ordem = vista.pessoas
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => Number(a.fora === "saiu") - Number(b.fora === "saiu") || b.cartas - a.cartas);
  return (
    <div class="tela">
      <main class="fim">
        <h1 class="fim__titulo">{tituloDoFim(fim, vista.voce, nomes)}</h1>
        <p>{motivoDoFim(fim, vista.voce, nomes)}</p>
        {vista.monteDeEmpate > 0 && <p>As {vista.monteDeEmpate} cartas do monte de empate não contam.</p>}
        <ol class="sala__pessoas" aria-label="Cartas no monte">
          {ordem.map((p) => (
            <li key={p.i} class="sala__pessoa">
              <span class="sala__apelido">{p.apelido}</span>
              {p.i === vista.voce && <span class="sala__marca">você</span>}
              {p.fora === "saiu" ? <span class="sala__cartas">saiu</span> : <span class="sala__cartas">{p.cartas} cartas</span>}
            </li>
          ))}
        </ol>
        <p>Rodadas jogadas: {fim.rodadasJogadas}</p>
        <button type="button" class="botao botao--secundario" onClick={aoSair}>
          Sair
        </button>
      </main>
    </div>
  );
}
