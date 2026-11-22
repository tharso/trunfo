// Menu ☰ da partida (docs/spec.md, partes 6, 8 e 9). No modo solo, "Sair da
// partida?", que conta como derrota; na sala, os textos vêm de quem usa.
// Só pergunta; quem sai de verdade (ação `sair`) é quem usa o menu.
import { useState } from "preact/hooks";
import "./MenuPartida.css";

interface Props {
  aoSair: () => void;
  titulo?: string;
  /** A frase embaixo do título (`null`: nenhuma). */
  aviso?: string | null;
  continuar?: string;
}

export function MenuPartida({
  aoSair,
  titulo = "Sair da partida?",
  aviso = "Conta como derrota.",
  continuar = "Continuar jogando",
}: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" class="menu-partida" aria-label="Menu" onClick={() => setAberto(true)}>
        ☰
      </button>
      {aberto && (
        <div class="menu-partida__fundo" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <div class="menu-partida__painel" role="dialog" aria-modal="true" aria-labelledby="menu-partida-titulo">
            <h2 id="menu-partida-titulo" class="menu-partida__titulo">
              {titulo}
            </h2>
            {aviso && <p class="menu-partida__aviso">{aviso}</p>}
            <button type="button" class="botao" onClick={() => setAberto(false)} autoFocus>
              {continuar}
            </button>
            <button
              type="button"
              class="botao botao--secundario"
              onClick={() => {
                setAberto(false);
                aoSair();
              }}
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
