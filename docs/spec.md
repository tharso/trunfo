# Especificação — Super Trunfo Ciclismo

Esta é a especificação do jogo, pronta para começar a programar. Ela junta as decisões do mapa [Mapa: como o Super Trunfo Ciclismo vai funcionar](https://github.com/tharso/trunfo/issues/1). Cada parte aponta para o ticket que tem o detalhe e o motivo. Se a spec e um ticket discordarem, vale o ticket, e a spec precisa ser corrigida.

Vocabulário: [`GLOSSARY.md`](../GLOSSARY.md). Decisões difíceis de desfazer: [`docs/adr/`](adr/).

## 1. Visão geral

- Jogo de cartas na web, para amigos e família. Sem login, sem loja, sem ranking.
- Pensado primeiro para o celular. Funciona no desktop.
- Tudo em PT-BR.
- Base: o Super Trunfo clássico, com ciclistas profissionais.
- Dois modos:
  - **Modo solo**: você contra o **Computador**. É a **Primeira versão**.
  - **Multiplayer**: 2 a 4 pessoas numa **Sala**, cada uma no seu celular. É a segunda versão.
- Nome: **Super Trunfo Ciclismo**. A tela de Início tem um aviso de jogo de fã no rodapé: "Jogo de fã, sem fins lucrativos. Sem ligação com a Grow, a UCI, as equipes ou os ciclistas." Ver [ADR 0003](adr/0003-nome-super-trunfo.md) e [Nome do jogo](https://github.com/tharso/trunfo/issues/11).

## 2. Baralho

Detalhe: [Baralho e a carta Super Trunfo](https://github.com/tharso/trunfo/issues/3).

- **Baralho fixo de 32 cartas**, sempre as mesmas.
- Cada **Carta** tem 6 **Atributos**, com notas de 1 a 99: Sprint, Explosão, Montanha, Contrarrelógio, Pavê e Voltas.
- As notas vêm de `data/cartas.csv` (180 ciclistas). O jogo usa só as 32 cartas abaixo.
- Lista: Pogačar, Vingegaard, Evenepoel, Roglič, Del Toro, Seixas, Ayuso, Carapaz, Kuss, Adam Yates, Pidcock, Jorgenson, Skjelmose, Ciccone, Healy, Lipowitz, João Almeida, Enric Mas, Lenny Martinez, Van der Poel, Van Aert, Pedersen, Philipsen, Ganna, Girmay, Milan, Merlier, Matthews, De Lie, Magnier, Narváez, Valentin Paret-Peintre.
- **Super Trunfo**: Valentin Paret-Peintre. Ganha de qualquer carta, em qualquer atributo, menos de uma Carta A.
- **Cartas A** (ganham do Super Trunfo): Philipsen, Merlier, Milan e Magnier.
- **Pavê**: nota 10 quer dizer "nunca correu no pavê". Nas 32 cartas, essas notas 10 viram uma estimativa pelo peso e pela potência, para ter menos empates.
- **Limite de rodadas**: 100.

Trabalho de dados antes de programar o baralho:
1. Coletar os dados de João Almeida (ele não está nas 180 cartas). Usar o mesmo método de `scripts/`.
2. Estimar as notas de Pavê iguais a 10 das 32 cartas.
3. Gerar o arquivo do baralho (32 cartas, com código de carta como `1A`, equipe, cores da equipe, país, idade).

## 3. Regras da rodada

Detalhe: [Regras da rodada](https://github.com/tharso/trunfo/issues/2). As regras valem para 2, 3 e 4 pessoas.

1. **Começo**: o baralho é embaralhado e dividido igualmente. Cada pessoa tem um **Monte** e só vê a carta de cima.
2. **Quem escolhe**: na 1ª rodada, a pessoa é sorteada. Depois, quem ganhou a rodada anterior.
3. **Rodada**: quem escolhe diz um atributo. Todas as pessoas mostram a carta de cima. A nota mais alta ganha.
4. **Super Trunfo e Carta A**:
   - O Super Trunfo ganha de qualquer carta, menos de uma Carta A.
   - Com 2 pessoas, se uma Carta A está contra o Super Trunfo, a Carta A ganha.
   - Com 3 ou 4 pessoas, se uma Carta A está na mesa, o Super Trunfo perde e sai da disputa. As outras cartas comparam o atributo normalmente.
5. **Quem ganha**: leva todas as cartas da mesa (e o monte de empate, se houver) para o **fundo** do seu monte.
6. **Empate**: as cartas da rodada vão para o **Monte de empate**. Quem escolheu escolhe de novo. Quem ganhar a próxima rodada leva tudo.
7. **Quem escolhe sai no empate**: se a última carta de quem escolhia foi para o monte de empate, essa pessoa sai. A próxima pessoa da **Ordem da mesa** escolhe.
8. **Sem cartas**: quem fica sem cartas sai. As outras pessoas continuam.
9. **Fim da partida**:
   - uma pessoa tem todas as cartas; **ou**
   - a partida chega ao limite de rodadas (100). Ganha quem tem mais cartas no monte.
10. **Empate no fim**: mesmo número de cartas no limite. A partida termina empatada. Sem morte súbita.
11. **Monte de empate no fim**: as cartas que estão no meio não contam para ninguém.

## 4. Computador

Detalhe: [Computador adversário](https://github.com/tharso/trunfo/issues/5).

- **Um computador só** no modo solo.
- **Joga limpo**: vê só a carta de cima do próprio monte. Não vê a sua carta nem a ordem do monte.
- **Sem memória**: não lembra das cartas que já saíram.
- **Níveis** (a pessoa escolhe antes da partida):
  - **Fácil**: sorteia o atributo.
  - **Normal**: compara cada nota da sua carta com as outras 31 cartas do baralho. Escolhe o atributo que ganha de mais cartas. Se dois atributos empatam, sorteia um.

## 5. Carta

Detalhe: [Visual da carta](https://github.com/tharso/trunfo/issues/8). Protótipo: branch [`prototype/visual-da-carta`](https://github.com/tharso/trunfo/tree/prototype/visual-da-carta/prototypes/visual-da-carta).

- **Carta clássica em pé**. Ocupa a tela do celular.
- **Topo**: faixa com as cores da equipe, iniciais do ciclista num círculo, bandeira do país e o código da carta (ex.: `1A`). Super Trunfo e Carta A têm selo próprio.
- **Sem foto**. Ver [ADR 0002](adr/0002-carta-sem-foto.md).
- **Abaixo do topo**: nome, país, idade e equipe (equipe só em texto, sem logo).
- **6 linhas**, uma por atributo: ícone, nome, barra e a nota grande à direita. A linha inteira é a área de toque.
- **Cor da barra: escala semáforo**. Paradas: 1 `#d84315`, 40 `#f9a825`, 70 `#7cb342`, 99 `#1b8a3a`. As cores entre as paradas são interpoladas.
- **Escolher o atributo: 2 toques na mesma linha, sem botão.**
  - 1º toque: marca a linha (fundo com a cor da equipe, aviso "toque de novo ▶") e mostra o texto da etapa.
  - 2º toque na mesma linha: envia o atributo.
  - Tocar em outra linha troca a marcação.
- **Texto da etapa** (só na tela; não muda a regra). Detalhe: [Toque de ciclismo na rodada](https://github.com/tharso/trunfo/issues/4).

  | Atributo | Texto |
  |---|---|
  | Sprint | Sprint |
  | Explosão | Explosão |
  | Montanha | Etapa de montanha |
  | Contrarrelógio | Contrarrelógio |
  | Pavê | Etapa de pavê |
  | Voltas | Classificação geral |

## 6. Telas e fluxo (modo solo)

Detalhe: [Telas e fluxo da partida solo](https://github.com/tharso/trunfo/issues/9) e [Fim de jogo e reinício](https://github.com/tharso/trunfo/issues/13). Protótipo: branch [`prototype/telas-partida-solo`](https://github.com/tharso/trunfo/tree/prototype/telas-partida-solo/prototypes/telas-partida-solo).

Fluxo: **Início → Sorteio → Rodadas → Fim**.

### Início
- Escolha do nível: Fácil ou Normal.
- Botões "Jogar" e "Como jogar".
- **Retrospecto** do nível (ver parte 8).
- Botão 🔊/🔇.
- Se há uma partida guardada: "Continuar partida?" com "Continuar" e "Nova partida". "Nova partida" conta como derrota da partida guardada.
- Rodapé com o aviso de jogo de fã.

### Sorteio
- Mostra quem começa: "Você começa!" ou "O computador começa.".

### Rodada ("Duelo")
- Só a **sua carta** na tela.
- **Placar em cabo de guerra** no topo: uma barra com as suas cartas (verde), o monte de empate (amarelo) e as do computador (vermelho). Ao lado: "Rodada N/100".
- **Quando você escolhe**: 2 toques na linha. O texto da etapa aparece embaixo da carta.
- **Quando o computador escolhe**: a sua carta aparece com a linha já marcada, o texto "O computador escolheu …" e o botão **"Correr!"**.
- **Tela do duelo** (fundo escuro):
  - nome da etapa grande;
  - duas faixas (você e o computador) com barras que crescem até a nota;
  - a faixa vencedora com borda;
  - o resultado: "Você ganhou a rodada!", "O computador ganhou." ou "Empate!", com o motivo (Super Trunfo, Carta A, monte de empate) e quantas cartas a pessoa leva;
  - botões **"Próxima rodada"** e **"Ver as duas cartas"** (as duas cartas inteiras, com a linha marcada);
  - botão **"Pular ⏩"**.
- **Menu ☰**: "Sair da partida?", com o aviso "Conta como derrota.".
- **Desktop**: a mesma tela, centralizada. O duelo ocupa a janela.

### Fim
- Quem ganhou, o motivo (todas as cartas ou limite de rodadas), o placar e as rodadas jogadas.
- Botões "Jogar de novo" e "Voltar ao início".

## 7. Som, vibração e tempo

Detalhe: [Som, vibração e tempo das animações](https://github.com/tharso/trunfo/issues/14). Protótipo: branch [`prototype/som-vibracao-tempo`](https://github.com/tharso/trunfo/tree/prototype/som-vibracao-tempo/prototypes/som-vibracao-tempo). Sensação escolhida: **Suspense**.

- **Som**: começa **ligado**. Botão 🔊/🔇 na rodada e no Início.
  - Momentos: escolher a linha (tique curto), largada do duelo, tique-taque enquanto as barras crescem, resultado (ganhar, perder, empate) e fim da partida (vitória, derrota).
  - Sons gerados no jogo com Web Audio. Sem arquivos de áudio.
- **Vibração** (só no Android; o iPhone não vibra por página web):

  | Momento | Padrão (ms) |
  |---|---|
  | Largada | `[15,90,15]` |
  | Ganhar | `[50,60,120]` |
  | Perder | `[200]` |
  | Empate | `[30,60,30]` |
  | Fim: vitória | `[80,60,80,60,200]` |
  | Fim: derrota | `[300]` |

  O botão 🔊/🔇 desliga só o som. A vibração continua.
- **Tempo do duelo** (~3 s):
  1. a sua barra cresce (1,2 s), com o número contando;
  2. a barra do computador cresce (1,2 s);
  3. pausa (0,35 s), e aparecem o resultado e os botões.
  - O placar em cabo de guerra anda em 0,8 s depois de "Próxima rodada".
- **Pular**: "Pular ⏩" ou um toque em qualquer lugar da tela do duelo vai direto ao resultado, com o som e a vibração do resultado.

## 8. Fim de jogo, retrospecto e partida guardada

Detalhe: [Fim de jogo e reinício](https://github.com/tharso/trunfo/issues/13).

- **Retrospecto** (só no modo solo): vitórias, derrotas e empates contra o computador, por nível. Fica no celular.
  - Exemplo: "Normal: você 7 × 4 computador · 1 empate". O empate só aparece quando é maior que zero.
  - Aparece no Início. Sem lista de partidas e sem botão para apagar.
  - **Sair no meio conta como derrota**: pelo menu ☰, ou com "Nova partida" quando há uma partida guardada.
- **Partida guardada**: o celular guarda a partida solo depois de cada rodada. Se a aba fecha ou o celular trava, o Início mostra "Continuar partida?". Só a saída pelo menu ☰ acaba a partida de vez.

## 9. Multiplayer (segunda versão)

Detalhe: [Salas do multiplayer](https://github.com/tharso/trunfo/issues/12), [Fim de jogo e reinício](https://github.com/tharso/trunfo/issues/13) e a conversa de 22/11/2026 sobre a segunda versão. As regras da parte 3 valem aqui.

A segunda versão entrega esta parte inteira de uma vez. A construção vai em fatias, mas só vai para o público quando tudo estiver pronto.

### Entrar na sala
1. O Início ganha o botão **"Jogar com amigos"**. Ele abre uma tela com "Criar sala" e "Entrar com código".
2. Quem cria a sala é o **Anfitrião**. O jogo cria o código da sala: **3 letras** (sem O e I). O Anfitrião não escolhe o código. Todas as pessoas usam o mesmo código.
3. A sala também tem um link com o código. O link pula a tela de "Jogar com amigos" e vai direto para o Apelido. O código serve para quem não tem WhatsApp: a pessoa abre o jogo, toca em "Entrar com código" e digita as 3 letras.
4. Cada pessoa digita um **Apelido**. O celular guarda o apelido. Apelido repetido recebe um número ("Ana 2").
5. **Tela da sala**: o código em letras grandes, o botão "Mandar link" (abre o menu de compartilhar do celular) e a lista de apelidos na ordem da mesa. Só o Anfitrião vê "Começar". As outras pessoas veem "Esperando o Anfitrião começar…".
6. O Anfitrião toca em "Começar" quando a sala tem de 2 a 4 pessoas. Durante a partida, ninguém entra.
7. **Ordem da mesa** = ordem de entrada na sala. A 1ª rodada continua sorteada.
8. **Sem internet**: "Jogar com amigos" mostra "Precisa de internet". O modo solo continua normal.

### Durante a partida
9. **Joga limpo**: a sala guarda a partida. Cada celular recebe só a carta de cima da própria pessoa. As cartas das outras pessoas aparecem só no duelo.
10. **Quem não escolhe**: vê a sua carta e "Ana está escolhendo…". Depois vê a linha marcada, "Ana escolheu Montanha" e o botão "Mostrar cartas!", como no modo solo.
11. **Cada um no seu ritmo**: cada celular mostra o duelo e o "Próxima rodada" no seu ritmo. Se a próxima escolha chega antes de a pessoa tocar em "Próxima rodada", ela espera na fila. Quem escolhe só escolhe depois de tocar no seu próprio "Próxima rodada".
12. **Duelo com 3 ou 4 pessoas**: uma faixa por pessoa, com o apelido. A sua barra cresce primeiro (1,2 s). Depois, as barras das outras pessoas crescem juntas (1,2 s). O tempo total fica em ~3 s.
13. **Placar com 3 ou 4 pessoas**: o cabo de guerra vira uma barra dividida, uma parte por pessoa. A sua parte é verde e fica sempre na esquerda. O monte de empate é amarelo. As outras pessoas ficam em tons neutros, com as iniciais do apelido.
14. **Queda de rede**: a partida para e espera até 60 s. Depois, a pessoa sai e o jogo continua sem ela. O Anfitrião tem o botão "Tirar" para usar antes dos 60 s.
15. **Saída no meio**: as cartas da pessoa saem do jogo e não vão para ninguém. Com 2 pessoas, quem fica ganha.
16. **Quem escolhe demora**: sem relógio. Depois de 30 s, os outros veem "Cutucar", que faz o celular da pessoa vibrar.
17. **Anfitrião cai ou sai**: o papel passa para a próxima pessoa da ordem da mesa.
18. **Fechar a aba e abrir de novo**: em até 60 s, conta como queda de rede, e a pessoa volta com as mesmas cartas. Depois de 60 s, ela já saiu.
19. **De fora**: quem saiu da partida fica na sala. Vê o placar e o duelo de cada rodada, sem carta própria. O texto no topo diz "De fora, só olhando. Você entra na próxima partida."

### Fim
20. A tela de fim mostra quem ganhou e uma lista com todas as pessoas, em ordem de cartas no monte. Quem saiu fica no fim da lista, com "saiu".
21. O Anfitrião vê "Jogar de novo". Todas as pessoas veem "Sair".

### Vida da sala
22. A sala fecha 10 min depois que a última pessoa sai. Um link velho mostra "Esta sala já acabou" e um botão "Criar sala".
23. "Jogar de novo": o Anfitrião começa uma nova partida na mesma sala, com quem ficou.
24. Quem está de fora entra na próxima partida. O celular guarda um identificador secreto que mostra que é a mesma pessoa.
25. Gente nova entra entre partidas se a sala tem menos de 4 pessoas, e vai para o fim da ordem da mesa.
26. Partidas do multiplayer **não entram** no retrospecto.

## 10. Tecnologia

Detalhe: [Tecnologia na Cloudflare](https://github.com/tharso/trunfo/issues/6) e [Escolher a tecnologia](https://github.com/tharso/trunfo/issues/10).

- **Hospedagem**: Cloudflare Workers com Static Assets (não Pages). SPA com `not_found_handling = "single-page-application"`. Custo zero no plano grátis.
- **Tela**: Vite + Preact + TypeScript, com `@cloudflare/vite-plugin`.
- **PWA**: vite-plugin-pwa (Workbox). O modo solo funciona sem internet desde a primeira versão. `sw.js` servido com `no-cache` via `_headers`.
- **Primeira versão sem servidor**: só arquivos estáticos. Ver [ADR 0001](adr/0001-primeira-versao-sem-servidor.md).
- **Regras num módulo só**: um módulo TypeScript puro, sem tela e sem rede. O modo solo usa o módulo agora. A sala do multiplayer usa o mesmo módulo depois.
- **Multiplayer (depois)**: um Durable Object por sala, com a WebSocket Hibernation API, no mesmo Worker do site. No cliente, `partysocket`. Antes de começar: testar o DO com hibernação no `vite dev`.
- **Guardado no celular** (`localStorage`): retrospecto, partida solo guardada; no multiplayer, apelido e identificador secreto.
- **CI**: GitHub Actions só em `pull_request` (+ `workflow_dispatch`). Só Linux.

## 11. Fora do escopo

- Vários jogadores no mesmo celular.
- Outros idiomas além do PT-BR.
- Atualizar as cartas a cada temporada.
- Ranking, contas e loja.
- Etapa sorteada que muda a regra.
- Modo solo com 2 ou 3 computadores.
- Retrospecto do multiplayer.
- Nível "Difícil" do computador.
- Foto dos ciclistas e logo das equipes.

## 12. Fatias da primeira versão

Cada fatia é um pedaço pequeno que já funciona sozinho. A ordem abaixo é a ordem de construção. As issues de construção são criadas num passo separado, depois deste mapa.

1. **Baralho de 32 cartas**: dados de João Almeida, notas de Pavê estimadas e o arquivo do baralho (parte 2).
2. **Regras em TS**: o módulo puro com a parte 3 inteira, com testes. Inclui o limite de 100 rodadas.
3. **Computador**: níveis Fácil e Normal no módulo de regras (parte 4), com testes.
4. **Projeto no ar**: Worker com Static Assets, Vite + Preact + TS, deploy na Cloudflare e CI em `pull_request`.
5. **Uma carta na tela**: o visual da parte 5, com a escolha em 2 toques.
6. **Partida solo jogável**: Início → Sorteio → Rodadas (duelo e placar em cabo de guerra) → Fim (parte 6), sem som.
7. **Retrospecto e partida guardada** (parte 8).
8. **Som, vibração e tempo do duelo** (parte 7).
9. **PWA**: instalar e jogar sem internet.
