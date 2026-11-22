// Menu ☰ da partida (docs/spec.md, partes 6 e 8): "Sair da partida?", que conta
// como derrota. Só pergunta; quem sai de verdade (ação `sair` das regras) é o App.
import { useState } from "preact/hooks";
import "./MenuPartida.css";

interface Props {
  aoSair: () => void;
}

export function MenuPartida({ aoSair }: Props) {
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
              Sair da partida?
            </h2>
            <p class="menu-partida__aviso">Conta como derrota.</p>
            <button type="button" class="botao" onClick={() => setAberto(false)} autoFocus>
              Continuar jogando
            </button>
            <button type="button" class="botao botao--secundario" onClick={aoSair}>
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
