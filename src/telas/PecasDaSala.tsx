// Peças da tela da sala que também aparecem no fim da partida (docs/spec.md,
// parte 9, itens 5 e 25): o código com "Mandar link" e a lista na Ordem da
// mesa. No fim, dão para convidar gente nova entre partidas e ver quem chegou.
import { useState } from "preact/hooks";
import type { SalaVista } from "../multiplayer/conexao";
import { caminhoDaSala } from "./enderecoDaSala";
import "./Sala.css";

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

/** O código grande e "Mandar link". */
export function CodigoDaSala({ codigo }: { codigo: string }) {
  const [avisoDoLink, setAvisoDoLink] = useState<string | null>(null);
  return (
    <>
      <p class="sala__rotulo">Código da sala</p>
      <p class="sala__codigo" aria-label={`Código da sala: ${codigo}`}>
        {codigo}
      </p>
      <button type="button" class="botao botao--secundario" onClick={async () => setAvisoDoLink(await mandarLink(codigo))}>
        Mandar link
      </button>
      {avisoDoLink && <p class="sala__aviso">{avisoDoLink}</p>}
    </>
  );
}

/** A lista da sala na Ordem da mesa, com "você" e o Anfitrião. */
export function ListaDaSala({ sala }: { sala: SalaVista }) {
  return (
    <ol class="sala__pessoas" aria-label="Pessoas na sala">
      {sala.pessoas.map((pessoa, indice) => (
        <li key={pessoa.numero} class={`sala__pessoa${pessoa.conectada ? "" : " sala__pessoa--sem-conexao"}`}>
          <span class="sala__apelido">{pessoa.apelido}</span>
          {indice === sala.voce && <span class="sala__marca">você</span>}
          {indice === sala.anfitriao && <span class="sala__marca">Anfitrião</span>}
        </li>
      ))}
    </ol>
  );
}
