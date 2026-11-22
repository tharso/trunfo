import { expect, test } from "@playwright/test";

// O único teste de ponta a ponta da partida: joga uma partida inteira até o Fim.
// `?semente=231` fixa o sorteio (baralho, quem começa e as escolhas do Computador).
// Com a pessoa escolhendo sempre a primeira linha (Sprint), essa semente acaba
// em 20 rodadas. A semente só fixa o sorteio; quem decide as regras é o módulo.
// Nela, o Computador joga o Super Trunfo na rodada 8 e você tem uma Carta A na 11.
// A partida roda SEM INTERNET: a 1ª visita instala o service worker (PWA), depois
// o teste corta a rede e recarrega. Assim o mesmo teste cobre o jogo e o offline.
// No meio, recarrega a página: o Início mostra "Continuar partida?" e a partida
// volta igual. No fim (o Computador ganha), o Retrospecto do Início muda.
test("joga uma partida inteira contra o Computador até o Fim, sem internet", async ({ page, context }) => {
  await page.goto("/?semente=231");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Fácil: você 0 × 0 computador", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Jogar", exact: true }).click();

  const fim = page.getByRole("button", { name: "Jogar de novo" });
  const proxima = page.getByRole("button", { name: "Próxima rodada" });
  const correr = page.getByRole("button", { name: "Correr!" });
  const primeiraLinha = page.locator(".carta__linha").first();

  for (let rodada = 1; rodada <= 100; rodada++) {
    await expect(page.getByText(`Rodada ${rodada}/100`)).toBeVisible();
    if (rodada === 5) {
      // A partida é guardada depois de cada rodada: recarregar no meio não perde nada.
      const placar = await page.getByRole("banner").textContent();
      const carta = await page.getByRole("region", { name: /^Sua carta: / }).getAttribute("aria-label");
      await page.reload();
      await expect(page.getByRole("heading", { name: "Continuar partida?" })).toBeVisible();
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      await expect(page.getByRole("banner")).toHaveText(placar!);
      await expect(page.getByRole("region", { name: carta! })).toBeVisible();
    }
    if (rodada === 11) await expect(page.getByText("Carta A", { exact: true })).toBeVisible();
    if (await correr.isVisible()) {
      await expect(page.getByText(/^O computador escolheu /)).toBeVisible();
      await correr.click();
    } else {
      // 2 toques na mesma linha: o 1º marca, o 2º envia.
      await primeiraLinha.click();
      await expect(page.getByText("toque de novo ▶")).toBeVisible();
      await primeiraLinha.click();
    }
    await expect(page.getByRole("heading", { name: /Você ganhou a rodada!|O computador ganhou\.|Empate!/ })).toBeVisible();
    if (rodada === 8) await expect(page.getByText(/^Super Trunfo! Ganha de qualquer carta\./)).toBeVisible();
    await proxima.click();
    if (await fim.isVisible()) break;
  }

  await expect(page.getByRole("heading", { level: 1, name: /Você ganhou!|O computador ganhou\.|Empate\./ })).toBeVisible();
  await expect(page.getByText("Ficou com todas as cartas.")).toBeVisible();
  await expect(page.getByText(/^Rodadas jogadas: \d+$/)).toBeVisible();

  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
  await expect(page.getByText("Fácil: você 0 × 1 computador", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jogar", exact: true })).toBeVisible();
});
