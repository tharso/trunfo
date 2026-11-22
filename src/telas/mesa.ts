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

/** Como uma rodada terminou para a pessoa `voce`, pelo vencedor do evento (`null` é empate). */
export function rodadaPara(vencedor: number | null, voce: number): "ganhar" | "perder" | "empate" {
  if (vencedor === null) return "empate";
  return vencedor === voce ? "ganhar" : "perder";
}
