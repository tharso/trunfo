// Placar em cabo de guerra (docs/spec.md, partes 6, 7 e 9): uma barra com as
// suas cartas (verde, sempre na esquerda), o monte de empate (amarelo) e as da
// outra pessoa (vermelho): o Computador no modo solo, o Apelido na sala. As
// larguras andam em 0,8 s (transição no CSS) quando os números mudam.
// Com 3 ou 4 pessoas (ticket #39), `outros` tem mais de uma pessoa e a barra
// vira uma parte por pessoa, em tons neutros com as iniciais (spec, item 13).

interface Props {
  voce: number;
  empate: number;
  /** As outras pessoas da mesa, na Ordem da mesa. */
  outros: { nome: string; cartas: number }[];
  rodada: number;
  limite: number;
}

export function Placar({ voce, empate, outros, rodada, limite }: Props) {
  const total = voce + empate + outros.reduce((soma, o) => soma + o.cartas, 0) || 1;
  const largura = (n: number) => ({ width: `${(100 * n) / total}%` });
  const descricao = [
    `Você ${voce} cartas`,
    `monte de empate ${empate}`,
    ...outros.map((o) => `${o.nome} ${o.cartas} cartas`),
  ].join(", ");
  return (
    <header class="placar">
      <div class="placar__linha">
        <span>Você {voce}</span>
        <span class="placar__rodada">
          <span>
            Rodada {rodada}/{limite}
          </span>
          {empate > 0 && <span aria-label={`${empate} no monte de empate`}> · 🤝 {empate}</span>}
        </span>
        {outros.map((o, i) => (
          <span key={i}>
            {o.cartas} {o.nome}
          </span>
        ))}
      </div>
      <div class="placar__cabo" role="img" aria-label={descricao}>
        <i class="placar__voce" style={largura(voce)} />
        <i class="placar__empate" style={largura(empate)} />
        {outros.map((o, i) => (
          <i key={i} class="placar__outro" style={largura(o.cartas)} />
        ))}
      </div>
    </header>
  );
}
