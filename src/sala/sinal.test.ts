// O sinal de vida da conexão (ping/pong): o socket que fica calado é queda,
// mesmo sem o navegador avisar que a rede caiu (docs/spec.md, parte 9, item 14).
import { describe, expect, it } from "vitest";
import { INTERVALO_DO_PING, SILENCIO_MAXIMO, semSinal } from "./sinal";

const AGORA = 1_000_000;

describe("socket sem sinal", () => {
  it("o celular manda ping bem antes de o servidor desistir", () => {
    expect(SILENCIO_MAXIMO).toBeGreaterThanOrEqual(2 * INTERVALO_DO_PING);
  });

  it("com ping recente, está vivo", () => {
    expect(semSinal(AGORA - 60_000, AGORA - 5_000, AGORA)).toBe(false);
  });

  it("sem ping há mais que o silêncio máximo, caiu", () => {
    expect(semSinal(AGORA - 60_000, AGORA - SILENCIO_MAXIMO, AGORA)).toBe(true);
  });

  it("socket novo, que ainda não mandou ping, tem o silêncio máximo desde que abriu", () => {
    expect(semSinal(AGORA - 5_000, null, AGORA)).toBe(false);
    expect(semSinal(AGORA - SILENCIO_MAXIMO, null, AGORA)).toBe(true);
  });
});
