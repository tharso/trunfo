// Som ligado ou desligado (docs/spec.md, parte 7). Começa ligado a cada vez que a
// página abre; a escolha fica só na memória (a spec não guarda o som no celular).

let ligado = true;
const ouvintes = new Set<(ligado: boolean) => void>();

export function somLigado(): boolean {
  return ligado;
}

export function ligarSom(sim: boolean): void {
  ligado = sim;
  ouvintes.forEach((ouvir) => ouvir(sim));
}

/** Avisa quando o som é ligado ou desligado. Devolve a função que para de avisar. */
export function aoMudarSom(ouvir: (ligado: boolean) => void): () => void {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}
