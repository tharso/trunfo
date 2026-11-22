// Super Trunfo e Carta A na tela (ticket 23): o selo na carta e o texto do
// motivo no resultado da rodada. Peças pequenas, para o visual da carta
// (ticket 24) e o duelo (ticket 25) usarem como estão.
import type { Carta, Evento } from "../regras";

/** Selo de Super Trunfo ou de Carta A, para a prop `selo` da Carta. `null` para uma carta normal. */
export function selo(carta: Carta) {
  if (carta.superTrunfo) return <span class="selo selo--super-trunfo">Super Trunfo</span>;
  if (carta.cartaA) return <span class="selo selo--carta-a">Carta A</span>;
  return null;
}

type EventoDaRodada = Extract<Evento, { tipo: "rodada" }>;

/** O motivo da rodada em texto (Super Trunfo, Carta A, monte de empate), ou `null` se ganhou só pela nota. */
export function textoDoMotivo(evento: EventoDaRodada): string | null {
  const partes: string[] = [];
  if (evento.motivo === "superTrunfo") partes.push("Super Trunfo! Ganha de qualquer carta.");
  if (evento.motivo === "cartaA")
    partes.push(
      evento.mesa.length === 2
        ? "Carta A! Ganha do Super Trunfo."
        : "Carta A na mesa: o Super Trunfo saiu da disputa.",
    );
  if (evento.motivo === "empate") partes.push("As cartas vão para o monte de empate.");
  if (evento.doMonteDeEmpate > 0) partes.push(`Leva também as ${evento.doMonteDeEmpate} cartas do monte de empate.`);
  return partes.length > 0 ? partes.join(" ") : null;
}
