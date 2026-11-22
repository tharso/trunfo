// Som ligado ou desligado (docs/spec.md, parte 7). Começa ligado e é lembrado
// no aparelho. A leitura e a escrita toleram falha (aba anônima, armazenamento
// bloqueado): aí vale "ligado" e a escolha só dura até fechar a página.

const CHAVE = "trunfo:som";

let ligado = ler();
const ouvintes = new Set<(ligado: boolean) => void>();

function ler(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== "desligado";
  } catch {
    return true;
  }
}

export function somLigado(): boolean {
  return ligado;
}

export function ligarSom(sim: boolean): void {
  ligado = sim;
  try {
    localStorage.setItem(CHAVE, sim ? "ligado" : "desligado");
  } catch {
    // Não deu para lembrar; vale só nesta visita.
  }
  ouvintes.forEach((ouvir) => ouvir(sim));
}

/** Avisa quando o som é ligado ou desligado. Devolve a função que para de avisar. */
export function aoMudarSom(ouvir: (ligado: boolean) => void): () => void {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}
