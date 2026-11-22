// Tela da sala (docs/spec.md, parte 9, itens 5 a 8): o código grande, "Mandar
// link", a lista na Ordem da mesa e "Começar" (só o Anfitrião). Com a partida
// começada, a tela é a da partida (PartidaDaSala), até a próxima. A sala decide tudo
// (src/sala/sala.ts); esta tela mostra o que ela manda.
import { useEffect, useState } from "preact/hooks";
import { useSala, type EntradaNaSala } from "../multiplayer/conexao";
import { rodadaDaSuaVez } from "../multiplayer/fila";
import { COMECA_COM, MOTIVO_DA_RECUSA, PRECISA_DE_INTERNET } from "./amigos";
import { caminhoDaSala } from "./enderecoDaSala";
import { PartidaDaSala } from "./PartidaDaSala";
import "./Sala.css";
import { sentir } from "./sensacao";
import { vibrar } from "./vibracao";

/** A vibração da cutucada: três toques curtos. */
const PADRAO_DA_CUTUCADA = [150, 80, 150, 80, 150];

interface Props {
  entrada: EntradaNaSala;
  aoSair: () => void;
  aoCriarSala: () => void;
}

/** Abre o menu de compartilhar do celular; sem ele, copia o link. Devolve o aviso a mostrar. */
async function mandarLink(codigo: string): Promise<string | null> {
  const url = new URL(caminhoDaSala(codigo), location.origin).href;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Super Trunfo Ciclismo", url });
    } catch {
      // A pessoa fechou o menu: nada a fazer.
    }
    return null;
  }
  try {
    await navigator.clipboard.writeText(url);
    return "Link copiado";
  } catch {
    return url;
  }
}

export function TelaDaSala({ entrada, aoSair, aoCriarSala }: Props) {
  const { codigo } = entrada;
  const { online, situacao, enviar, fila, avancarFila, cutucadas } = useSala(entrada);
  const [avisoDoLink, setAvisoDoLink] = useState<string | null>(null);

  // Alguém cutucou você (spec, item 16): o celular vibra (só no Android).
  useEffect(() => {
    if (cutucadas > 0) vibrar(PADRAO_DA_CUTUCADA);
  }, [cutucadas]);

  // Chegou a sua vez na tela (depois do seu "Próxima rodada"): a sala conta o
  // tempo do Cutucar daqui (spec, item 16). Manda de novo ao reconectar.
  const conectado = situacao.tipo === "naSala" && situacao.conectado;
  const suaVez = rodadaDaSuaVez(fila);
  useEffect(() => {
    if (conectado && suaVez !== null) enviar({ tipo: "naVez", rodada: suaVez });
  }, [conectado, suaVez]);

  if (situacao.tipo === "recusada") {
    return (
      <div class="tela">
        <main class="inicio">
          <p class="amigos__sala">Sala {codigo}</p>
          <h1 class="amigos__recusa">{MOTIVO_DA_RECUSA[situacao.motivo]}</h1>
          {situacao.motivo === "acabou" && (
            <button type="button" class="botao" onClick={aoCriarSala}>
              Criar sala
            </button>
          )}
          <button type="button" class="botao botao--secundario" onClick={aoSair}>
            Voltar ao início
          </button>
        </main>
      </div>
    );
  }

  const sala = situacao.tipo === "naSala" ? situacao.sala : null;
  const souAnfitriao = sala !== null && sala.voce === sala.anfitriao;
  const podeComecar = sala !== null && sala.podeComecar;
  const semConexao = !online || (situacao.tipo === "naSala" && !conectado);
  const avisoDeRede = semConexao ? (online ? "Reconectando…" : PRECISA_DE_INTERNET) : null;
  const sair = () => {
    enviar({ tipo: "sair" });
    aoSair();
  };

  // Quem jogou (ou olhou) a última partida fica nela, e no fim dela, até o
  // Anfitrião tocar em "Jogar de novo". Quem entrou entre partidas vê a sala.
  if (sala && (sala.emPartida || fila.vista !== null)) {
    return (
      <PartidaDaSala
        fila={fila}
        aviso={avisoDeRede}
        aoEscolher={(atributo) => enviar({ tipo: "escolher", atributo })}
        aoAvancar={avancarFila}
        aoSair={sair}
        jogarDeNovo={souAnfitriao ? { pode: podeComecar, aoJogar: () => enviar({ tipo: "comecar" }) } : null}
        controles={{
          semRede: sala.semRede.map((indice) => sala.pessoas[indice]),
          souAnfitriao,
          podeCutucar: sala.podeCutucar,
          aoTirar: (numero) => enviar({ tipo: "tirar", numero }),
          aoCutucar: () => enviar({ tipo: "cutucar" }),
          aoSairDaPartida: () => enviar({ tipo: "sair" }),
          aoSairDaSala: sair,
        }}
        aoMomento={sentir}
      />
    );
  }

  return (
    <div class="tela">
      <main class="sala">
        <p class="sala__rotulo">Código da sala</p>
        <p class="sala__codigo" aria-label={`Código da sala: ${codigo}`}>
          {codigo}
        </p>
        <button
          type="button"
          class="botao botao--secundario"
          onClick={async () => setAvisoDoLink(await mandarLink(codigo))}
        >
          Mandar link
        </button>
        {avisoDoLink && <p class="sala__aviso">{avisoDoLink}</p>}

        {avisoDeRede && <p class="amigos__aviso">{avisoDeRede}</p>}

        {sala === null ? (
          <p class="sala__aviso">Conectando…</p>
        ) : (
          <>
            <ol class="sala__pessoas" aria-label="Pessoas na sala">
              {sala.pessoas.map((pessoa, indice) => (
                <li key={indice} class={`sala__pessoa${pessoa.conectada ? "" : " sala__pessoa--sem-conexao"}`}>
                  <span class="sala__apelido">{pessoa.apelido}</span>
                  {indice === sala.voce && <span class="sala__marca">você</span>}
                  {indice === sala.anfitriao && <span class="sala__marca">Anfitrião</span>}
                </li>
              ))}
            </ol>
            {souAnfitriao ? (
              <>
                <button type="button" class="botao" disabled={!podeComecar} onClick={() => enviar({ tipo: "comecar" })}>
                  Começar
                </button>
                {!podeComecar && <p class="sala__aviso">{COMECA_COM}</p>}
              </>
            ) : (
              <p class="sala__aviso">Esperando o Anfitrião começar…</p>
            )}
          </>
        )}
        <button type="button" class="botao botao--secundario" onClick={sair}>
          Sair
        </button>
      </main>
    </div>
  );
}
