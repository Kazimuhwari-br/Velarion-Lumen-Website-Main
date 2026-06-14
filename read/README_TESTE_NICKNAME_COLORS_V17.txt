Correção V17 - Cores do Apelido via server_panel

Motivo comum para não aparecer:
- O navegador ainda carrega JS antigo por causa do cache-buster v15.
- Agora os HTMLs usam ?v=nickname-colors-server-panel-v17 em main.js e velarion-card.js.

Caminhos que o site lê:
1) https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/server_panel.json
   Dentro dele: server_panel.nickname_colors.items.{color_name_id}

2) https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json
   Dentro dele: information_panel.badges_fallbacks.defaults.nickname_color

Campo do jogador que define a cor:
profilePlayers/{ID_DO_JOGADOR}/theme/color_name_id

Teste direto no console do navegador:
fetch("https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/server_panel/nickname_colors/items/amethyst.json?ts=" + Date.now()).then(r=>r.json()).then(console.log)

Se retornar null, o objeto amethyst não está no caminho correto do Firebase.
Se retornar o objeto, mas o card ainda ficar branco, limpe cache com Ctrl+F5 ou confira se main.js/velarion-card.js estão carregando com v17 na aba Network.
