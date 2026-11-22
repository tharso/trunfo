# Super Trunfo Ciclismo

## O jogo (site)

Node 22 (`.nvmrc`). Depois de `npm install`:

- `npm run dev`: roda o site local, com o Worker e o Durable Object das salas (`/sala/<código>`).
- `npm run build`: gera a versão de produção em `dist/` (`dist/client/` são os arquivos estáticos).
- `npm run tipos:worker`: refaz os tipos do Worker (`src/worker/worker-configuration.d.ts`) depois de mudar o `wrangler.jsonc`.
- Deploy: automático. Cada merge no `main` publica em https://supertrunfo.tharso.com (Workers Builds da Cloudflare, ligado ao GitHub). `npm run deploy` publica à mão, se preciso (pede `npx wrangler login` antes, uma vez).
- `npm test` (unidade), `npm run typecheck`, `npm run test:e2e` (Playwright; na 1ª vez, `npx playwright install chromium`).

As regras ficam em `src/regras/` (TypeScript puro, sem tela): `criarPartida` e `aplicar(estado, ação)`,
que devolve o novo estado e os eventos. A tela (`src/telas/`) só manda ações e desenha.

**Sorteio fixo pela URL**: `?semente=231` fixa o sorteio da partida (embaralhar, quem começa e as
escolhas do Computador). Sem o parâmetro, a semente é aleatória. O teste Playwright usa isso para
jogar sempre a mesma partida (curta). A semente não muda regra nenhuma, só o resultado do sorteio.

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

## Fotos das cartas

As fotos originais (Wikimedia Commons) ficam em `data/fotos/`, com `creditos.csv` (autor, licença, página)
e `recorte.csv` (onde fica o rosto). O jogo usa as versões recortadas em `public/fotos/` e os créditos em
`src/dados/fotos.json`, gerados por:

```bash
uv run --with pillow python scripts/gerar_fotos.py
```

Carta sem linha no `recorte.csv` mostra as iniciais. Ver `docs/adr/0004-carta-com-foto.md`.

## O Baralho do jogo (32 cartas)

O jogo usa só 32 cartas (lista em `docs/spec.md`, parte 2). O arquivo que o jogo lê é
`src/dados/baralho.json`, gerado por:

```bash
uv run python scripts/gerar_baralho.py
uv run --with pytest pytest scripts/tests   # testes do gerador do baralho
```

O script é determinístico: rodar de novo com os mesmos dados dá o mesmo arquivo (há um teste para isso).
O lado do jogo confere o mesmo arquivo em `src/dados/baralho.test.ts` (roda no `npm test`).

Entradas:

- `data/cartas.csv`: notas das 180 cartas (confronto direto).
- `data/baralho_ciclistas.csv`: quais são as 32, o nome de exibição ("Tadej Pogačar"), as iniciais
  e a marca (`super_trunfo` ou `carta_a`).
- `data/equipes_cores.csv`: 2 cores (hex) por equipe, tiradas das camisas de 2026.
- `data/raw/joao_almeida.json`: João Almeida, que não está entre os 180.
- `data/raw/pcs_perfil.json`: código ISO-2 do país (para a bandeira).

Cada carta tem: código (`1A`), nome de exibição, nome PCS, iniciais, país (ISO-2), idade, equipe,
2 cores da equipe, as 6 notas, a lista `estimadas` (atributos estimados) e as marcas
`superTrunfo` e `cartaA`.

### Código da carta

8 grupos × 4 letras (1A a 8D), como no Super Trunfo. O Super Trunfo (Valentin Paret-Peintre) fica
com 1A. As outras 31 seguem por **força geral** (soma das 6 notas, já com o Pavê estimado), da mais
forte à mais fraca; empate pelo nome.

### Pavê estimado

Pavê 10 quer dizer "nunca correu no pavê" (menos de 3 provas). Nas 32 cartas, essa nota vira uma
estimativa, para ter menos empates:

1. Nos ciclistas com Pavê **medido** (3 provas ou mais, 74 dos 180), ajusta-se uma reta
   `Pavê = a + b × watts de 1 min`. O watt de 1 min vem de `data/watts_estimados.csv` e é
   absoluto (peso × W/kg): junta peso e potência num número só. No pavê conta a força bruta,
   e o peso não atrapalha como na subida. Resultado hoje: `Pavê ≈ -15,1 + 0,097 × W`.
2. A nota estimada fica entre 15 (a nota do pior medido) e a mediana dos medidos (53):
   quem nunca correu no pavê não passa do ciclista típico que corre.
3. A carta marca `"estimadas": ["pave"]`.

Os outros pesos e potências testados (só peso, FTP, W/kg) explicam menos os Pavês medidos.

### João Almeida

Ele não está entre os 180. As notas vêm da **mesma coleta de confronto direto** (2023–2026),
feita em 21–22/11/2026 no navegador embutido, com 3 s entre pedidos ao ProCyclingStats.
Tudo está em `data/raw/joao_almeida.json` (campos `notas`, `elo` e `fonte`).

Como foi feito:
1. `scripts/navegador/1_coleta_resultados.js` rodou com `window.RANK` = os 180 + `joao-almeida`.
   Na 2ª fase, provas em que nenhum evento tinha 2 ou mais dos 181 com alguém no top 25 não
   tiveram o perfil buscado (não entram em nenhum confronto, então o resultado é o mesmo).
   Páginas que davam erro 500 (critérios e provas de juniores) ficaram sem perfil, como no 404.
2. `scripts/navegador/2_elo.js` rodou sem as linhas de Izagirre e Sparfel: a página alternativa
   deles (`rider.php`) veio com outro formato de tabela e as posições saíram erradas.
   A saída com os 181 está em `data/raw/elo_com_almeida.json`.
3. A nota do Elo de Almeida foi levada para a escala dos 180 de `data/raw/elo.json` por uma reta
   ajustada nos outros ciclistas (correlação acima de 0,99 em 5 dos 6 tipos; 0,92 em Explosão).
4. A nota de carta sai pela mesma conta de `scripts/cartas_elo.py`, com o mesmo pior e melhor
   medidos dos 180. Resultado: Sprint 33, Explosão 65, Montanha 76, Contrarrelógio 82, Voltas 80.
   Pavê 10 (nunca correu no pavê) vira estimativa, como nas outras cartas.
5. Ele não tem curva no modelo de potência. Para o Pavê estimado, o watt de 1 min dele é o peso
   (63 kg) × a média de W/kg de 1 min de Ayuso, Lipowitz, Skjelmose e Enric Mas.

O gerador ainda aceita `"notas": null` (carta provisória, média desses 4 ciclistas), mas o
arquivo hoje tem as notas finais.
