# Refatoração Front-End Profissional

Este pacote é uma proposta segura para separar responsabilidades mantendo seletores, dados e comportamento.

## Estrutura

```text
project/
  index.html
  css/
    theme-default.css
    theme-soft.css
    theme-fantasy.css
    theme-dark.css
    base.css
    layout.css
    cards.css
    list.css
    detail.css
    pagination.css
    animations.css
  js/
    utilities.js
    themes.js
    pagination.js
    cards.js
    details.js
    search.js
    app.js
  assets/
    fonts/
    images/
  data/
```

## Ordem de carregamento

CSS: tema primeiro, depois base e componentes. JS: utilidades primeiro e app por último.

## Melhorias identificadas

- CSS monolítico com muitos seletores de card/list/detail no mesmo bloco.
- Cores e sombras repetidas que devem virar variáveis de tema.
- Funções de mídia, normalização, Minecraft color codes, emblemas e renderização misturadas no mesmo script.
- Renderização recria muitos nós; usar DocumentFragment e paginação já reduz custo.
- Efeitos 3D e animações podem ser desativados com prefers-reduced-motion.
- Imagens de avatar/banner/personagem devem usar loading=lazy, decoding=async e cache por URL.

## Escalabilidade

1.000 usuários: busca local com debounce, paginação e lazy loading são suficientes.
10.000 usuários: criar índice normalizado em memória, virtualização da lista e cache de imagens/metadados.
100.000 usuários: busca/paginação no servidor, API com cursor, CDN para imagens e cache HTTP agressivo.

## Temas

A troca de tema deve alterar apenas o arquivo theme-*.css ou o atributo data-theme. HTML e JS continuam iguais.
