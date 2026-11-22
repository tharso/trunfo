import { expect, test, type Browser, type Page } from "@playwright/test";
import { criarSala, entrarPeloLink, novaPessoa, pessoasNaSala } from "./sala-ajuda";

// A partida de 3 ou 4 pessoas pela sala (docs/spec.md, parte 9, itens 12, 13,
// 20 e 21), com o Durable Object de verdade. O build do teste fixa a semente da
// sala (playwright.config.ts). Com ela e estas escolhas (a linha da carta, na
// ordem Sprint, Explosão, Montanha, Contrarrelógio, Pavê, Voltas), Caio fica
// sem cartas na 8ª rodada, Bia na 12ª, Duda na 16ª, e Ana fica com todas as
// cartas na 17ª (src/sala/sala.test.ts confere a mesma partida sem rede).
const ESCOLHAS = "50200042440402244";

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

/** Quem escolhe: 2 toques na linha `linha` da carta. O duelo abre. */
async function escolherLinha(pagina: Page, linha: number) {
  await expect(pagina.getByText("Sua vez: escolha um atributo.")).toBeVisible();
  const alvo = pagina.locator(".carta__linha").nth(linha);
  await alvo.click();
  await expect(pagina.getByText("toque de novo ▶")).toBeVisible();
  await alvo.click();
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

/** Pula o duelo, confere o resultado e toca em "Próxima rodada". */
async function terminarDuelo(pagina: Page, titulo: RegExp) {
  const duelo = pagina.getByRole("dialog", { name: "Duelo" });
  await expect(duelo).toBeVisible();
  await pagina.getByRole("button", { name: "Pular ⏩" }).click();
  await expect(duelo.getByRole("heading", { level: 3 })).toHaveText(titulo);
  await pagina.getByRole("button", { name: "Próxima rodada" }).click();
}

/** Nada passa da largura da tela (sem rolagem para o lado). */
async function semRolagemParaOLado(pagina: Page) {
  const larguras = await pagina.evaluate(() => {
    const raiz = document.documentElement;
    const duelo = document.querySelector(".duelo");
    return {
      pagina: raiz.scrollWidth - raiz.clientWidth,
      duelo: duelo ? duelo.scrollWidth - duelo.clientWidth : 0,
    };
  });
  expect(larguras).toEqual({ pagina: 0, duelo: 0 });
}

const RESULTADO = /^(Você ganhou a rodada!|(Ana|Bia|Caio|Duda) ganhou\.|Empate!)$/;

test("quatro pessoas jogam até o fim, e quem fica sem cartas sai e continua vendo", async ({ browser }) => {
  test.setTimeout(120_000);
  const apelidos = ["Ana", "Bia", "Caio", "Duda"];
  const paginas = await partida(browser, apelidos);
  const [ana, , caio] = paginas;
  // Placar dividido: a sua parte, o monte de empate e uma parte por pessoa, com as iniciais.
  await expect(
    caio.getByRole("img", { name: "Você 8 cartas, monte de empate 0, Ana 8 cartas, Bia 8 cartas, Duda 8 cartas" }),
  ).toBeVisible();
  await expect(caio.locator(".placar__outro")).toHaveText(["A", "B", "D"]);

  for (let rodada = 1; rodada <= ESCOLHAS.length; rodada++) {
    for (const pagina of paginas) await expect(pagina.getByText(`Rodada ${rodada}/100`)).toBeVisible();
    // Quem escolhe é quem vê "Sua vez"; as outras pessoas veem quem está escolhendo.
    const quem = await quemEscolhe(paginas);
    for (const [i, pagina] of paginas.entries()) {
      if (i !== quem) await expect(pagina.getByText(`${apelidos[quem]} está escolhendo…`)).toBeVisible();
    }

    await escolherLinha(paginas[quem], Number(ESCOLHAS[rodada - 1]));
    await terminarDuelo(paginas[quem], RESULTADO);
    for (const [i, pagina] of paginas.entries()) {
      if (i === quem) continue;
      await expect(pagina.getByText(new RegExp(`^${apelidos[quem]} escolheu `))).toBeVisible();
      await pagina.getByRole("button", { name: "Mostrar cartas!" }).click();
      // Uma faixa por pessoa que ainda tem cartas, com o apelido.
      await expect(pagina.locator(".duelo__faixa").first()).toBeVisible();
      await terminarDuelo(pagina, RESULTADO);
    }

    if (rodada === 8) {
      // Caio ficou sem cartas: fica De fora, olhando, sem carta própria.
      await expect(caio.getByText("De fora, só olhando. Você entra na próxima partida.")).toBeVisible();
      await expect(caio.getByRole("region", { name: /^Sua carta: / })).toHaveCount(0);
    }
  }

  await expect(ana.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  for (const pagina of paginas.slice(1)) {
    await expect(pagina.getByRole("heading", { level: 1, name: "Ana ganhou." })).toBeVisible();
  }
  for (const pagina of paginas) {
    await expect(pagina.getByText("Ficou com todas as cartas.")).toBeVisible();
    await expect(pagina.getByRole("list", { name: "Cartas no monte" }).getByRole("listitem")).toHaveText([
      /Ana.*32 cartas/,
      /Bia.*0 cartas/,
      /Caio.*0 cartas/,
      /Duda.*0 cartas/,
    ]);
    await expect(pagina.getByText("Rodadas jogadas: 17")).toBeVisible();
  }
});

test("o duelo e o placar cabem no celular com 4 apelidos de 20 letras", async ({ browser }) => {
  const apelidos = ["Anastácia Gonçalves", "Bianca Albuquerque S", "Caio Henrique Mattos", "Duda Fernandes Lima"];
  const paginas = await partida(browser, apelidos);
  for (const pagina of paginas) await semRolagemParaOLado(pagina);
  const quem = await quemEscolhe(paginas);
  const escolhe = paginas[quem];
  const outra = paginas[(quem + 1) % 4];
  await escolherLinha(escolhe, Number(ESCOLHAS[0]));
  const duelo = escolhe.getByRole("dialog", { name: "Duelo" });
  await expect(duelo.locator(".duelo__faixa")).toHaveCount(4);
  // A sua faixa primeiro; as outras na Ordem da mesa.
  await expect(duelo.locator(".duelo__pessoa")).toHaveText(["Você", ...apelidos.filter((_, i) => i !== quem)]);
  await escolhe.getByRole("button", { name: "Pular ⏩" }).click();
  await expect(duelo.getByRole("heading", { level: 3 })).toBeVisible();
  await semRolagemParaOLado(escolhe);
  // O resultado e os botões aparecem sem rolar a tela.
  await expect(escolhe.getByRole("button", { name: "Próxima rodada" })).toBeInViewport({ ratio: 1 });
  await expect(escolhe.getByRole("button", { name: "Ver as cartas" })).toBeInViewport({ ratio: 1 });

  // "Ver as cartas" mostra as 4 cartas da mesa.
  await escolhe.getByRole("button", { name: "Ver as cartas" }).click();
  await expect(duelo.getByRole("region", { name: /^(Sua carta|Carta de .+): / })).toHaveCount(4);
  await semRolagemParaOLado(escolhe);

  // Quem não escolheu também vê o duelo inteiro na tela.
  await outra.getByRole("button", { name: "Mostrar cartas!" }).click();
  await outra.getByRole("button", { name: "Pular ⏩" }).click();
  await expect(outra.getByRole("button", { name: "Próxima rodada" })).toBeInViewport({ ratio: 1 });
  await semRolagemParaOLado(outra);
});
