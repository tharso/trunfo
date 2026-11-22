// Sons do jogo, gerados com Web Audio (docs/spec.md, parte 7). Sem arquivos.
// Copiados do protótipo `prototype/som-vibracao-tempo` (sensação "Suspense").
// Tudo aqui tolera falha: sem Web Audio (ou com ele bloqueado), o jogo segue mudo.

export type Som = "tique" | "largada" | "tiqueTaque" | "ganhar" | "perder" | "empate" | "vitoria" | "derrota";

type Construtor = typeof AudioContext;

let contexto: AudioContext | null = null;
/** Osciladores do tique-taque em curso, para parar quando o duelo é pulado. */
let relogio: OscillatorNode[] = [];

function ctx(): AudioContext | null {
  if (!contexto) {
    const C: Construtor | undefined =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Construtor }).webkitAudioContext);
    if (!C) return null;
    contexto = new C();
  }
  if (contexto.state === "suspended") void contexto.resume().catch(() => {});
  return contexto;
}

interface Opcoes {
  tipo?: OscillatorType;
  vol?: number;
  /** Segundos a partir de agora. */
  quando?: number;
  /** Frequência final (desliza até ela). */
  ate?: number;
}

function tom(f: number, dur: number, { tipo = "sine", vol = 0.18, quando = 0, ate }: Opcoes = {}): OscillatorNode | null {
  const c = ctx();
  if (!c) return null;
  const t = c.currentTime + quando;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function notas(fs: number[], dur: number, passo: number) {
  fs.forEach((f, i) => tom(f, dur, { tipo: "triangle", quando: i * passo }));
}

const SONS: Record<Som, (duracaoMs: number) => void> = {
  tique: () => tom(1200, 0.04, { tipo: "square", vol: 0.06 }),
  largada: () => {
    tom(440, 0.12, { tipo: "square", vol: 0.08 });
    tom(880, 0.2, { tipo: "square", vol: 0.08, quando: 0.14 });
  },
  tiqueTaque: (duracaoMs) => {
    const d = duracaoMs / 1000;
    for (let t = 0; t < d; t += 0.18) {
      const o = tom(t % 0.36 < 0.18 ? 1000 : 800, 0.03, { tipo: "square", vol: 0.05, quando: t });
      if (o) relogio.push(o);
    }
  },
  ganhar: () => notas([523, 659, 784], 0.18, 0.09),
  perder: () => notas([392, 311, 262], 0.22, 0.12),
  empate: () => notas([440, 440], 0.14, 0.16),
  vitoria: () => notas([523, 659, 784, 1047, 784, 1047], 0.22, 0.12),
  derrota: () => notas([330, 294, 262, 196], 0.3, 0.2),
};

/** Toca um som. `duracaoMs` só vale para o tique-taque. Nunca lança erro. */
export function tocar(som: Som, duracaoMs = 0): void {
  try {
    SONS[som](duracaoMs);
  } catch {
    // Sem som, sem problema.
  }
}

/** Para o tique-taque que ainda está tocando (o duelo foi pulado ou acabou). */
export function pararTiqueTaque(): void {
  for (const o of relogio) {
    try {
      o.stop();
    } catch {
      // Já parou.
    }
  }
  relogio = [];
}
