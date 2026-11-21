# Uso de nomes e fotos dos ciclistas

Pesquisa da issue [#7](https://github.com/tharso/trunfo/issues/7) (parte do mapa #1, bloqueia #8). Data: 21/11/2026.

> **Não é aconselhamento jurídico.** Este documento reúne fatos e textos de lei com link para a fonte. Quem decide o risco é o dono do projeto; para uma resposta jurídica, só um advogado.

Contexto: jogo web gratuito estilo Super Trunfo, 180 cartas com os primeiros do ranking UCI (`data/cartas.csv`), público de amigos e família, sem login, sem dinheiro. Dono no Brasil.

## Resumo

1. **Nomes dos atletas** são o ponto de menor atrito: a lei brasileira proíbe usar nome alheio sem autorização *em propaganda comercial* (CC art. 18), e o jogo não é propaganda nem comercial. Não achei regra que proíba citar nome real num jogo gratuito.
2. **Fotos** são o ponto de maior atrito, e por dois motivos independentes: (a) direito autoral do fotógrafo, que a licença livre resolve; (b) direito de imagem do retratado, que **nenhuma licença do Commons resolve**. No Brasil o uso de imagem pode ser proibido se for para fins comerciais ou ofender a honra (CC art. 20); uso gratuito e privado está fora desses dois gatilhos, mas o risco não é zero.
3. **Logos de equipes, logo da UCI e a marca "Super Trunfo"** são marcas registradas. Reproduzir logo é o que a Lei de Propriedade Industrial (LPI) mais claramente protege (art. 189). Citar o nome da equipe em texto é bem diferente de copiar o logo. "Super Trunfo" no nome do jogo é a escolha mais exposta das três.
4. **Cobertura de fotos livres é alta**: numa amostra de 29 dos 180 nomes, 28 (97%) têm foto no Wikidata/Commons com licença livre. Mas muitas são antigas, de corpo inteiro ou de grupo, e 20 das 28 são CC BY-SA, que exige atribuição e mantém o recorte sob a mesma licença.
5. **Alternativas sem foto** (bandeira + cores da equipe + avatar gerado) eliminam o problema (b) e o de marca, com material de licença MIT/CC0 pronto.

## 1. Riscos de nomes, logos e marcas

### 1.1 Nome e imagem de atleta (Brasil)

- **Código Civil, art. 18**: "Sem autorização, não se pode usar o nome alheio em propaganda comercial." ([Lei 10.406/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)). O gatilho é *propaganda comercial*.
- **Código Civil, art. 20**: a utilização da imagem de uma pessoa pode ser proibida, a seu requerimento e sem prejuízo de indenização, "se lhe atingirem a honra, a boa fama ou a respeitabilidade, ou se se destinarem a fins comerciais" (mesma fonte). Dois gatilhos: ofensa ou fim comercial.
- **STJ, Súmula 403**: a indenização por publicação não autorizada de imagem *com fins econômicos ou comerciais* independe de prova do prejuízo. (Fonte primária: [STJ, pesquisa de súmulas](https://scon.stj.jus.br/SCON/sumstj/); a página bloqueou acesso automatizado nesta pesquisa, então o texto não foi conferido aqui.) Relevante porque mostra onde o risco se concentra: no uso econômico.
- **LGPD, art. 4º, I**: a lei "não se aplica ao tratamento de dados pessoais realizado por pessoa natural para fins exclusivamente particulares e não econômicos" ([Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)). Um site aberto na internet talvez não seja "exclusivamente particular"; ainda assim, o art. 7º §4º dispensa consentimento para dados "tornados manifestamente públicos pelo titular" (nome, país, equipe de atleta profissional se encaixam aqui com facilidade).

Leitura factual: o jogo não é propaganda, não cobra nada e não ofende ninguém. Nenhum dos gatilhos explícitos dos arts. 18 e 20 aparece. O risco residual está em (i) o site ser público na internet, e não só entre amigos; (ii) qualquer monetização futura (anúncio, doação), que muda a análise.

### 1.2 Precedente comparável: jogos de fantasia nos EUA

Não é lei brasileira, mas é o caso mais citado sobre jogo usando nome e estatística de atleta real sem licença: *C.B.C. Distribution and Marketing v. Major League Baseball Advanced Media*, 505 F.3d 818 (8th Cir. 2007). O tribunal decidiu que a Primeira Emenda protegia o uso de nomes e estatísticas de jogadores num jogo de fantasia pago, em parte porque essas informações já estavam em domínio público; a Suprema Corte negou revisão em 2008. Opinião: [Justia, nº 06-3358](https://law.justia.com/cases/federal/appellate-courts/ca8/06-3358/063357p-2011-02-25.html) (acesso automatizado bloqueado nesta pesquisa; resumo conferido em [petição de certiorari, SCOTUSblog](https://www.scotusblog.com/wp/wp-content/uploads/2008/05/07-1099_pet.pdf)). Note: o caso trata de **nomes e números**, não de fotos.

### 1.3 Como jogos parecidos lidam com isso

- **Pro Cycling Manager** (jogo comercial de ciclismo): edições recentes trazem parte dos ciclistas com nomes alterados ("placeholders") por falta de licença; a comunidade distribui bancos de dados com os nomes reais como mod (ex.: WorldDB, [changelog no Steam](https://steamcommunity.com/sharedfiles/filedetails/changelog/3493579785?p=1); análise em [Galaxus](https://www.galaxus.ch/en/page/tactics-timing-triumph-how-i-helped-marc-hirschi-to-win-the-tour-de-france-stage-38353)). Fonte secundária; o ponto é o padrão: o produto comercial evita o nome sem licença, o projeto gratuito de fã usa o nome real.
- **Jogos de fantasia de ciclismo e sites de estatística** (o próprio PCS, de onde vieram os dados) publicam nomes, países e equipes de todos os atletas; isso é prática corrente.
- O padrão comum entre projetos de fã: **nome real sim, foto e logo oficiais não**, e nenhuma monetização.

### 1.4 Marcas: logos de equipes, UCI e "Super Trunfo"

- **LPI, art. 129**: a propriedade da marca se adquire pelo registro e garante uso exclusivo no território nacional ([Lei 9.279/1996](https://www.planalto.gov.br/ccivil_03/leis/l9279.htm)). Marca é territorial: logo de equipe registrado só na Europa não tem, por si, proteção no Brasil; mas os patrocinadores que dão nome às equipes (Red Bull, Lidl, Decathlon etc.) costumam ter registro aqui.
- **LPI, art. 132, IV**: o titular não pode impedir "a citação da marca em discurso, obra científica ou literária ou qualquer outra publicação, desde que sem conotação comercial e sem prejuízo para seu caráter distintivo". É o dispositivo que acomoda escrever "UAE Team Emirates - XRG" na carta como dado.
- **LPI, art. 189, I**: é crime reproduzir, sem autorização do titular, no todo ou em parte, marca registrada, ou imitá-la de modo a causar confusão. Copiar o **logo** é o caso típico.
- **UCI**: registra "UCI" e derivados como marca ([lista de marcas da UCI, Justia Trademarks](https://trademark.justia.com/owners/union-cycliste-internationale-2481097)); diretrizes de uso orientam perguntas a legal@uci.ch. Mencionar "ranking UCI" em texto é citação; usar o logo da UCI ou o arco-íris (camisa de campeão mundial, também marca) é outra coisa.
- **"Super Trunfo"**: é a linha de jogos da Grow ([Wikipedia](https://en.wikipedia.org/wiki/Super_Trunfo)). **Não consegui confirmar o registro no INPI** nesta pesquisa (a [busca do INPI](https://busca.inpi.gov.br/) exige sessão interativa). É razoável supor registro, dado o tempo de mercado, mas isso fica em aberto. Usar "Super Trunfo" *no nome/título do jogo* é uso como marca, não citação. Descrever "jogo de cartas no estilo trunfo/Top Trumps" é mais seguro; "trunfo" sozinho é palavra comum.

## 2. Fotos com licença livre

### 2.1 Método

Script em Python consultando a API do Wikidata (`wbsearchentities`, item com descrição contendo "cycl"), lendo a propriedade P18 (imagem) e depois a licença na API do Commons (`imageinfo`/`extmetadata`). Amostra: 29 nomes, todo o top 10, um a cada 17 posições no meio e uma dezena entre as posições 140 e 180.

### 2.2 Resultado

| # | Ciclista | Licença | Data da foto | Arquivo no Commons |
|---|---|---|---|---|
| 1 | Tadej Pogačar | Domínio público (via Flickr) | 2025 | [Tadej Pogačar, 2025 Tour de France 54683927314.jpg](https://commons.wikimedia.org/wiki/File:Tadej_Poga%C4%8Dar,_2025_Tour_de_France_54683927314.jpg) |
| 2 | Remco Evenepoel | CC BY-SA 4.0 | 2025 | Remco Evenepoel - podium medaille argent - 2025 European road championship.jpg |
| 3 | Isaac del Toro | CC BY 2.0 | 2025 | Isaac del Toro maglia rosa.jpg |
| 4 | Paul Seixas | CC BY-SA 4.0 | 2025 | Paul Seixas - podium medaille bronze - 2025 European road championship.jpg |
| 5 | Tom Pidcock | CC0 | 2023 | Tom Pidcock (2023).jpg |
| 6 | Jonas Vingegaard | CC BY-SA 4.0 | 2023 | Jonas Vingegaard - Vainqueur du Tour de France 2023.jpg |
| 7 | Wout van Aert | CC BY-SA 4.0 | 2022 | WVA Paris-Roubaix 2022.jpg |
| 8 | Jasper Philipsen | CC0 | 2026 | Jasper Philipsen (2026).jpg |
| 9 | Felix Gall | CC BY-SA 4.0 | 2019 | Rund um Köln 2019 102.jpg |
| 10 | Mathieu van der Poel | CC BY-SA 4.0 | 2022 | Mathieu van der Poel Paris-Roubaix 2022.jpg |
| 16 | Giulio Ciccone | CC BY-SA 4.0 | 2019 | CICCONE Giulio.jpg |
| 33 | Laurence Pithie | CC BY-SA 4.0 | 2019 (júnior, pista) | 2019 UCI Juniors Track World Championships 291.jpg |
| 50 | Sepp Kuss | CC BY 2.0 | 2022 | TDF30348 kuss (52243724704).jpg |
| 67 | Derek Gee | CC BY-SA 4.0 | 2018 (pista) | UCI Track World Championships 2018 129.jpg |
| 84 | Filippo Zana | CC BY 2.0 | 2022 | GI220034 bardiani (52123723170).jpg |
| 101 | Alec Segaert | CC BY-SA 4.0 | 2024 | 2024 UCI Road World Championships Zurich Men U23 Road Race 94 (Alec Segaert).jpg |
| 118 | Luca Mozzato | CC0 | 2026 | Luca Mozzato (2026).jpg |
| 135 | Sebastian Berwick | CC BY-SA 2.0 | 2023 | Sebastian Berwick, 2023 Paris-Nice.jpg |
| 143 | Henok Mulubrhan | CC BY-SA 2.0 | 2023 | Henok Mulubrhan, Giro d'Italia 2023.jpg |
| 152 | Stanisław Aniołkowski | CC BY-SA 4.0 | 2019 | Stasiek Aniolkowski.jpg |
| 163 | Dušan Rajović | CC BY-SA 4.0 | 2018 | Dušan Rajović.jpg |
| 167 | Jan Castellon | **sem foto** | — | item Q130372533 sem P18 |
| 169 | Axel Laurance | CC BY-SA 4.0 | 2024 | Axel Laurance Etoile de Bessèges 2024 stage 3 podium.jpg |
| 171 | Nicolas Vinokurov | CC BY-SA 4.0 | 2024 | 2024 UCI Road World Championships Zurich Men U23 ITT 52.jpg |
| 175 | Yannis Voisard | CC BY-SA 4.0 | 2022 | Tour de Romandie 2022 Villars 6864.jpg |
| 177 | Luke Mudgway | CC BY-SA 3.0 | 2015 | Waver - Memorial Philippe Van Coningsloo, 7 juni 2015, vertrek (B056).JPG |
| 179 | Georg Steinhauser | CC BY 2.0 | 2024 | GIRO7901 Steinhauser (53750576300).jpg |
| 180 | Pierre Gautherat | CC BY-SA 4.0 | 2023 | Pierre Gautherat - 2023 UCI Road World Championships (Men's under-23 road race).jpg |
| 178 | Aubin Sparfel | CC BY-SA 4.0 | 2025 | TBL2025-04 Aubin Sparfel.jpg |

Todos os arquivos ficam em `https://commons.wikimedia.org/wiki/File:<nome do arquivo>`.

**Cobertura estimada:** 28 de 29 (≈97%). Licenças: CC BY-SA (2.0/3.0/4.0) 20; CC BY 2.0 4; CC0 3; domínio público 1. Projetando com cautela para os 180: algo entre 85% e 95% com alguma foto livre, porque a amostra pegou nomes conhecidos o bastante para ter item no Wikidata e o fim do ranking tem mais estreantes (como Castellon).

**Ressalvas de qualidade** (importam para uma carta):
- Várias fotos têm 5 a 11 anos (Mudgway 2015, Gee 2018, Rajović 2018, Gall/Ciccone/Pithie 2019), algumas de outra modalidade (pista) ou categoria (júnior), com outra equipe na camisa.
- Muitas são fotos de corrida ou pódio, com outras pessoas e logos de patrocinador no quadro: exigem recorte, e o logo na camisa continua lá.
- Estilos, enquadramentos e resoluções variam muito; o baralho ficaria visualmente desigual.
- A licença declarada no Commons pode estar errada (ex.: foto do Flickr marcada como domínio público). Vale conferir arquivo por arquivo antes de usar.

### 2.3 O que a licença exige

- **CC BY e CC BY-SA, seção 3(a)(1)** ([texto legal CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)): manter a identificação do autor, aviso de copyright, referência à licença e ao aviso de isenção de garantia, link para o material "quando razoavelmente praticável", **indicar se houve modificação** (recorte conta) e indicar a licença com link. A seção 3(a)(2) aceita cumprir isso "de qualquer maneira razoável" para o meio, inclusive com um link para uma página que reúna os créditos.
- **CC BY-SA, ShareAlike**: a versão modificada (a foto recortada) precisa sair sob a mesma licença (ver [Commons: Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)).
- **Formato recomendado pelo Commons** ([Commons: Credit line](https://commons.wikimedia.org/wiki/Commons:Credit_line)): Título, Autor, Fonte (link para a página do arquivo) e Licença (link). Na prática: uma página "Créditos das fotos" no site, com uma linha por carta, e um "foto: Autor, CC BY-SA 4.0" pequeno na própria carta ou um link para essa página.
- **CC0 e domínio público**: sem exigência de atribuição (dar crédito ainda é boa prática).
- **O que a licença NÃO cobre**: a seção 2(b)(1) da CC BY-SA diz que direitos de publicidade, privacidade e personalidade não são licenciados. O Commons repete: "A free image licence only covers the photographer's rights and says nothing about the subject" ([Commons: Photographs of identifiable people](https://commons.wikimedia.org/wiki/Commons:Photographs_of_identifiable_people)), e a tabela por país dessa página marca o Brasil como exigindo consentimento para publicar e para usar comercialmente foto de pessoa identificável. Ou seja, a foto livre resolve o fotógrafo, não o atleta.

## 3. Alternativas visuais sem foto

| Opção | Material pronto | Licença | Observação |
|---|---|---|---|
| Bandeira do país | [lipis/flag-icons](https://github.com/lipis/flag-icons) (SVG, 12,5 mil estrelas) | MIT | Bandeiras nacionais em si não são marca; manter o aviso MIT no repo. Cobre 100% das cartas. |
| Cores da equipe | Duas ou três cores sólidas por equipe, definidas à mão | — | Cor não é logo; evitar reproduzir o desenho do logo ou da camisa. São ~25 equipes no CSV. |
| Avatar gerado | [DiceBear](https://www.dicebear.com/licenses/) (biblioteca MIT, [repo](https://github.com/dicebear/dicebear)) | 42 estilos CC0, 14 CC BY 4.0 | Determinístico a partir do nome: mesmo ciclista, mesmo avatar. Estilos CC0 (ex.: Notionists, Open Peeps, Initials) dispensam atribuição. |
| Silhueta de ciclista por perfil | Desenho próprio, uma por categoria (sprinter, escalador, contrarrelogista, pavê) | Própria | Liga com os atributos do jogo; zero dependência externa. |
| Iniciais em monograma | CSS puro | — | O mais simples; fica bom combinado com cores da equipe e bandeira. |

Combinação que resolve tudo sem foto: **fundo nas cores da equipe + bandeira + silhueta pelo perfil dominante (ou avatar CC0) + nome em texto**. Não envolve direito de imagem, marca de terceiros nem atribuição obrigatória (exceto o aviso MIT das bibliotecas).

## Pontas em aberto

- Registro de "Super Trunfo" no INPI (titular, classes, vigência): não verificado. Busca manual em [busca.inpi.gov.br](https://busca.inpi.gov.br/).
- Texto exato da Súmula 403 e da opinião do caso C.B.C.: as páginas oficiais recusaram acesso automatizado.
- Cobertura de fotos para os 180: a amostra é de 29; um script sobre o CSV inteiro dá o número exato, se a decisão for usar fotos.
