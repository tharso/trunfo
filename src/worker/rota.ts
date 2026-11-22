// Qual sala um caminho pede. `/sala/<código>` (e o que vier depois) vai para o
// Durable Object daquela sala; o resto é arquivo estático. O formato do código
// (3 letras, spec parte 9) fica para a tela da sala.
export function codigoDaSala(caminho: string): string | null {
  const partes = /^\/sala\/([^/]+)/.exec(caminho);
  return partes ? partes[1] : null;
}
