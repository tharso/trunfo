// Queda de rede, "Cutucar", saída no meio e De fora na tela da partida da sala
// (docs/spec.md, parte 9, itens 14 a 19). Quem decide é a sala (src/sala/sala.ts):
// ela manda quem está sendo esperado (`esperando`) e se dá para cutucar
// (`podeCutucar`); estas peças só mostram e mandam o pedido.
import { MenuPartida } from "./MenuPartida";

/** O texto no topo de quem está De fora (spec, item 19). */
export const TEXTO_DE_FORA = "De fora, só olhando. Você entra na próxima partida.";

/** O que a tela da partida precisa da sala (além da fila de rodadas). */
export interface ControlesDaSala {
  /** Quem caiu e está sendo esperado: a partida está parada. */
  esperando: { indice: number; apelido: string }[];
  souAnfitriao: boolean;
  podeCutucar: boolean;
  aoTirar: (indice: number) => void;
  aoCutucar: () => void;
  /** Menu ☰ no meio da partida: sai dela e fica De fora. */
  aoSairDaPartida: () => void;
  /** Menu ☰ De fora: vai embora da sala. */
  aoSairDaSala: () => void;
}

/** "Bia está sem rede…" e, para o Anfitrião, "Tirar". */
export function AvisoDeQueda({ esperando, souAnfitriao, aoTirar }: ControlesDaSala) {
  if (esperando.length === 0) return null;
  return (
    <div class="queda" role="status">
      {esperando.map(({ indice, apelido }) => (
        <p key={indice} class="queda__pessoa">
          <span>{apelido} está sem rede. A partida espera até 60 s.</span>
          {souAnfitriao && (
            <button
              type="button"
              class="botao botao--secundario queda__tirar"
              aria-label={`Tirar ${apelido}`}
              onClick={() => aoTirar(indice)}
            >
              Tirar
            </button>
          )}
        </p>
      ))}
    </div>
  );
}

export function BotaoCutucar({ aoCutucar }: Pick<ControlesDaSala, "aoCutucar">) {
  return (
    <button type="button" class="botao botao--secundario" onClick={aoCutucar}>
      Cutucar
    </button>
  );
}

/** Menu ☰ da sala: no meio da partida, sair dela; De fora, sair da sala. */
export function MenuDaSala({ deFora, aoSairDaPartida, aoSairDaSala }: ControlesDaSala & { deFora: boolean }) {
  return deFora ? (
    <MenuPartida titulo="Sair da sala?" aviso={null} continuar="Continuar olhando" aoSair={aoSairDaSala} />
  ) : (
    <MenuPartida aviso="Suas cartas saem do jogo." aoSair={aoSairDaPartida} />
  );
}
