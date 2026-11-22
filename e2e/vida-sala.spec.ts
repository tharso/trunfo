import { expect, test, type Page } from "@playwright/test";
import { criarSala, entrarPeloLink, novaPessoa, pessoasNaSala } from "./sala-ajuda";

// Vida da sala (docs/spec.md, parte 9, itens 21 a 25), com o Durable Object e o
// alarme dele de verdade. As partidas são curtas: as pessoas saem pelo menu e
// quem sobra ganha (item 15). O build do teste fecha a sala sem ninguém em 5 s
// (playwright.config.ts); no site são 10 min.
const TEMPO_DA_SALA_VAZIA = 5_000;

test.describe.configure({ mode: "parallel" });

/** Menu ☰ → Sair: a pessoa sai da partida e fica De fora. */
async function sairDaPartida(pagina: Page) {
  await pagina.getByRole("button", { name: "Menu" }).click();
  await pagina.getByRole("button", { name: "Sair", exact: true }).click();
}

function fimDaPartida(pagina: Page) {
  return pagina.getByRole("list", { name: "Cartas no monte" }).getByRole("listitem");
}

test("três partidas seguidas na mesma sala, com gente nova entrando entre elas", async ({ browser }) => {
  test.setTimeout(90_000);
  const [ana, bia, caio, duda] = await Promise.all([1, 2, 3, 4].map(() => novaPessoa(browser)));
  const codigo = await criarSala(ana, "Ana");
  await entrarPeloLink(bia, codigo, "Bia");
  await expect(pessoasNaSala(ana)).toHaveCount(2);
  await ana.getByRole("button", { name: "Começar" }).click();
  for (const pagina of [ana, bia]) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();

  // 1ª partida: Bia sai, Ana ganha. Só o Anfitrião vê "Jogar de novo".
  await sairDaPartida(bia);
  await expect(ana.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  await expect(bia.getByRole("heading", { level: 1, name: "Ana ganhou." })).toBeVisible();
  await expect(ana.getByRole("button", { name: "Jogar de novo" })).toBeEnabled();
  await expect(bia.getByRole("button", { name: "Jogar de novo" })).toHaveCount(0);

  // Entre partidas, Caio entra pelo link e vai para o fim da Ordem da mesa.
  await entrarPeloLink(caio, codigo, "Caio");
  await expect(pessoasNaSala(caio)).toHaveText([/Ana.*Anfitrião/, /Bia/, /Caio.*você/]);
  await expect(caio.getByText("Esperando o Anfitrião começar…")).toBeVisible();
  // Quem jogou continua na tela de fim.
  await expect(bia.getByRole("heading", { level: 1, name: "Ana ganhou." })).toBeVisible();

  // 2ª partida: Ana joga de novo com quem ficou (Bia, que estava De fora) e Caio.
  await ana.getByRole("button", { name: "Jogar de novo" }).click();
  for (const pagina of [ana, bia, caio]) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();
  await expect(caio.getByRole("img", { name: /^Você \d+ cartas, monte de empate \d+, Ana \d+ cartas, Bia \d+ cartas$/ })).toBeVisible();
  await expect(bia.getByRole("region", { name: /^Sua carta: / })).toHaveCount(1);
  await sairDaPartida(bia);
  await sairDaPartida(caio);
  await expect(ana.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  await expect(fimDaPartida(caio)).toHaveText([/Ana.*cartas/, /Bia.*saiu/, /Caio.*saiu/]);

  // Duda entra entre partidas: agora a sala tem 4.
  await entrarPeloLink(duda, codigo, "Duda");
  await expect(pessoasNaSala(duda)).toHaveText([/Ana/, /Bia/, /Caio/, /Duda.*você/]);

  // 3ª partida, com as quatro. Ana sai: o papel de Anfitrião passa para Bia.
  await ana.getByRole("button", { name: "Jogar de novo" }).click();
  for (const pagina of [ana, bia, caio, duda]) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();
  await sairDaPartida(ana);
  await sairDaPartida(caio);
  await sairDaPartida(duda);
  await expect(bia.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  await expect(fimDaPartida(duda)).toHaveText([/Bia.*cartas/, /Ana.*saiu/, /Caio.*saiu/, /Duda.*saiu/]);
  await expect(bia.getByRole("button", { name: "Jogar de novo" })).toBeEnabled();
  await expect(ana.getByRole("button", { name: "Jogar de novo" })).toHaveCount(0);

  // "Sair" no fim: a pessoa vai embora da sala.
  await duda.getByRole("button", { name: "Sair" }).click();
  await expect(duda.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
});

test("a sala fecha depois que a última pessoa sai, e o link mostra que acabou", async ({ browser }) => {
  const ana = await novaPessoa(browser);
  const codigo = await criarSala(ana, "Ana");
  await ana.getByRole("button", { name: "Sair" }).click();
  await expect(ana.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();

  // O alarme da sala apaga tudo (no site, depois de 10 min; aqui, de 5 s).
  await ana.waitForTimeout(TEMPO_DA_SALA_VAZIA + 3_000);
  const bia = await novaPessoa(browser);
  await entrarPeloLink(bia, codigo, "Bia");
  await expect(bia.getByText("Esta sala já acabou")).toBeVisible();
  await bia.getByRole("button", { name: "Criar sala" }).click();
  await expect(bia.getByRole("button", { name: "Criar sala" })).toBeVisible();
  await expect(bia.getByLabel("Apelido")).toHaveValue("Bia");
});
