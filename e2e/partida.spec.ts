import { expect, test } from "@playwright/test";

// O único teste de ponta a ponta da partida: joga uma partida inteira até o Fim.
// `?semente=231` fixa o sorteio (baralho, quem começa e as escolhas do Computador).
// Com a pessoa escolhendo sempre a primeira linha (Sprint), essa semente acaba
// em 20 rodadas. A semente só fixa o sorteio; quem decide as regras é o módulo.
test("joga uma partida inteira contra o Computador até o Fim", async ({ page }) => {
  await page.goto("/?semente=231");
  await page.getByRole("button", { name: "Jogar" }).click();

  const fim = page.getByRole("button", { name: "Jogar de novo" });
  const proxima = page.getByRole("button", { name: "Próxima rodada" });
  const correr = page.getByRole("button", { name: "Correr!" });
  const primeiraLinha = page.locator(".carta__linha").first();

  for (let rodada = 1; rodada <= 100; rodada++) {
    await expect(page.getByText(`Rodada ${rodada}/100`)).toBeVisible();
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
    await proxima.click();
    if (await fim.isVisible()) break;
  }

  await expect(page.getByRole("heading", { level: 1, name: /Você ganhou!|O computador ganhou\.|Empate\./ })).toBeVisible();
  await expect(page.getByText("Ficou com todas as cartas.")).toBeVisible();
  await expect(page.getByText(/^Rodadas jogadas: \d+$/)).toBeVisible();

  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
});
