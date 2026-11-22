// O código da Sala (docs/spec.md, parte 9): 3 letras, sem O e sem I (não se
// confundem com 0 e 1). O jogo sorteia; ninguém escolhe. Usado pelo Worker (que
// sorteia) e pela tela (que lê o que a pessoa digitou).

export const LETRAS_DO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Sorteia um código. `aleatorio` devolve um número em [0, 1), como Math.random. */
export function sortearCodigo(aleatorio: () => number): string {
  let codigo = "";
  for (let i = 0; i < 3; i++) {
    codigo += LETRAS_DO_CODIGO[Math.floor(aleatorio() * LETRAS_DO_CODIGO.length)];
  }
  return codigo;
}

const FORMATO = new RegExp(`^[${LETRAS_DO_CODIGO}]{3}$`);

/** O código em maiúsculas, ou `null` se o texto não é um código de sala. */
export function lerCodigo(texto: string): string | null {
  const codigo = texto.trim().toUpperCase();
  return FORMATO.test(codigo) ? codigo : null;
}
