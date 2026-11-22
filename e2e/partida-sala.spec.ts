import { expect, test, type Page } from "@playwright/test";
import { criarSala, entrarPeloLink, novaPessoa } from "./sala-ajuda";

// A partida de 2 pessoas pela sala (docs/spec.md, parte 9, itens 9 a 11, 20,
// 21 e 26), com o Durable Object de verdade. O build do teste fixa a semente
// da sala (playwright.config.ts): com todo mundo escolhendo Sprint (a primeira
// linha), Ana começa, ganha as 7 primeiras rodadas e fica com todas as cartas
// na 20ª. A semente só fixa o sorteio; quem decide é o módulo de regras.

/** Ana cria a sala, Bia entra pelo link, Ana começa. */
async function partidaDeDuas(browser: Parameters<typeof novaPessoa>[0]): Promise<[Page, Page]> {
  const ana = await novaPessoa(browser);
  const bia = await novaPessoa(browser);
  const codigo = await criarSala(ana, "Ana");
  await entrarPeloLink(bia, codigo, "Bia");
  await ana.getByRole("button", { name: "Começar" }).click();
  for (const pagina of [ana, bia]) await expect(pagina.getByText("Rodada 1/100")).toBeVisible();
  return [ana, bia];
}

/** Quem escolhe: 2 toques na primeira linha (Sprint). O duelo abre. */
async function escolherSprint(pagina: Page) {
  await expect(pagina.getByText("Sua vez: escolha um atributo.")).toBeVisible();
  const primeiraLinha = pagina.locator(".carta__linha").first();
  await primeiraLinha.click();
  await expect(pagina.getByText("toque de novo ▶")).toBeVisible();
  await primeiraLinha.click();
}

/** Pula o duelo, confere o resultado e toca em "Próxima rodada". */
async function terminarDuelo(pagina: Page, titulo: RegExp | string) {
  const duelo = pagina.getByRole("dialog", { name: "Duelo" });
  await expect(duelo).toBeVisible();
  await pagina.getByRole("button", { name: "Pular ⏩" }).click();
  await expect(duelo.getByRole("heading", { level: 3 })).toHaveText(titulo);
  await pagina.getByRole("button", { name: "Próxima rodada" }).click();
}

const RESULTADO = /^(Você ganhou a rodada!|(Ana|Bia) ganhou\.|Empate!)$/;

test("duas pessoas jogam uma partida inteira pela sala até o Fim", async ({ browser }) => {
  const [ana, bia] = await partidaDeDuas(browser);
  // Cada celular vê só a própria carta, e o placar com o Apelido da outra pessoa.
  await expect(ana.getByRole("img", { name: "Você 16 cartas, monte de empate 0, Bia 16 cartas" })).toBeVisible();
  await expect(bia.getByRole("img", { name: "Você 16 cartas, monte de empate 0, Ana 16 cartas" })).toBeVisible();
  await expect(bia.getByRole("region", { name: /^Sua carta: / })).toHaveCount(1);

  for (let rodada = 1; rodada <= 100; rodada++) {
    for (const pagina of [ana, bia]) await expect(pagina.getByText(`Rodada ${rodada}/100`)).toBeVisible();
    const vez = ana.getByText("Sua vez: escolha um atributo.");
    await expect(vez.or(ana.getByText("Bia está escolhendo…"))).toBeVisible();
    const [quemEscolhe, outra, apelido] = (await vez.isVisible()) ? [ana, bia, "Ana"] : [bia, ana, "Bia"];
    await expect(outra.getByText(`${apelido} está escolhendo…`)).toBeVisible();

    await escolherSprint(quemEscolhe);
    await terminarDuelo(quemEscolhe, RESULTADO);

    // Quem não escolheu vê a linha marcada, "Ana escolheu Sprint." e "Mostrar cartas!".
    await expect(outra.getByText(`${apelido} escolheu Sprint.`)).toBeVisible();
    await expect(outra.locator(".carta__linha--marcada")).toHaveCount(1);
    await outra.getByRole("button", { name: "Mostrar cartas!" }).click();
    await terminarDuelo(outra, RESULTADO);

    const fim = ana.getByRole("heading", { level: 1 });
    await expect(fim.or(ana.getByText(`Rodada ${rodada + 1}/100`))).toBeVisible();
    if (await fim.isVisible()) break;
  }

  await expect(ana.getByRole("heading", { level: 1, name: "Você ganhou!" })).toBeVisible();
  await expect(bia.getByRole("heading", { level: 1, name: "Ana ganhou." })).toBeVisible();
  for (const pagina of [ana, bia]) {
    await expect(pagina.getByText("Ficou com todas as cartas.")).toBeVisible();
    await expect(pagina.getByRole("list", { name: "Cartas no monte" }).getByRole("listitem")).toHaveText([
      /Ana.*32 cartas/,
      /Bia.*0 cartas/,
    ]);
    await expect(pagina.getByText("Rodadas jogadas: 20")).toBeVisible();
  }
  // No fim, só o Anfitrião vê "Jogar de novo"; todo mundo vê "Sair" (e2e/vida-sala.spec.ts joga de novo).
  await expect(ana.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(bia.getByRole("button", { name: "Jogar de novo" })).toHaveCount(0);

  // Partidas do multiplayer não entram no Retrospecto.
  await bia.getByRole("button", { name: "Sair" }).click();
  await expect(bia.getByRole("heading", { level: 1, name: "Super Trunfo Ciclismo" })).toBeVisible();
  // A sala cria a partida com o Nível "normal" por dentro: nenhum Nível conta a partida.
  await expect(bia.getByText("Fácil: você 0 × 0 computador", { exact: true })).toBeVisible();
  await bia.getByText("Normal", { exact: true }).click();
  await expect(bia.getByText("Normal: você 0 × 0 computador", { exact: true })).toBeVisible();
});

test("cada um no seu ritmo: quem é lento não trava quem escolhe", async ({ browser }) => {
  const [ana, bia] = await partidaDeDuas(browser);

  // Bia não toca em nada. Ana escolhe e passa 3 rodadas (ganha as 3).
  for (let rodada = 1; rodada <= 3; rodada++) {
    await expect(ana.getByText(`Rodada ${rodada}/100`)).toBeVisible();
    await escolherSprint(ana);
    await terminarDuelo(ana, "Você ganhou a rodada!");
  }
  await expect(ana.getByText("Rodada 4/100")).toBeVisible();
  await expect(ana.getByText("Sua vez: escolha um atributo.")).toBeVisible();

  // Bia continua na rodada 1, com as rodadas de Ana na fila, uma de cada vez.
  await expect(bia.getByText("Rodada 1/100")).toBeVisible();
  for (let rodada = 1; rodada <= 3; rodada++) {
    await expect(bia.getByText(`Rodada ${rodada}/100`)).toBeVisible();
    await expect(bia.getByText("Ana escolheu Sprint.")).toBeVisible();
    await bia.getByRole("button", { name: "Mostrar cartas!" }).click();
    await terminarDuelo(bia, "Ana ganhou.");
  }
  // Bia chegou onde Ana está: Ana está escolhendo a 4ª rodada.
  await expect(bia.getByText("Rodada 4/100")).toBeVisible();
  await expect(bia.getByText("Ana está escolhendo…")).toBeVisible();
});
