// Tela de Início (docs/spec.md, parte 6). Por enquanto só o título, o "Jogar"
// (ainda sem partida) e o aviso de jogo de fã. O resto vem em outros tickets.
export function Inicio() {
  return (
    <div class="tela">
      <main class="inicio">
        <h1 class="inicio__titulo">Super Trunfo Ciclismo</h1>
        <button type="button" class="botao">
          Jogar
        </button>
      </main>
      <footer class="rodape">
        Jogo de fã, sem fins lucrativos. Sem ligação com a Grow, a UCI, as equipes ou os ciclistas.
      </footer>
    </div>
  );
}
