import { expect, test } from "@playwright/test";
import { criarSala, entrarPeloCodigo, entrarPeloLink, novaPessoa, pessoasNaSala } from "./sala-ajuda";

// A Sala do multiplayer (docs/spec.md, parte 9, itens 1 a 8), com o Durable
// Object de verdade (Worker manda /sala/<código> para o DO). Cada pessoa é um
// contexto de navegador próprio: celular próprio, localStorage próprio.

test("uma pessoa entra pelo link, outra pelo código, na Ordem da mesa", async ({ browser }) => {
  const ana = await novaPessoa(browser);
  const bia = await novaPessoa(browser);
  const caio = await novaPessoa(browser);

  const codigo = await criarSala(ana, "Ana");
  await expect(ana).toHaveURL(`/s/${codigo}`);
  await entrarPeloLink(bia, codigo, "Bia");
  await entrarPeloCodigo(caio, codigo, "Caio");

  for (const pagina of [ana, bia, caio]) {
    await expect(pagina.locator(".sala__codigo")).toHaveText(codigo);
    await expect(pessoasNaSala(pagina)).toHaveText([/^Ana.*Anfitrião/, /Bia/, /Caio/]);
  }
  await expect(pessoasNaSala(bia).nth(1)).toContainText("você");

  // Só o Anfitrião vê "Começar".
  await expect(bia.getByText("Esperando o Anfitrião começar…")).toBeVisible();
  await expect(bia.getByRole("button", { name: "Começar" })).toHaveCount(0);
  await ana.getByRole("button", { name: "Começar" }).click();
  for (const pagina of [ana, bia, caio]) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();

  // Durante a partida, ninguém entra.
  const davi = await novaPessoa(browser);
  await entrarPeloCodigo(davi, codigo, "Davi");
  await expect(davi.getByText("Esta sala está no meio de uma partida.", { exact: false })).toBeVisible();
});

test("Apelido repetido ganha número; o celular lembra o Apelido e a pessoa", async ({ browser }) => {
  const ana = await novaPessoa(browser);
  const outraAna = await novaPessoa(browser);
  const codigo = await criarSala(ana, "Ana");
  await entrarPeloLink(outraAna, codigo, "Ana");
  await expect(pessoasNaSala(ana)).toHaveText([/Ana/, /Ana 2/]);

  // Recarregar a página: o Apelido vem preenchido e o identificador secreto
  // devolve a pessoa ao mesmo lugar, sem virar "Ana 3".
  await outraAna.reload();
  await expect(outraAna.getByLabel("Apelido")).toHaveValue("Ana");
  await outraAna.getByRole("button", { name: "Entrar na sala" }).click();
  await expect(pessoasNaSala(outraAna)).toHaveText([/Ana/, /Ana 2.*você/]);
  await expect(pessoasNaSala(ana)).toHaveCount(2);
});

test("a quinta pessoa vê que a sala está cheia", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "uma vez basta");
  const ana = await novaPessoa(browser);
  const codigo = await criarSala(ana, "Ana");
  for (const apelido of ["Bia", "Caio", "Davi"]) await entrarPeloLink(await novaPessoa(browser), codigo, apelido);
  await expect(pessoasNaSala(ana)).toHaveCount(4);

  const eva = await novaPessoa(browser);
  await entrarPeloLink(eva, codigo, "Eva");
  await expect(eva.getByText("Esta sala está cheia: já tem 4 pessoas.")).toBeVisible();
});

test("link de uma sala que não existe mostra que ela já acabou", async ({ page }) => {
  // ZZZ nunca foi criada por este teste; um código sorteado por outro teste
  // nas últimas rodadas seria azar de 1 em 13.824.
  await entrarPeloLink(page, "ZZZ", "Ana");
  await expect(page.getByText("Esta sala já acabou")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar sala" })).toBeVisible();
});

test("sem internet, Jogar com amigos mostra Precisa de internet", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Jogar com amigos" }).click();
  await expect(page.getByText("Precisa de internet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar sala" })).toHaveCount(0);
  // O modo solo continua normal.
  await page.getByRole("button", { name: "Voltar" }).click();
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ver minha primeira carta" })).toBeVisible();
});

// O workerd tira da memória o DO que só tem sockets hibernáveis e fica ~10 s
// parado. Quem entra depois disso tem de ver a mesma sala: o estado está no
// storage do DO e quem está em cada socket, no attachment. Se a sala guardasse
// algo em campo da classe, a lista viria vazia ou sem as pessoas de antes.
test("a sala continua igual depois de hibernar", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "uma vez basta: o teste espera 15 s parado");
  test.slow();
  const ana = await novaPessoa(browser);
  const bia = await novaPessoa(browser);
  const codigo = await criarSala(ana, "Ana");
  await entrarPeloLink(bia, codigo, "Bia");
  await expect(pessoasNaSala(ana)).toHaveCount(2);

  await ana.waitForTimeout(15_000);

  const caio = await novaPessoa(browser);
  await entrarPeloCodigo(caio, codigo, "Caio");
  for (const pagina of [ana, bia, caio]) {
    await expect(pessoasNaSala(pagina)).toHaveText([/Ana.*Anfitrião/, /Bia/, /Caio/]);
  }
  // Ninguém precisou reconectar.
  for (const pagina of [ana, bia]) await expect(pagina.getByText("Reconectando…")).toHaveCount(0);
  await expect(ana.getByRole("button", { name: "Começar" })).toBeEnabled();
});

// O PWA serve o index.html do precache para qualquer navegação (modo solo sem
// internet). /sala/* fica de fora: com o service worker no controle, quem
// responde é o Durable Object (que só aceita WebSocket), não o jogo. A página do
// link (/s/<código>) é do jogo.
test("o service worker do PWA não responde por /sala/*, só pela página do link", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  const resposta = await page.goto("/sala/ABC");
  expect(resposta?.status()).toBe(426);
  await expect(page.getByText("Esta rota só aceita WebSocket.")).toBeVisible();

  await page.goto("/s/ABC");
  await expect(page.getByText("Sala ABC")).toBeVisible();
  await expect(page.getByLabel("Apelido")).toBeVisible();
});
