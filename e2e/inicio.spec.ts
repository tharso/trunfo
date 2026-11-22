import { expect, test } from "@playwright/test";

test("o Início mostra o título, o botão Jogar e o aviso de jogo de fã", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jogar", exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Jogo de fã, sem fins lucrativos. Sem ligação com a Grow, a UCI, as equipes ou os ciclistas.",
    ),
  ).toBeVisible();
});

test("o Início escolhe o Nível e abre o Como jogar, que volta ao Início", async ({ page }) => {
  await page.goto("/");

  const facil = page.getByRole("radio", { name: /^Fácil/ });
  const normal = page.getByRole("radio", { name: /^Normal/ });
  await expect(facil).toBeChecked();
  await page.getByText("Normal", { exact: true }).click();
  await expect(normal).toBeChecked();

  await page.getByRole("button", { name: "Como jogar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Como jogar" })).toBeVisible();
  for (const parte of ["Rodada", "Super Trunfo", "Carta A", "Empate", "Fim"]) {
    await expect(page.getByRole("heading", { level: 2, name: parte, exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
  await expect(normal).toBeChecked();
});
