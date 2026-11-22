// A carta em pé (docs/spec.md, parte 5; protótipo `prototype/visual-da-carta`,
// variante A). Só desenha: quem decide o que um toque faz é quem usa a carta.
import type { ComponentChildren } from "preact";
import { ATRIBUTOS, type Carta as CartaDasRegras, type ChaveAtributo } from "../regras";
import "./Carta.css";
import { corDaMarcacao, corDaNota, textoSobre } from "./cores";
import { aparencia, NOME_DO_ATRIBUTO } from "./doBaralho";
import { Rosto } from "./Rosto";

const ICONE: Record<ChaveAtributo, string> = {
  sprint: "⚡",
  explosao: "💥",
  montanha: "⛰️",
  contrarrelogio: "⏱️",
  pave: "🧱",
  voltas: "🏆",
};

/** Texto da etapa (docs/spec.md, parte 5). Só na tela; não muda a regra. */
export const TEXTO_DA_ETAPA: Record<ChaveAtributo, string> = {
  sprint: "Sprint",
  explosao: "Explosão",
  montanha: "Etapa de montanha",
  contrarrelogio: "Contrarrelógio",
  pave: "Etapa de pavê",
  voltas: "Classificação geral",
};

const NOMES_DE_PAIS = new Intl.DisplayNames(["pt-BR"], { type: "region" });

/** Bandeira em emoji a partir do código ISO de 2 letras (ex.: "FR" → 🇫🇷). */
function bandeira(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
}

interface Props {
  carta: CartaDasRegras;
  /** A linha marcada, ou `null`. */
  marcado: ChaveAtributo | null;
  /** Toque numa linha. Sem ele, a carta só mostra (não dá para tocar). */
  aoTocar?: (atributo: ChaveAtributo) => void;
  /** Selo no topo da carta (Super Trunfo, Carta A). */
  selo?: ComponentChildren;
  /** Rótulo acessível da carta. */
  rotulo?: string;
}

export function Carta({ carta, marcado, aoTocar, selo, rotulo }: Props) {
  // As regras só guardam código, nome e notas; o resto (equipe, cores, país...) vem do baralho.
  const { dados, cores, iniciais, foto } = aparencia(carta);
  const marcacao = corDaMarcacao(cores);
  const pais = dados ? (NOMES_DE_PAIS.of(dados.pais) ?? dados.paisNome) : null;
  const estilo = {
    "--equipe-1": cores[0],
    "--equipe-2": cores[1] ?? cores[0],
    "--texto-topo": textoSobre(cores[0]),
    "--marcacao": marcacao,
    "--texto-marcacao": textoSobre(marcacao),
  };

  return (
    <div class="carta-e-etapa">
      <section class="carta" style={estilo} aria-label={rotulo ?? carta.nome}>
        <header class="carta__topo">
          <span class="carta__codigo">{carta.codigo}</span>
          {selo && <div class="carta__selo">{selo}</div>}
          {dados && (
            <span class="carta__bandeira" role="img" aria-label={pais ?? dados.pais}>
              {bandeira(dados.pais)}
            </span>
          )}
          <div class={`carta__iniciais${iniciais.length > 3 ? " carta__iniciais--longas" : ""}`} aria-hidden="true">
            <Rosto foto={foto} iniciais={iniciais} />
          </div>
        </header>
        <h2 class="carta__nome">{carta.nome}</h2>
        {dados && (
          <p class="carta__sub">
            {pais} · {dados.idade} anos
            <br />
            {dados.equipe}
          </p>
        )}
        <ul class="carta__linhas">
          {ATRIBUTOS.map((atributo) => {
            const nota = carta.notas[atributo];
            const ativa = marcado === atributo;
            return (
              <li key={atributo}>
                <button
                  type="button"
                  class={`carta__linha${ativa ? " carta__linha--marcada" : ""}`}
                  aria-pressed={ativa}
                  disabled={!aoTocar}
                  onClick={() => aoTocar?.(atributo)}
                >
                  <span class="carta__rotulo">
                    <span class="carta__atributo">
                      <span aria-hidden="true">{ICONE[atributo]}</span> {NOME_DO_ATRIBUTO[atributo]}
                      {ativa && aoTocar && <span class="carta__dica"> · toque de novo ▶</span>}
                    </span>
                    <span class="carta__barra" aria-hidden="true">
                      <i style={{ width: `${nota}%`, background: corDaNota(nota) }} />
                    </span>
                  </span>
                  <span class="carta__nota">{nota}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <p class="carta__etapa" aria-live="polite">
        {marcado ? TEXTO_DA_ETAPA[marcado] : ""}
      </p>
    </div>
  );
}
