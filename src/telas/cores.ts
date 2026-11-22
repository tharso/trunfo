// Contas de cor da carta. Só visual: nada aqui muda regra.

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** Escala semáforo da barra (docs/spec.md, parte 5). Entre as paradas, interpola. */
const PARADAS: [number, string][] = [
  [1, "#d84315"],
  [40, "#f9a825"],
  [70, "#7cb342"],
  [99, "#1b8a3a"],
];

export function corDaNota(nota: number): string {
  if (nota <= PARADAS[0][0]) return PARADAS[0][1];
  for (let k = 1; k < PARADAS.length; k++) {
    const [b, corB] = PARADAS[k];
    if (nota <= b) {
      const [a, corA] = PARADAS[k - 1];
      const t = (nota - a) / (b - a);
      const A = rgb(corA);
      const B = rgb(corB);
      return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`;
    }
  }
  return PARADAS[PARADAS.length - 1][1];
}

/** Luminância relativa (WCAG), de 0 (preto) a 1 (branco). */
function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto escuro sobre cor clara, texto branco sobre cor escura. */
export function textoSobre(hex: string): string {
  return luminancia(hex) > 0.4 ? "#14181f" : "#ffffff";
}

/**
 * A cor da linha marcada é a cor da equipe. Se a 1ª cor é quase branca (some
 * no fundo branco da carta), usa a 2ª.
 */
export function corDaMarcacao(cores: string[]): string {
  return luminancia(cores[0]) > 0.85 && cores[1] ? cores[1] : cores[0];
}
