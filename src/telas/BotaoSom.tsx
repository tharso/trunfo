// Botão 🔊/🔇 (docs/spec.md, parte 7), no Início e na rodada. Desliga só o som.
import { useEffect, useState } from "preact/hooks";
import "./BotaoSom.css";
import { aoMudarSom, ligarSom, somLigado } from "./preferenciaDeSom";

export function BotaoSom() {
  const [ligado, setLigado] = useState(somLigado);
  useEffect(() => aoMudarSom(setLigado), []);
  return (
    <button
      type="button"
      class="botao-som"
      aria-pressed={!ligado}
      aria-label={ligado ? "Desligar o som" : "Ligar o som"}
      onClick={() => ligarSom(!ligado)}
    >
      {ligado ? "🔊" : "🔇"}
    </button>
  );
}
