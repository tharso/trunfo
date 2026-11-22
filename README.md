# Super Trunfo Ciclismo

## O jogo (site)

Node 22 (`.nvmrc`). Depois de `npm install`:

- `npm run dev`: roda o site local.
- `npm run build`: gera a versão de produção em `dist/`.
- `npm run deploy`: gera e publica na Cloudflare (pede `npx wrangler login` antes, uma vez).
- `npm test` (unidade), `npm run typecheck`, `npm run test:e2e` (Playwright; na 1ª vez, `npx playwright install chromium`).

## Tabela base

Os 180 primeiros do ranking individual UCI de 17/11/2026.

## As cartas (versão atual)

Notas de 1 a 99 em 6 atributos: Sprint, Explosão, Montanha, Contrarrelógio, Pavê e Voltas.
Elas vêm dos **resultados de 2023 a 2026** (ProCyclingStats), por confronto direto entre os 180:
quem chegou na frente de quem, em cada tipo de prova. Detalhes na aba Legenda da planilha.

Como refazer: no navegador embutido, numa página do procyclingstats.com com `window.RANK`
(lista dos 180), rodar `scripts/navegador/1_coleta_resultados.js` (~1h30) e depois
`scripts/navegador/2_elo.js`. Copiar o resultado para `data/raw/elo.json` e rodar o script abaixo.

## Arquivos

- `data/SuperTrunfo_Ciclistas.xlsx`: planilha com as abas Cartas, Watts estimados, Dados reais, Fontes, Modelo e Legenda.
- `data/cartas.csv`: as cartas do jogo (notas por confronto direto).
- `data/watts_estimados.csv`: o modelo antigo de watts, só como ficha técnica.
- `data/ciclistas.csv`: só dados reais, uma linha por ciclista.
- `scripts/modelo_potencia.py`: o modelo que estima os watts.
- `data/potencia_fontes.csv`: cada número de potência achado, com o link da fonte.
- `data/raw/`: dados brutos (perfil do ProCyclingStats e resultado da pesquisa de potência).
- `scripts/montar_tabela.py`: monta a tabela a partir de `data/raw/`.

## De onde vem cada coisa

- Ranking, equipe, idade, peso, altura e pontos de especialidade: ProCyclingStats.
- Potência, FTP e VO2max: pesquisa na web. Só entram números publicados por uma fonte, com link.
  Na aba Dados reais, nada foi inventado. Célula vazia = nenhum número público achado.
- Aba Cartas: o modelo estima o que falta. Ele usa o tipo do ciclista (pontos do PCS),
  o nível (pontos UCI) e o peso, calibrado nos números publicados. Verde = número publicado.
  O valor final é o maior entre o estimado e o publicado. A curva nunca sobe com o tempo.

## Como remontar

```bash
uv run --with openpyxl python scripts/montar_tabela.py
```
