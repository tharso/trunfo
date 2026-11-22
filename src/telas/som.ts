// Sons do jogo, gerados com Web Audio (docs/spec.md, parte 7). Sem arquivos.
// Copiados do protótipo `prototype/som-vibracao-tempo` (sensação "Suspense").
// Tudo aqui tolera falha: sem Web Audio (ou com ele bloqueado), o jogo segue mudo.

export type Som = "tique" | "largada" | "tiqueTaque" | "ganhar" | "perder" | "empate" | "vitoria" | "derrota";

type Construtor = typeof AudioContext;

let contexto: AudioContext | null = null;
/** Osciladores do tique-taque em curso, para parar quando o duelo é pulado. */
let relogio: OscillatorNode[] = [];

function contextoDeAudio(): AudioContext | null {
  if (!contexto) {
    const ConstrutorDoContexto: Construtor | undefined =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Construtor }).webkitAudioContext);
    if (!ConstrutorDoContexto) return null;
    contexto = new ConstrutorDoContexto();
  }
  if (contexto.state === "suspended") void contexto.resume().catch(() => {});
  return contexto;
}

interface Opcoes {
  tipo?: OscillatorType;
  volume?: number;
  /** Segundos a partir de agora. */
  quando?: number;
  /** Frequência final (desliza até ela). */
  ate?: number;
}

/** Um tom de `frequencia` Hz por `duracao` segundos. */
function tom(
  frequencia: number,
  duracao: number,
  { tipo = "sine", volume = 0.18, quando = 0, ate }: Opcoes = {},
): OscillatorNode | null {
  const audio = contextoDeAudio();
  if (!audio) return null;
  const inicio = audio.currentTime + quando;
  const oscilador = audio.createOscillator();
  const ganho = audio.createGain();
  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frequencia, inicio);
  if (ate) oscilador.frequency.exponentialRampToValueAtTime(ate, inicio + duracao);
  ganho.gain.setValueAtTime(0, inicio);
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.01);
  ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
  oscilador.connect(ganho).connect(audio.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracao + 0.02);
  return oscilador;
}

/** Uma sequência de notas, uma a cada `passo` segundos. */
function notas(frequencias: number[], duracao: number, passo: number) {
  frequencias.forEach((frequencia, i) => tom(frequencia, duracao, { tipo: "triangle", quando: i * passo }));
}

const SONS: Record<Som, (duracaoMs: number) => void> = {
  tique: () => tom(1200, 0.04, { tipo: "square", volume: 0.06 }),
  largada: () => {
    tom(440, 0.12, { tipo: "square", volume: 0.08 });
    tom(880, 0.2, { tipo: "square", volume: 0.08, quando: 0.14 });
  },
  tiqueTaque: (duracaoMs) => {
    const segundos = duracaoMs / 1000;
    for (let quando = 0; quando < segundos; quando += 0.18) {
      const oscilador = tom(quando % 0.36 < 0.18 ? 1000 : 800, 0.03, { tipo: "square", volume: 0.05, quando });
      if (oscilador) relogio.push(oscilador);
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
  for (const oscilador of relogio) {
    try {
      oscilador.stop();
    } catch {
      // Já parou.
    }
  }
  relogio = [];
}
