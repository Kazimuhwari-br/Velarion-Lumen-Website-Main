# Velarion Lumen — Projeto reorganizado

Estrutura criada conforme solicitado:

```txt
/index.html
/pages/aventureiros.html
/pages/habitantes.html
/pages/guildas.html
/pages/reinos.html
/pages/missoes.html
/pages/rankings.html
/pages/eventos.html
/pages/reliquias.html
/pages/academia.html
/pages/comunidade.html
/pages/suporte.html
/assets/css/style.css
/assets/js/main.js
/assets/img/
```

## O que foi feito

- `index.html` virou o Hub principal.
- Cada seção principal ganhou uma página `.html` separada dentro de `/pages`.
- O visual comum fica centralizado em `/assets/css/style.css`.
- O comportamento global fica em `/assets/js/main.js`.
- Todas as páginas compartilham o mesmo header, menu, estilo visual e footer.
- A estética evita parecer diretamente Minecraft Bedrock e usa uma direção de fantasia moderna + anime + interface limpa.

## Como editar

- Para mudar visual global: edite `assets/css/style.css`.
- Para scripts globais: edite `assets/js/main.js`.
- Para conteúdo de uma seção: edite apenas o HTML da página correspondente em `/pages`.
- Para imagens futuras: coloque em `assets/img/` e referencie com caminho relativo.

## Observação

Este pacote é uma base limpa e pronta para expansão. Se quiser conectar Firebase, rankings reais, perfis reais ou NPCs dinâmicos, a estrutura já está separada para isso.


## Integração funcional aplicada

Esta versão usa `index.html` e `/pages` como estrutura nova. A lógica funcional da antiga página `/search/users/` foi centralizada em `assets/js/main.js` e adaptada para:

- Hub com contadores e top aventureiros reais;
- `/pages/aventureiros.html` carregando `profilePlayers.json`;
- `/pages/habitantes.html` preparado para ler uma coleção própria de habitantes/NPCs via `data-firebase-url`;
- `/pages/rankings.html` usando a classificação real por `stats.progression.pts`;
- busca, cards, lista, paginação, perfil rápido, badges, emblemas verificados e leitura de `information_panel.json`;
- sem manter `/search/users/` como rota isolada;
- sem CSS/JS antigos soltos como arquivos separados.

Para trocar a fonte dos Habitantes, edite o atributo `data-firebase-url` em `/pages/habitantes.html`.

## Ajuste de tela 1024x768 com zoom 67%

Foi criada uma localização central para este perfil de tela:

- JavaScript: `assets/js/main.js`, bloco `LOCALIZAÇÃO DE TELA: 1024x768 com zoom de página em 67%`.
- CSS: `assets/css/style.css`, bloco `LOCALIZAÇÃO DE TELA — 1024x768 + zoom 67%`.

A ativação é automática quando a tela física é 1024x768 e o zoom aparente está próximo de 67%.

Também é possível forçar manualmente adicionando ao endereço:

```txt
?vlLayout=1024x768-67
```

Para limpar a configuração salva:

```txt
?vlLayout=auto
```

Pelo console do navegador:

```js
VelarionLayout.setPreset('1024x768-67')
VelarionLayout.clearPreset()
```


## Loader inicial apenas na primeira abertura

O loader cinematográfico de entrada usa `sessionStorage` com a chave `vlBootShownOnce`.
Assim, ele aparece somente no primeiro acesso da aba/sessão e não reaparece ao clicar nos botões de navegação entre páginas.

Arquivos envolvidos:

- `assets/js/main.js` — bloco `LOADER INICIAL — uma única vez por aba/sessão`;
- `assets/css/style.css` — regra `html.vl-skip-boot .vl-boot`;
- HTML das páginas — script pequeno no `<head>` que evita flash visual quando o loader já foi exibido.
