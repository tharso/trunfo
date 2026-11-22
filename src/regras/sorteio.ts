// Fonte de sorteio fixável. É só um número (a semente), para caber no estado
// e virar JSON. Cada sorteio devolve o valor e a semente seguinte; quem sorteia
// guarda a semente nova. Gerador: mulberry32 (rápido, 32 bits, bom para jogo).

/** A semente da fonte de sorteio: um inteiro de 32 bits. */
export type Sorteio = number;

/** Sorteia um inteiro de 0 a `n - 1`. */
export function sortear(sorteio: Sorteio, n: number): { valor: number; sorteio: Sorteio } {
  const proximo = (sorteio + 0x6d2b79f5) | 0;
  let t = proximo;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const fracao = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { valor: Math.floor(fracao * n), sorteio: proximo };
}

/** Embaralha uma cópia da lista (Fisher-Yates). */
export function embaralhar<T>(lista: readonly T[], sorteio: Sorteio): { lista: T[]; sorteio: Sorteio } {
  const copia = [...lista];
  let s = sorteio;
  for (let i = copia.length - 1; i > 0; i--) {
    const r = sortear(s, i + 1);
    s = r.sorteio;
    [copia[i], copia[r.valor]] = [copia[r.valor], copia[i]];
  }
  return { lista: copia, sorteio: s };
}
