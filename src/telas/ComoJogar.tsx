// "Como jogar", aberta pelo Início: as regras em texto curto (docs/spec.md, partes 3 e 6).
// Só texto; quem aplica as regras é o módulo de regras. No fim, os créditos das fotos das cartas.
import { CREDITOS_DAS_FOTOS, enderecoDaLicenca } from "./doBaralho";


export function ComoJogar({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <div class="tela">
      <main class="como-jogar">
        <h1 class="como-jogar__titulo">Como jogar</h1>

        <h2>Rodada</h2>
        <p>
          As 32 cartas são divididas entre você e o computador. Quem escolhe diz um atributo da carta de cima. As
          duas cartas aparecem e a nota mais alta ganha. Quem ganha leva as cartas para o fundo do monte e escolhe
          na próxima rodada.
        </p>

        <h2>Super Trunfo</h2>
        <p>Valentin Paret-Peintre é o Super Trunfo: ganha de qualquer carta, em qualquer atributo.</p>

        <h2>Carta A</h2>
        <p>Philipsen, Merlier, Milan e Magnier são Cartas A: só elas ganham do Super Trunfo.</p>

        <h2>Empate</h2>
        <p>
          Notas iguais: as cartas vão para o monte de empate, no meio da mesa. Quem escolheu escolhe de novo, e
          quem ganhar a próxima rodada leva tudo.
        </p>

        <h2>Fim</h2>
        <p>
          Ganha quem ficar com todas as cartas. Na rodada 100, ganha quem tiver mais cartas; com o mesmo número, a
          partida termina empatada.
        </p>

        <h2>Fotos</h2>
        <p>Fotos do Wikimedia Commons, recortadas para a carta.</p>
        <ul class="como-jogar__creditos">
          {CREDITOS_DAS_FOTOS.map((credito) => {
            const licenca = enderecoDaLicenca(credito.licenca);
            return (
              <li key={credito.nome}>
                <a href={credito.pagina} target="_blank" rel="noopener noreferrer">
                  {credito.nome}
                </a>
                : {credito.autor},{" "}
                {licenca ? (
                  <a href={licenca} target="_blank" rel="noopener noreferrer">
                    {credito.licenca}
                  </a>
                ) : (
                  credito.licenca
                )}
              </li>
            );
          })}
        </ul>

        <button type="button" class="botao" onClick={aoVoltar}>
          Voltar
        </button>
      </main>
    </div>
  );
}
