import { expect, test } from "@playwright/test";

test("o Início mostra o título, o botão Jogar e o aviso de jogo de fã", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jogar" })).toBeVisible();
  await expect(
    page.getByText(
      "Jogo de fã, sem fins lucrativos. Sem ligação com a Grow, a UCI, as equipes ou os ciclistas.",
    ),
  ).toBeVisible();
});
