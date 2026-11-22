// A partida na sala (docs/spec.md, parte 9, itens 9 a 11 e 20 a 21). A sala
// (Durable Object) roda as regras e manda a cada celular só a sua carta; esta
// tela desenha a fila (src/multiplayer/fila.ts) com as mesmas peças do modo
// solo: Placar, Carta, Duelo, Fim, som e vibração. No lugar de "computador", o
// Apelido das outras pessoas. Quem está De fora (saiu, caiu de vez ou ficou sem
// cartas) continua vendo as rodadas, sem carta própria (itens 14 a 19).
import { useEffect, useState } from "preact/hooks";
import type { FilaDaPartida } from "../multiplayer/fila";
import { ordemDoFim, resultadoDoFim, type ChaveAtributo } from "../regras";
import type { PartidaVista } from "../sala/protocolo";
import { COMECA_COM } from "./amigos";
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
  /** "Jogar de novo" na tela de fim: só para o Anfitrião (`null` para as outras pessoas). */
  jogarDeNovo: JogarDeNovo | null;
  /** Queda de rede, Tirar, Cutucar e o menu ☰ (src/telas/QuedaNaSala.tsx). */
  controles: ControlesDaSala;
  aoMomento?: AoMomento;
}

interface JogarDeNovo {
  /** A sala tem de 2 a 4 pessoas. */
  pode: boolean;
  aoJogar: () => void;
}

export function PartidaDaSala({ fila, aviso, aoEscolher, aoAvancar, aoSair, jogarDeNovo, controles, aoMomento }: Props) {
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

  if (duelo === null && vista.fim) {
    return <FimDaSala vista={vista} aoSair={aoSair} jogarDeNovo={jogarDeNovo} aoMomento={aoMomento} />;
  }

  const nomes = vista.pessoas.map((p) => nomeDoApelido(p.apelido));
  const { voce } = vista;
  // A vista é a partida de antes do duelo: o placar só anda depois de "Próxima rodada".
  const suaCarta = vista.suaCarta === null ? null : cartaPeloCodigo(vista.suaCarta);
  // Saiu da partida (ou ficou sem cartas) e continua na sala: só olhando.
  const deFora = vista.pessoas[voce].fora !== null;
  const parada = controles.semRede.length > 0;

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
  jogarDeNovo: JogarDeNovo | null;
  aoMomento?: AoMomento;
}

/**
 * O fim na sala (spec, itens 20, 21 e 23): quem ganhou e todas as pessoas, em
 * ordem de cartas no monte; quem saiu da partida no fim, com "saiu". O
 * Anfitrião vê "Jogar de novo"; todo mundo vê "Sair".
 */
function FimDaSala({ vista, aoSair, jogarDeNovo, aoMomento }: FimDaSalaProps) {
  const fim = vista.fim!;
  const nomes = vista.pessoas.map((p) => nomeDoApelido(p.apelido));
  useEffect(() => {
    aoMomento?.({ tipo: "fim", resultado: resultadoDoFim(fim, vista.voce) });
  }, []);
  const ordem = ordemDoFim(vista.pessoas).map((i) => ({ ...vista.pessoas[i], i }));
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
              <span class="sala__cartas">{p.fora === "saiu" ? "saiu" : `${p.cartas} cartas`}</span>
            </li>
          ))}
        </ol>
        <p>Rodadas jogadas: {fim.rodadasJogadas}</p>
        {jogarDeNovo && (
          <>
            <button type="button" class="botao" disabled={!jogarDeNovo.pode} onClick={jogarDeNovo.aoJogar}>
              Jogar de novo
            </button>
            {!jogarDeNovo.pode && <p class="sala__aviso">{COMECA_COM}</p>}
          </>
        )}
        <button type="button" class="botao botao--secundario" onClick={aoSair}>
          Sair
        </button>
      </main>
    </div>
  );
}
