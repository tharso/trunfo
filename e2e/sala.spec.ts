import { expect, test, type Page } from "@playwright/test";

// Prova do ticket #36: dois navegadores trocam mensagens pelo Durable Object da
// sala (Worker manda /sala/<código> para o DO). Usa a página de teste
// sala-teste.html, que conecta com partysocket.

async function entrar(pagina: Page, codigo: string) {
  await pagina.goto(`/sala-teste.html?sala=${codigo}`);
  await expect(pagina.getByText("Conectado")).toBeVisible();
}

async function mandar(pagina: Page, texto: string) {
  await pagina.getByLabel("Mensagem").fill(texto);
  await pagina.getByRole("button", { name: "Mandar" }).click();
}

test("dois navegadores trocam mensagens pela sala", async ({ browser }, info) => {
  const codigo = `T${info.project.name}${Date.now()}`;
  const ana = await (await browser.newContext()).newPage();
  const bia = await (await browser.newContext()).newPage();

  await entrar(ana, codigo);
  await entrar(bia, codigo);

  await mandar(ana, "oi, Bia");
  await expect(bia.getByRole("listitem").filter({ hasText: "oi, Bia" })).toBeVisible();

  await mandar(bia, "oi, Ana");
  await expect(ana.getByRole("listitem").filter({ hasText: "oi, Ana" })).toBeVisible();
});

// O workerd tira da memória o DO que só tem sockets hibernáveis e fica ~10 s
// parado. A `instancia` (gerada no construtor) muda quando ele acorda; a conexão
// do navegador continua a mesma ("conexão 1"), e o storage do DO sobrevive.
test("as mensagens continuam passando depois que a sala hiberna", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "uma vez basta: o teste espera 15 s parado");
  test.slow();
  const codigo = `H${Date.now()}`;
  const ana = await (await browser.newContext()).newPage();
  const bia = await (await browser.newContext()).newPage();
  await entrar(ana, codigo);
  await entrar(bia, codigo);

  await mandar(ana, "antes");
  const antes = bia.getByRole("listitem").filter({ hasText: "antes" });
  await expect(antes).toContainText("mensagem 1");
  const instanciaAntes = /instância (\w+)/.exec((await antes.textContent()) ?? "")![1];

  await bia.waitForTimeout(15_000);

  await mandar(bia, "depois");
  const depois = ana.getByRole("listitem").filter({ hasText: "depois" });
  await expect(depois).toContainText("mensagem 2");
  await expect(depois).not.toContainText(`instância ${instanciaAntes}`);
  for (const pagina of [ana, bia]) await expect(pagina.getByText(/conexão 1\)/)).toBeVisible();
});

// O PWA serve o index.html do precache para qualquer navegação (modo solo sem
// internet). /sala/* fica de fora: com o service worker no controle, quem
// responde é o Durable Object (que só aceita WebSocket), não o jogo.
test("o service worker do PWA não responde por /sala/*", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  const resposta = await page.goto("/sala/ABC");
  expect(resposta?.status()).toBe(426);
  await expect(page.getByText("Esta rota só aceita WebSocket.")).toBeVisible();
});

test("salas diferentes não se misturam", async ({ browser }, info) => {
  const base = `T${info.project.name}${Date.now()}`;
  const ana = await (await browser.newContext()).newPage();
  const bia = await (await browser.newContext()).newPage();

  await entrar(ana, `${base}a`);
  await entrar(bia, `${base}b`);

  await mandar(ana, "só para a sala A");
  await expect(ana.getByRole("listitem").filter({ hasText: "só para a sala A" })).toBeVisible();
  await expect(bia.getByRole("listitem")).toHaveCount(0);
});
