// Navegação entre as telas: Início (↔ Como jogar) → Sorteio → Partida → Fim.
// Multiplayer: Início → Jogar com amigos → Apelido → Sala. O link da sala
// (/s/<código>) abre direto no Apelido; se o celular já estava nesta sala (e
// não saiu pelo "Sair"), volta direto para ela.
// A tela não decide regra: cria a partida e manda ações para o módulo de regras.
// O App também guarda no celular (src/armazenamento.ts) a partida solo depois de
// cada rodada e o Retrospecto quando a partida acaba (docs/spec.md, parte 8).
import { useEffect, useState } from "preact/hooks";
import {
  guardarApelido,
  guardarPartida,
  guardarRetrospecto,
  guardarUltimaSala,
  identificadorSecreto,
  lerApelido,
  lerPartida,
  lerRetrospecto,
  lerUltimaSala,
} from "../armazenamento";
import baralho from "../dados/baralho.json";
import { criarSala, type EntradaNaSala } from "../multiplayer/conexao";
import { aplicar, criarPartida, registrarPartida, resultadoDaPartida, type Estado, type Nivel } from "../regras";
import { lerCodigo } from "../sala/codigo";
import { PRECISA_DE_INTERNET } from "./amigos";
import { Apelido } from "./Apelido";
import { caminhoDaSala, codigoDoCaminho } from "./enderecoDaSala";
import { ComoJogar } from "./ComoJogar";
import { Fim } from "./Fim";
import { Inicio } from "./Inicio";
import { JogarComAmigos } from "./JogarComAmigos";
import { Partida } from "./Partida";
import { sentir } from "./sensacao";
import { VOCE } from "./solo";
import { Sorteio } from "./Sorteio";
import { TelaDaSala } from "./TelaDaSala";

type Tela =
  | { nome: "inicio" }
  | { nome: "comoJogar" }
  | { nome: "sorteio"; estado: Estado }
  | { nome: "partida"; estado: Estado }
  | { nome: "fim"; estado: Estado }
  | { nome: "amigos" }
  /** `codigo` é `null` quando a pessoa vai criar a sala. */
  | { nome: "apelido"; codigo: string | null; aviso: string | null }
  | { nome: "sala"; entrada: EntradaNaSala };

/**
 * A primeira tela: o link de uma sala (/s/<código>) vai direto para o Apelido.
 * Se o celular já estava nesta sala e tem Apelido guardado (fechou a aba,
 * recarregou), volta direto para a sala (spec, item 18).
 */
function telaInicial(): Tela {
  const codigo = lerCodigo(codigoDoCaminho(location.pathname) ?? "");
  if (!codigo) return { nome: "inicio" };
  const apelido = lerApelido();
  if (codigo === lerUltimaSala() && apelido !== "") {
    return { nome: "sala", entrada: { codigo, apelido, id: identificadorSecreto() } };
  }
  return { nome: "apelido", codigo, aviso: null };
}

/** O endereço na barra acompanha a sala, para recarregar a página voltar a ela. */
function caminhoDaTela(tela: Tela): string {
  const codigo = tela.nome === "sala" ? tela.entrada.codigo : tela.nome === "apelido" ? tela.codigo : null;
  return codigo ? caminhoDaSala(codigo) : "/";
}

/**
 * A semente da fonte de sorteio. `?semente=123` na URL fixa a partida (o teste
 * Playwright usa isso para jogar sempre a mesma partida). Sem ela, é aleatória.
 */
function semente(): number {
  const daUrl = new URLSearchParams(location.search).get("semente");
  if (daUrl !== null && /^-?\d+$/.test(daUrl)) return Number(daUrl) | 0;
  return (Math.random() * 2 ** 32) | 0;
}

function novaPartida(nivel: Nivel): Estado {
  return criarPartida({ baralho: baralho.cartas, pessoas: ["humano", "computador"], nivel, semente: semente() });
}

