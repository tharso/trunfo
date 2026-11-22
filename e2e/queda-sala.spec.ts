import { expect, test, type Browser, type Page } from "@playwright/test";
import { criarSala, entrarPeloLink, novaPessoa, pessoasNaSala } from "./sala-ajuda";

// Queda de rede, Tirar, Cutucar, saída no meio e De fora (docs/spec.md, parte 9,
// itens 14 a 19), com o Durable Object e o alarme dele de verdade. O build do
// teste encurta os tempos (playwright.config.ts): queda de rede em 20 s, Cutucar
// em 3 s. No site são 60 s e 30 s.
const TEMPO_DE_QUEDA = 20_000;
const DE_FORA = "De fora, só olhando. Você entra na próxima partida.";

test.describe.configure({ mode: "parallel" });

/** Ana cria a sala, as outras entram pelo link, Ana começa. */
async function partida(browser: Browser, apelidos: string[]): Promise<Page[]> {
  const paginas = await Promise.all(apelidos.map(() => novaPessoa(browser)));
  const codigo = await criarSala(paginas[0], apelidos[0]);
  for (let i = 1; i < apelidos.length; i++) await entrarPeloLink(paginas[i], codigo, apelidos[i]);
  await expect(pessoasNaSala(paginas[0])).toHaveCount(apelidos.length);
  await paginas[0].getByRole("button", { name: "Começar" }).click();
  for (const pagina of paginas) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();
  return paginas;
}

/** O índice da página que vê "Sua vez". */
async function quemEscolhe(paginas: Page[]): Promise<number> {
  let quem = -1;
  await expect(async () => {
    const vez = await Promise.all(paginas.map((p) => p.getByText("Sua vez: escolha um atributo.").isVisible()));
    quem = vez.indexOf(true);
    expect(quem).toBeGreaterThanOrEqual(0);
  }).toPass();
  return quem;
}

/** Quem escolhe escolhe Sprint e passa o duelo; a rodada anda na tela dela. */
async function jogarUmaRodada(pagina: Page, rodada: number) {
  const linha = pagina.locator(".carta__linha").first();
  await linha.click();
  await linha.click();
  await pagina.getByRole("button", { name: "Pular ⏩" }).click();
  await pagina.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(pagina.getByText(`Rodada ${rodada + 1}/100`)).toBeVisible();
}

async function suaCarta(pagina: Page): Promise<string> {
  return (await pagina.getByRole("region", { name: /^Sua carta: / }).getAttribute("aria-label"))!;
}

test("a rede cai 10 s e a pessoa volta com as mesmas cartas", async ({ browser }) => {
  const [ana, bia, caio] = await partida(browser, ["Ana", "Bia", "Caio"]);
  const cartaDeBia = await suaCarta(bia);

  await bia.context().setOffline(true);
  // A partida para: todo mundo vê quem caiu; só o Anfitrião vê "Tirar".
  await expect(ana.getByText("Bia está sem rede. A partida espera até 60 s.")).toBeVisible();
  await expect(ana.getByRole("button", { name: "Tirar Bia" })).toBeVisible();
  await expect(caio.getByText("Bia está sem rede. A partida espera até 60 s.")).toBeVisible();
  await expect(caio.getByRole("button", { name: "Tirar Bia" })).toHaveCount(0);
  await bia.waitForTimeout(10_000);

  await bia.context().setOffline(false);
  await expect(ana.getByText("Bia está sem rede.", { exact: false })).toHaveCount(0);
  await expect(bia.getByText("Reconectando…")).toHaveCount(0, { timeout: 10_000 });
  await expect(bia.getByText("Rodada 1/100")).toBeVisible();
  expect(await suaCarta(bia)).toBe(cartaDeBia);
  await expect(bia.getByText(DE_FORA)).toHaveCount(0);

  // A partida segue.
  const paginas = [ana, bia, caio];
  await jogarUmaRodada(paginas[await quemEscolhe(paginas)], 1);
});

test("fechar a aba e abrir o link de novo volta direto para a partida, com as mesmas cartas", async ({ browser }) => {
  const [ana, bia] = await partida(browser, ["Ana", "Bia", "Caio"]);
  const cartaDeBia = await suaCarta(bia);
  const endereco = bia.url();

  await bia.close();
  await expect(ana.getByText("Bia está sem rede. A partida espera até 60 s.")).toBeVisible();

  // Mesmo celular (mesmo contexto: mesmo localStorage), aba nova, mesmo link: sem passar pelo Apelido.
  const biaDeNovo = await bia.context().newPage();
  await biaDeNovo.goto(endereco);
  await expect(biaDeNovo.getByText("Rodada 1/100")).toBeVisible();
  await expect(biaDeNovo.getByLabel("Apelido")).toHaveCount(0);
  expect(await suaCarta(biaDeNovo)).toBe(cartaDeBia);
  await expect(ana.getByText("Bia está sem rede.", { exact: false })).toHaveCount(0);
});

