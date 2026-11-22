// Som ligado ou desligado (docs/spec.md, parte 7). Começa ligado e é lembrado
// no celular (src/armazenamento.ts, que tolera falha: sem armazenamento, vale
// "ligado" e a escolha só dura até fechar a página).
import { guardarSomLigado, lerSomLigado } from "../armazenamento";

let ligado = lerSomLigado();
const ouvintes = new Set<(ligado: boolean) => void>();

export function somLigado(): boolean {
  return ligado;
}

export function ligarSom(sim: boolean): void {
  ligado = sim;
  guardarSomLigado(sim);
  ouvintes.forEach((ouvir) => ouvir(sim));
}

/** Avisa quando o som é ligado ou desligado. Devolve a função que para de avisar. */
export function aoMudarSom(ouvir: (ligado: boolean) => void): () => void {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}
