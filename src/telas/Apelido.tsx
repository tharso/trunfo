// Apelido (docs/spec.md, parte 9, item 4): a pessoa digita o nome que os outros
// vão ver. O celular lembra o último Apelido. Repetido ganha número na sala.
import { useState } from "preact/hooks";
import { TAMANHO_MAXIMO_DO_APELIDO } from "../sala/protocolo";
import "./Sala.css";

interface Props {
  /** A sala do link ou do código digitado; `null` quando a pessoa vai criar a sala. */
  codigo: string | null;
  apelidoGuardado: string;
  /** Aviso embaixo do botão (ex.: "Precisa de internet" ao criar a sala). */
  aviso: string | null;
  aoConfirmar: (apelido: string) => void;
  aoVoltar: () => void;
}

export function Apelido({ codigo, apelidoGuardado, aviso, aoConfirmar, aoVoltar }: Props) {
  const [apelido, setApelido] = useState(apelidoGuardado);
  const limpo = apelido.trim();

  return (
    <div class="tela">
      <main class="inicio">
        {codigo && <p class="amigos__sala">Sala {codigo}</p>}
        <form
          class="amigos__codigo"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (limpo !== "") aoConfirmar(limpo);
          }}
        >
          <label class="campo">
            <span class="campo__rotulo">Apelido</span>
            <input
              class="campo__entrada"
              value={apelido}
              onInput={(evento) => setApelido(evento.currentTarget.value)}
              maxLength={TAMANHO_MAXIMO_DO_APELIDO}
              autoComplete="nickname"
              autoFocus
            />
          </label>
          <button type="submit" class="botao" disabled={limpo === ""}>
            {codigo ? "Entrar na sala" : "Criar sala"}
          </button>
          {aviso && <p class="amigos__aviso">{aviso}</p>}
        </form>
        <button type="button" class="botao botao--secundario" onClick={aoVoltar}>
          Voltar
        </button>
      </main>
    </div>
  );
}
