// Placar em cabo de guerra (docs/spec.md, partes 6 e 7): uma barra com as
// suas cartas (verde), o monte de empate (amarelo) e as do Computador
// (vermelho). As larguras andam em 0,8 s (transição no CSS) quando os números mudam.

interface Props {
  voce: number;
  empate: number;
  computador: number;
  rodada: number;
  limite: number;
}

export function Placar({ voce, empate, computador, rodada, limite }: Props) {
  const total = voce + empate + computador || 1;
  const largura = (n: number) => ({ width: `${(100 * n) / total}%` });
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
        <span>{computador} Computador</span>
      </div>
      <div
        class="placar__cabo"
        role="img"
        aria-label={`Você ${voce} cartas, monte de empate ${empate}, Computador ${computador} cartas`}
      >
        <i class="placar__voce" style={largura(voce)} />
        <i class="placar__empate" style={largura(empate)} />
        <i class="placar__computador" style={largura(computador)} />
      </div>
    </header>
  );
}
