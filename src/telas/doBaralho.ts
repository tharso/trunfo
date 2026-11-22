// O que a tela lê do baralho.json além do que as regras guardam (código, nome e
// notas): nome dos atributos, equipe, cores, iniciais, foto, país. Só visual.
import baralho from "../dados/baralho.json";
import fotos from "../dados/fotos.json";
import type { Carta, ChaveAtributo } from "../regras";

type CartaDoBaralho = (typeof baralho.cartas)[number];

const DO_BARALHO = new Map<string, CartaDoBaralho>(baralho.cartas.map((c) => [c.codigo, c]));

export const NOME_DO_ATRIBUTO = Object.fromEntries(baralho.atributos.map((a) => [a.chave, a.nome])) as Record<
  ChaveAtributo,
  string
>;

/**
 * A carta do baralho pelo código. Na sala, as mensagens trazem só o código;
 * a tela tem o baralho inteiro (ele é sempre o mesmo).
 */
export function cartaPeloCodigo(codigo: string): Carta {
  const carta = DO_BARALHO.get(codigo);
  if (!carta) throw new Error(`Carta ${codigo} não está no baralho.`);
  return carta;
}

/** Cores de reserva, para uma carta que não está no baralho. */
const CORES_DE_RESERVA = ["#334155", "#94a3b8"];

/**
 * A carta como o baralho a descreve, com cores e iniciais sempre presentes
 * (se a carta não está no baralho, `dados` é `undefined` e valem as de reserva).
 */
export function aparencia(carta: Carta): {
  dados: CartaDoBaralho | undefined;
  cores: string[];
  iniciais: string;
  /** Endereço da foto do ciclista, ou `null` (aí a carta mostra as iniciais). */
  foto: string | null;
} {
  const dados = DO_BARALHO.get(carta.codigo);
  return {
    dados,
    cores: dados?.cores ?? CORES_DE_RESERVA,
    iniciais: dados?.iniciais ?? carta.nome.slice(0, 2),
    foto: dados && dados.slug in FOTOS ? enderecoDaFoto(dados.slug) : null,
  };
}

function enderecoDaFoto(slug: string): string {
  return `/fotos/${slug}.webp`;
}

/** Quem fez cada foto (Wikimedia Commons), na ordem do baralho. Gerado por scripts/gerar_fotos.py. */
export interface CreditoDaFoto {
  nome: string;
  autor: string;
  licenca: string;
  pagina: string;
}

const FOTOS: Record<string, Omit<CreditoDaFoto, "nome">> = fotos;

export const CREDITOS_DAS_FOTOS: CreditoDaFoto[] = baralho.cartas
  .filter((c) => c.slug in FOTOS)
  .map((c) => ({ nome: c.nome, ...FOTOS[c.slug] }));

/** Endereço do texto da licença Creative Commons ("CC BY-SA 4.0" → creativecommons.org/...), ou `null`. */
export function enderecoDaLicenca(licenca: string): string | null {
  const partes = /^CC (BY(?:-SA|-ND|-NC|-NC-SA|-NC-ND)?) (\d\.\d)$/.exec(licenca.trim());
  if (!partes) return null;
  return `https://creativecommons.org/licenses/${partes[1].toLowerCase()}/${partes[2]}/`;
}
