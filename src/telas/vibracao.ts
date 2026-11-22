// Vibração (docs/spec.md, parte 7). Só o Android vibra por página web; no
// iPhone e no desktop `navigator.vibrate` não existe e isto não faz nada.

/** Vibra com o padrão (ms: vibra, pausa, vibra...). Sem suporte, não faz nada. */
export function vibrar(padrao: number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(padrao);
  } catch {
    // Sem vibração, sem problema.
  }
}
