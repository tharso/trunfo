// "Jogar com amigos" (docs/spec.md, parte 9, itens 1, 3 e 8): "Criar sala" ou
// "Entrar com código". Sem internet, só "Precisa de internet"; o modo solo segue.
import { useState } from "preact/hooks";
import { lerCodigo } from "../sala/codigo";
import { PRECISA_DE_INTERNET, useInternet } from "./amigos";
import "./Sala.css";

interface Props {
  aoCriar: () => void;
  aoEntrar: (codigo: string) => void;
  aoVoltar: () => void;
}

export function JogarComAmigos({ aoCriar, aoEntrar, aoVoltar }: Props) {
  const online = useInternet();
  const [digitando, setDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const codigo = lerCodigo(texto);

  return (
    <div class="tela">
      <main class="inicio">
        <h1 class="inicio__titulo">Jogar com amigos</h1>
        {!online ? (
          <p class="amigos__aviso">{PRECISA_DE_INTERNET}</p>
        ) : digitando ? (
          <form
            class="amigos__codigo"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (codigo) aoEntrar(codigo);
            }}
          >
            <label class="campo">
              <span class="campo__rotulo">Código da sala</span>
              <input
                class="campo__entrada campo__entrada--codigo"
                value={texto}
                onInput={(evento) => setTexto(evento.currentTarget.value.toUpperCase())}
                maxLength={3}
                autoComplete="off"
                autoCapitalize="characters"
                spellcheck={false}
                autoFocus
              />
            </label>
            <button type="submit" class="botao" disabled={codigo === null}>
              Entrar
            </button>
          </form>
        ) : (
          <div class="amigos__escolha">
            <button type="button" class="botao" onClick={aoCriar}>
              Criar sala
            </button>
            <button type="button" class="botao botao--secundario" onClick={() => setDigitando(true)}>
              Entrar com código
            </button>
          </div>
        )}
        <button type="button" class="botao botao--secundario" onClick={aoVoltar}>
          Voltar
        </button>
      </main>
    </div>
  );
}
