import { expect, type Browser, type Page } from "@playwright/test";

// Passos da sala usados por mais de um teste. Cada pessoa é um contexto de
// navegador próprio: celular próprio, localStorage próprio.

export async function novaPessoa(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

export async function escreverApelido(pagina: Page, apelido: string, botao: "Criar sala" | "Entrar na sala") {
  await pagina.getByLabel("Apelido").fill(apelido);
  await pagina.getByRole("button", { name: botao }).click();
}

/** Início → Jogar com amigos → Criar sala → Apelido. Devolve o código da sala. */
export async function criarSala(pagina: Page, apelido: string): Promise<string> {
  await pagina.goto("/");
  await pagina.getByRole("button", { name: "Jogar com amigos" }).click();
  await pagina.getByRole("button", { name: "Criar sala" }).click();
  await escreverApelido(pagina, apelido, "Criar sala");
  const codigo = pagina.locator(".sala__codigo");
  await expect(codigo).toHaveText(/^[A-HJ-NP-Z]{3}$/);
  return (await codigo.textContent())!;
}

/** O link da sala pula "Jogar com amigos" e vai direto para o Apelido. */
export async function entrarPeloLink(pagina: Page, codigo: string, apelido: string) {
  await pagina.goto(`/s/${codigo}`);
  await expect(pagina.getByText(`Sala ${codigo}`)).toBeVisible();
  await escreverApelido(pagina, apelido, "Entrar na sala");
}

/** Início → Jogar com amigos → Entrar com código (digitado em minúsculas) → Apelido. */
export async function entrarPeloCodigo(pagina: Page, codigo: string, apelido: string) {
  await pagina.goto("/");
  await pagina.getByRole("button", { name: "Jogar com amigos" }).click();
  await pagina.getByRole("button", { name: "Entrar com código" }).click();
  await pagina.getByLabel("Código da sala").fill(codigo.toLowerCase());
  await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
  await escreverApelido(pagina, apelido, "Entrar na sala");
}

export function pessoasNaSala(pagina: Page) {
  return pagina.getByRole("list", { name: "Pessoas na sala" }).getByRole("listitem");
}
