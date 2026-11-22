# Padrões de código

Regras de julgamento para a revisão (`/code-review`). O que uma ferramenta confere (typecheck, testes, CI) não entra aqui.

Cada regra veio de um achado real da revisão da primeira versão (PR #30).

## Regras moram em `src/regras/`

- A tela (`src/telas/`) manda ações e desenha os eventos e o estado que recebe. Quem ganhou, por quê, quem escolhe e quando a partida acaba vêm do módulo de regras.
- Uma conta derivada do estado (ex.: vencedor → ganhou/perdeu/empate) mora num lugar só e as telas chamam esse lugar.

## Nomes

- Use os termos do `GLOSSARY.md`, com a mesma grafia. Ex.: **Retrospecto**, não "placar", para vitórias e derrotas por Nível.
- Nomes por extenso: `contextoDeAudio`, `frequencia`, `duracao`, `volume`. Abreviação só quando o glossário a define.

## Dados guardados no celular

- Guarde só o que a spec manda guardar (Retrospecto e Partida guardada). Preferências de sessão ficam na memória da página.
- Ao ler do `localStorage`, valide a forma: um estado com carta fora do baralho atual ou campo de tipo inválido é ignorado, e o jogo começa limpo.

## Uma fonte para cada valor

- Constantes e textos repetidos entre telas (nomes de pessoa, de atributo, de Nível) moram num módulo e as telas importam de lá.
- Campos que ninguém lê saem do tipo.