export function App() {
  const [tela, setTela] = useState<Tela>(telaInicial);
  // O Nível escolhido no Início vale para a partida (e para "Jogar de novo").
  const [nivel, setNivel] = useState<Nivel>("facil");
  const [retrospecto, setRetrospecto] = useState(lerRetrospecto);
  // A partida solo que ficou no meio (aba fechada, celular travou...).
  const [guardada, setGuardada] = useState(lerPartida);
  const [apelidoGuardado, setApelidoGuardado] = useState(lerApelido);

  useEffect(() => {
    const caminho = caminhoDaTela(tela);
    if (location.pathname !== caminho) history.replaceState(null, "", caminho);
  }, [tela]);

  /** Depois do Apelido: entra na sala do código, ou cria uma sala nova. */
  async function confirmarApelido(codigo: string | null, apelido: string) {
    guardarApelido(apelido);
    setApelidoGuardado(apelido);
    try {
      const daSala = codigo ?? (await criarSala());
      guardarUltimaSala(daSala);
      setTela({ nome: "sala", entrada: { codigo: daSala, apelido, id: identificadorSecreto() } });
    } catch {
      setTela({ nome: "apelido", codigo, aviso: PRECISA_DE_INTERNET });
    }
  }

  /** Uma partida acabou: soma no Retrospecto e apaga a partida guardada. */
  function registrarFim(estado: Estado) {
    const resultado = resultadoDaPartida(estado, VOCE);
    if (resultado) {
      const novo = registrarPartida(retrospecto, estado.nivel, resultado);
      setRetrospecto(novo);
      guardarRetrospecto(novo);
    }
    setGuardada(null);
    guardarPartida(null);
  }

  /** Depois de cada rodada: guarda a partida, ou registra o fim. */
  function aoMudar(estado: Estado) {
    if (estado.fim) {
      registrarFim(estado);
    } else {
      setGuardada(estado);
      guardarPartida(estado);
    }
  }

  /**
   * Sair no meio (menu ☰ ou "Nova partida" com partida guardada): conta como derrota.
   * Se a partida já acabou (menu aberto no resultado da última rodada), o fim já foi registrado.
   */
  function sair(estado: Estado) {
    if (!estado.fim) registrarFim(aplicar(estado, { tipo: "sair", pessoa: VOCE }).estado);
  }

  /** Partida nova: passa pelo Sorteio. "Continuar" vai direto para a Partida. */
  function jogar() {
    setTela({ nome: "sorteio", estado: novaPartida(nivel) });
  }

  switch (tela.nome) {
    case "inicio":
      return (
        <Inicio
          nivel={nivel}
          retrospecto={retrospecto[nivel]}
          temPartidaGuardada={guardada !== null}
          aoMudarNivel={setNivel}
          aoJogar={jogar}
          aoContinuar={() => guardada && setTela({ nome: "partida", estado: guardada })}
          aoNovaPartida={() => {
            if (guardada) sair(guardada);
            jogar();
          }}
          aoComoJogar={() => setTela({ nome: "comoJogar" })}
          aoJogarComAmigos={() => setTela({ nome: "amigos" })}
        />
      );
    case "comoJogar":
      return <ComoJogar aoVoltar={() => setTela({ nome: "inicio" })} />;
    case "sorteio":
      return <Sorteio estado={tela.estado} aoComecar={() => setTela({ nome: "partida", estado: tela.estado })} />;
    case "partida":
      return (
        <Partida
          inicial={tela.estado}
          aoMudar={aoMudar}
          aoSair={(estado) => {
            sair(estado);
            setTela({ nome: "inicio" });
          }}
          aoTerminar={(estado) => setTela({ nome: "fim", estado })}
          aoMomento={sentir}
        />
      );
    case "fim":
      return (
        <Fim
          estado={tela.estado}
          aoJogarDeNovo={jogar}
          aoVoltar={() => setTela({ nome: "inicio" })}
          aoMomento={sentir}
        />
      );
    case "amigos":
      return (
        <JogarComAmigos
          aoCriar={() => setTela({ nome: "apelido", codigo: null, aviso: null })}
          aoEntrar={(codigo) => setTela({ nome: "apelido", codigo, aviso: null })}
          aoVoltar={() => setTela({ nome: "inicio" })}
        />
      );
    case "apelido":
      return (
        <Apelido
          key={tela.codigo}
          codigo={tela.codigo}
          apelidoGuardado={apelidoGuardado}
          aviso={tela.aviso}
          aoConfirmar={(apelido) => confirmarApelido(tela.codigo, apelido)}
          aoVoltar={() => setTela(tela.codigo ? { nome: "inicio" } : { nome: "amigos" })}
        />
      );
    case "sala":
      return (
        <TelaDaSala
          key={tela.entrada.codigo}
          entrada={tela.entrada}
          aoSair={() => {
            guardarUltimaSala(null);
            setTela({ nome: "inicio" });
          }}
          aoCriarSala={() => {
            guardarUltimaSala(null);
            setTela({ nome: "apelido", codigo: null, aviso: null });
          }}
        />
      );
  }
}
