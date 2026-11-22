# A carta tem foto do ciclista

Substitui o [ADR 0002](0002-carta-sem-foto.md). O dono decidiu pôr a foto do ciclista na carta (22/11/2026). A foto fica no círculo do topo, onde antes ficavam as iniciais, e também aparece no duelo.

- **Fonte**: só fotos do Wikimedia Commons com licença livre (CC BY, CC BY-SA, CC0 ou domínio público). O autor, a licença e a página de cada foto ficam em `data/fotos/creditos.csv` e aparecem em "Como jogar", como a licença pede. A foto é recortada no rosto, e o texto dos créditos diz isso.
- **Carta sem foto**: mostra as iniciais, como antes.
- **Risco que continua**: a licença livre cobre o fotógrafo, não o direito de imagem do atleta. O jogo é gratuito e sem anúncio, e a foto mostra o atleta como figura pública do esporte. Se um atleta ou equipe pedir, a foto sai: basta tirar a linha dele de `data/fotos/recorte.csv` e rodar `scripts/gerar_fotos.py`.
- **Logo de equipe e da UCI continuam fora**, pelo mesmo motivo do ADR 0002.

As fotos originais ficam em `data/fotos/`. O jogo usa as versões recortadas e menores em `public/fotos/` (WebP, 288 px), que entram no cache da PWA para o modo solo funcionar sem internet.
