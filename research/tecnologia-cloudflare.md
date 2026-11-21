# Tecnologia na Cloudflare

Pesquisa para a issue [#6](https://github.com/tharso/trunfo/issues/6). Feita em 21/11/2026. As fontes são da documentação oficial da Cloudflare (com data de consulta) e, quando não houver doc da Cloudflare, do repositório oficial da biblioteca. O que é opinião ou conta minha vem marcado como **(avaliação)**.

Contexto: Super Trunfo de ciclismo, 180 cartas e 6 atributos, para amigos e família, sem login, pensado para celular. A v1 é o modo solo contra o computador. Depois vem multiplayer de 2 a 4 pessoas em tempo real, cada uma no próprio celular, por sala.

## Resumo

| Pergunta | Resposta |
|---|---|
| Site estático | **Workers com Static Assets**, não Pages. A Cloudflare diz para começar projetos novos em Workers. |
| Salas multiplayer | **Um Durable Object por sala**, com a **WebSocket Hibernation API**. A `partyserver` é uma camada fina opcional por cima. |
| Offline (modo solo) | PWA com **vite-plugin-pwa** (Workbox), fazendo precache de todo o build e do JSON das cartas. |
| Custo | **R$ 0.** Os assets estáticos são grátis e ilimitados, e os DOs cabem com folga no plano Free. |
| Front | **Vite + Preact** (ou React) com o plugin `@cloudflare/vite-plugin`. Svelte também serve bem. |

## 1. Site estático: Workers Static Assets x Pages

- A página inicial da doc do Pages traz o aviso: "Are you sure you want to use Pages? ... Start new projects with Workers." ([Pages docs](https://developers.cloudflare.com/pages/), consultado em 21/11/2026)
- O guia de migração do Pages para Workers diz que o Workers tem "a distinctly broader set of features", e a matriz de compatibilidade lista recursos que só existem no Workers (Cron Triggers, Gradual Deployments, Workers Logs). Não há data de desativação do Pages. ([Migrate from Pages](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/), modificado em 12/11/2026)
- "Requests to static assets are free and unlimited." Só as requisições que chegam ao código do Worker contam no limite. ([Billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/))
- Para SPA, a configuração é `not_found_handling = "single-page-application"`. Com `run_worker_first = ["/api/*"]` (ou `/parties/*`), só essas rotas acordam o Worker e o resto sai direto como asset. Isso exige Wrangler 4.20+ ou o plugin Vite 1.7+. ([SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/))
- Cabeçalhos: o padrão é `Cache-Control: public, max-age=0, must-revalidate` com ETag. Dá para sobrescrever com um arquivo `_headers`, por exemplo para servir o `sw.js` com `no-cache`. ([Headers](https://developers.cloudflare.com/workers/static-assets/headers/))
- Limites do Free: 20.000 arquivos por versão e 25 MiB por arquivo. ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)) Com 180 cartas, mesmo com uma foto por carta, sobra muito espaço.

**(avaliação)** O ponto decisivo é ter **um só Worker** servindo o site estático e também a rota das salas, com o DO definido no mesmo projeto. Assim, o deploy do solo hoje e o do multiplayer amanhã é o mesmo. No Pages, o DO teria de morar num Worker separado.

## 2. Salas multiplayer (2 a 4 pessoas)

### Durable Objects + WebSockets
- **Um DO por sala**, endereçado pelo código da sala (`idFromName(codigo)`). O DO é a autoridade da partida: embaralha, distribui as cartas, compara os atributos e manda o estado para todos.
- **Hibernation API** (`this.ctx.acceptWebSocket(ws)` + os handlers `webSocketMessage` / `webSocketClose`): o DO sai da memória quando ninguém está jogando e a Cloudflare mantém os sockets abertos. "Billable Duration (GB-s) charges do not accrue during hibernation." O ping/pong é respondido sem acordar o objeto. ([WebSockets best practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/))
- Para guardar estado por conexão que sobreviva à hibernação, use `serializeAttachment` (até 16.384 bytes, com nome e assento do jogador, por exemplo). O estado da partida em si deve ficar no storage SQLite do DO, porque o construtor roda de novo a cada vez que o objeto acorda. (mesma fonte)
- Alarmes e `setTimeout` impedem a hibernação. **(avaliação)** Por isso, o tempo-limite de jogada deve usar o alarm do DO, e não `setTimeout`. Com 4 pessoas e poucos minutos de partida, a diferença de custo é irrelevante de qualquer jeito.
- Um deploy novo derruba os sockets abertos ("A forced code update disconnects WebSockets"). Logo, o cliente **precisa reconectar e reidratar** o estado. (mesma fonte)

### PartyKit / partyserver
- A `partyserver` (repo `cloudflare/partykit`) é uma classe `Server` que estende `DurableObject`. Ela traz `onConnect` / `onMessage` / `onClose`, `broadcast(msg, exclude)`, `getConnections()`, `connection.setState()` (até 2 KB), `static options = { hibernate: true }` e o roteador `routePartykitRequest`, que atende URLs `/parties/:server/:name`. Ao contrário do PartyKit antigo, os bindings e migrations do DO são declarados à mão no `wrangler.jsonc`. ([partyserver README](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md))
- A `partysocket` é o cliente. Ela "Reconnects when a connection drops" e "Buffers messages when not connected". Também funciona com WebSocket genérico. ([partysocket README](https://github.com/cloudflare/partykit/blob/main/packages/partysocket/README.md))
- Não encontrei página da partyserver em developers.cloudflare.com. A fonte primária é o README no GitHub.

**(avaliação)** Dá para fazer com DO puro, que tem cerca de 80 linhas e nenhuma dependência. Mesmo assim, vale usar **partysocket no cliente em qualquer cenário**, porque a reconexão no celular (tela apagada, troca de 4G para Wi-Fi) é o problema real. A `partyserver` no servidor é opcional: economiza boilerplate de roteamento, broadcast e hibernação, ao custo de uma dependência pequena e mantida pela própria Cloudflare. A recomendação é escrever a sala como **lógica de jogo pura** (reducer sem I/O, a mesma usada no modo solo) e deixar o DO ou a partyserver só como transporte.

## 3. PWA offline para o modo solo

- O **vite-plugin-pwa** gera o manifest e o service worker com Workbox (`generateSW`). `registerType: 'autoUpdate'` atualiza sozinho, e há templates para vanilla, React, Preact e Svelte. ([vite-plugin-pwa guide](https://vite-pwa-org.netlify.app/guide/))
- No lado da Cloudflare não há nada especial a fazer: os assets já são estáticos. Basta servir o `sw.js` com `Cache-Control: no-cache` via `_headers`, para que as atualizações cheguem. ([Headers](https://developers.cloudflare.com/workers/static-assets/headers/))
- **iPhone (WebKit):** os dados das origens ficam em modo "best-effort" e podem ser apagados por inatividade ou falta de espaço. `navigator.storage.persist()` é concedido por heurística, e "whether the website is opened as a Home Screen Web App" pesa a favor. Um web app na tela inicial tem a mesma cota do navegador. ([WebKit, Updates to Storage Policy, 10/08/2023](https://webkit.org/blog/14403/updates-to-storage-policy/))
- **(avaliação)** O modo solo é todo client-side (180 cartas num JSON de poucos KB mais a IA local), então o offline sai quase de graça. Vale orientar o público a "Adicionar à Tela de Início" e tratar o cache como descartável: se for apagado, o app baixa tudo de novo na próxima visita online. Recordes e progresso locais vão em `localStorage` ou IndexedDB, sem garantia de que durem para sempre.

## 4. Custo e limites do plano grátis

| Recurso | Free | Fonte |
|---|---|---|
| Assets estáticos | Grátis e ilimitados | [Billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| Requisições ao Worker | 100.000/dia (zera 00:00 UTC), 10 ms de CPU por requisição | [Limits](https://developers.cloudflare.com/workers/platform/limits/) |
| DO: requisições | 100.000/dia. **Mensagem WebSocket recebida conta 20:1** (100 msgs = 5 req) | [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| DO: duração | 13.000 GB-s/dia | idem |
| DO: SQLite | 5 M linhas lidas e 100 mil escritas por dia, 5 GB no total. No Free, só existe DO com backend SQLite | idem; [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/) |
| Ao estourar | A operação falha com erro, sem cobrança automática | [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |

- O DO entrou no plano Free em 07/04/2025, só com SQLite. ([changelog](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier))

**Conta (avaliação):** uma partida de 4 pessoas com uns 40 turnos gera umas 200 mensagens recebidas (cerca de 10 req) mais 4 conexões. Isso dá menos de 20 requisições de DO por partida, o que permite milhares de partidas por dia. Na duração, cada DO usa 128 MB, ou 0,125 GB. Mesmo **sem** hibernação, uma partida de 30 min ocupa 1.800 s × 0,125 = 225 GB-s, e o limite diário dá umas 57 partidas. **Com** hibernação, o DO só conta enquanto processa mensagens, e o teto fica muito longe. Para amigos e família, o custo é **zero**, e o pior caso é uma sala recusar conexão até 00:00 UTC (21h em Brasília).

## 5. Framework de front

O `@cloudflare/vite-plugin` roda o Worker (e os bindings) dentro do `workerd` no `vite dev`, servindo a SPA e o backend da sala num processo só. O `vite build` gera a config do Wrangler com `assets.directory` já apontado. ([Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), [static assets no plugin](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/)) Pela doc, o plugin tem guias para React e Vue. A página não fala de DO em dev, então isso tem de ser testado no primeiro spike.

Opções (avaliação):

| Opção | Prós | Contras |
|---|---|---|
| **Vite + Preact** (recomendado) | API de React com cerca de 4 KB, carrega rápido em celular fraco, template pronto no vite-plugin-pwa, aproveita o ecossistema React via `preact/compat` | Às vezes uma lib React exige ajuste no compat |
| Vite + React | O mais documentado; tem guia oficial da Cloudflare; IA e tutoriais sabem tudo | Bundle maior (dezenas de KB) para um jogo simples |
| Vite + Svelte | Bundle mínimo, animações de carta fáceis (`transition:`), código curto | Ecossistema menor; menos exemplos com DO e partysocket |
| Sem framework (TS puro) | Zero dependência e máximo controle | Reinventa a reatividade; a UI de sala, mão e placar vira código de DOM manual |

**(avaliação)** O jogo tem poucas telas (lobby, mão, duelo de atributo, placar), então qualquer opção atende. Preact é o equilíbrio: leve como o Svelte e familiar como o React. O que mais importa é deixar a **regra do jogo num módulo TS puro**, sem framework, compartilhado entre o modo solo (no navegador) e o DO (no servidor).

## Arquitetura sugerida

```
um Worker (wrangler.jsonc)
├── assets: dist/  (SPA + PWA, grátis, not_found_handling = SPA)
├── run_worker_first: ["/parties/*"]
└── Durable Object "Sala" (SQLite, hibernation) ← partysocket nos celulares
src/regras/  (TS puro: baralho, comparação, IA do solo) → usado no cliente e no DO
```

## Pontos abertos para a fase de construção
- Confirmar no spike que o `@cloudflare/vite-plugin` roda o DO com hibernação no `vite dev`.
- O armazenamento por objeto aparece como "10 GB" na tabela e "1 GB on the Free plan" no FAQ da [página de limites do DO](https://developers.cloudflare.com/durable-objects/platform/limits/). Para nós é irrelevante, porque uma sala guarda poucos KB.
- Sobre o PWA no iOS: testar a instalação na tela inicial e o comportamento após dias sem uso.