test("depois do tempo de queda, a pessoa fica De fora e a partida segue", async ({ browser }) => {
  const [ana, bia, caio] = await partida(browser, ["Ana", "Bia", "Caio"]);

  await bia.context().setOffline(true);
  await expect(ana.getByText("Bia está sem rede. A partida espera até 60 s.")).toBeVisible();
  await expect(ana.getByText("Bia está sem rede.", { exact: false })).toHaveCount(0, { timeout: TEMPO_DE_QUEDA + 10_000 });
  await expect(ana.getByRole("img", { name: /Bia 0 cartas/ })).toBeVisible();

  // Bia volta: De fora, sem carta própria, vendo a partida.
  await bia.context().setOffline(false);
  // (A reconexão do partysocket tenta de novo a cada 4 s, no máximo.)
  await expect(bia.getByText(DE_FORA)).toBeVisible({ timeout: 10_000 });
  await expect(bia.getByRole("region", { name: /^Sua carta: / })).toHaveCount(0);

  // A partida segue entre Ana e Caio, e Bia vê o duelo.
  const jogando = [ana, caio];
  const quem = jogando[await quemEscolhe(jogando)];
  const apelido = quem === ana ? "Ana" : "Caio";
  await jogarUmaRodada(quem, 1);
  await expect(bia.getByText(`${apelido} escolheu Sprint.`)).toBeVisible();
  await bia.getByRole("button", { name: "Mostrar cartas!" }).click();
  await expect(bia.getByRole("dialog", { name: "Duelo" })).toBeVisible();
});

test("o Anfitrião sai pelo menu e a próxima pessoa da mesa vira Anfitrião", async ({ browser }) => {
  const [ana, bia, caio] = await partida(browser, ["Ana", "Bia", "Caio"]);

  await ana.getByRole("button", { name: "Menu" }).click();
  await expect(ana.getByText("Suas cartas saem do jogo.")).toBeVisible();
  await ana.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(ana.getByText(DE_FORA)).toBeVisible();
  await expect(bia.getByRole("img", { name: /Ana 0 cartas/ })).toBeVisible();

  // Caio cai: quem tem o "Tirar" agora é Bia, a próxima da Ordem da mesa.
  await caio.context().setOffline(true);
  await expect(bia.getByRole("button", { name: "Tirar Caio" })).toBeVisible();
  await expect(ana.getByText("Caio está sem rede. A partida espera até 60 s.")).toBeVisible();
  await expect(ana.getByRole("button", { name: "Tirar Caio" })).toHaveCount(0);

  // Bia tira Caio: com uma pessoa só na partida, Bia ganha.
  await bia.getByRole("button", { name: "Tirar Caio" }).click();
  await expect(bia.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  await expect(ana.getByRole("heading", { level: 1, name: "Bia ganhou." })).toBeVisible();
  await expect(ana.getByRole("list", { name: "Cartas no monte" }).getByRole("listitem")).toHaveText([
    /Bia.*\d+ cartas/,
    /Ana.*saiu/,
    /Caio.*saiu/,
  ]);
});

test("Cutucar: depois do tempo sem escolha, quem escolhe recebe a cutucada", async ({ browser }) => {
  const paginas = await partida(browser, ["Ana", "Bia"]);
  for (const pagina of paginas) {
    await pagina.evaluate(() => {
      (window as unknown as { vibracoes: number[][] }).vibracoes = [];
      navigator.vibrate = ((padrao: number | number[]) => {
        (window as unknown as { vibracoes: number[][] }).vibracoes.push([padrao].flat());
        return true;
      }) as typeof navigator.vibrate;
    });
  }
  const vez = await quemEscolhe(paginas);
  const [quem, outra] = [paginas[vez], paginas[1 - vez]];
  await expect(quem.getByRole("button", { name: "Cutucar" })).toHaveCount(0);
  await outra.getByRole("button", { name: "Cutucar" }).click();
  await expect
    .poll(() => quem.evaluate(() => (window as unknown as { vibracoes: number[][] }).vibracoes.length))
    .toBeGreaterThan(0);

  // Quem escolhe escolhe: o "Cutucar" some.
  await jogarUmaRodada(quem, 1);
  await outra.getByRole("button", { name: "Mostrar cartas!" }).click();
  await outra.getByRole("button", { name: "Pular ⏩" }).click();
  await outra.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(outra.getByText("Rodada 2/100")).toBeVisible();
});
