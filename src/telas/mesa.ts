// Como a tela fala das pessoas da mesa, no modo solo (você e o Computador) e na
// sala (você e os Apelidos). Só nomes; quem ganhou e por quê vêm das regras.
export interface NomeNaTela {
  /** Rótulo curto, no placar e na faixa do duelo: "Computador", "Ana". */
  nome: string;
  /** Começo de frase: "O computador ganhou.", "Ana ganhou.". */
  sujeito: string;
  /** Depois de "Carta": "Carta do computador", "Carta de Ana". */
  de: string;
}

/** Na sala, cada pessoa é chamada pelo Apelido. */
export function nomeDoApelido(apelido: string): NomeNaTela {
  return { nome: apelido, sujeito: apelido, de: `de ${apelido}` };
}

/** As iniciais do Apelido no placar de 3 ou 4 pessoas: "Ana" → "A", "Ana Clara" → "AC", "Ana 2" → "A2". */
export function iniciaisDoApelido(apelido: string): string {
  return apelido
    .split(" ")
    .filter((palavra) => palavra !== "")
    .slice(0, 2)
    .map((palavra) => palavra[0].toLocaleUpperCase("pt-BR"))
    .join("");
}

