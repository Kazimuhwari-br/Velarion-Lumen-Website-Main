Velarion Lumen - Cores do Apelido via Firebase

Caminho principal das cores:
.server_panel.nickname_colors.items

Campo do jogador usado para escolher a cor:
theme.color_name_id

Nova regra do site:
1. O site procura a cor/gradiente somente em .server_panel.nickname_colors.items[color_name_id].
2. Se não encontrar a cor ou se o server_panel não carregar, usa .information_panel.badges_fallbacks.defaults.nickname_color.
3. Se esse fallback também não existir, usa #FFFFFF.

Não há mais fallback para as cores locais antigas do JavaScript para o Apelido.

Objeto recomendado para o Firebase:
.information_panel.badges_fallbacks.defaults.nickname_color: "#FFFFFF"

Arquivos incluídos:
- server_panel_nickname_colors.json
  Importação completa com .server_panel.nickname_colors.

- nickname_colors_only.json
  Apenas o objeto nickname_colors.

- nickname_color_items_only.json
  Apenas os items, caso você queira inserir diretamente dentro de .server_panel.nickname_colors.items.

- information_panel_badges_fallbacks_defaults_nickname_color.json
  Objeto completo com .information_panel.badges_fallbacks.defaults.nickname_color.

- badges_fallbacks_defaults_nickname_color_only.json
  Use este se você já estiver dentro do nó information_panel no Firebase.


Correção V15:
- O site busca o Firebase em:
  https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/server_panel.json
  https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json
- Foram adicionados aliases para os IDs antigos usados em theme.color_name_id, por exemplo:
  blue_color1 -> blue_gradient_color1
  fire_color1 -> fire_gradient_color1
  kazin_color1 -> kazin_gradient_color1
- Isso evita o apelido ficar branco quando o perfil usa o ID antigo sem a palavra "gradient".


Correção V16:
- Adicionado alias português: theme.color_name_id = "ametista" agora procura também "amethyst".
- Os JSONs também incluem o item .server_panel.nickname_colors.items.ametista.
- O leitor ficou mais tolerante caso o objeto nickname_colors_only.json tenha sido importado por engano diretamente dentro de /server_panel.

Para testar no Firebase, o caminho válido é sem ponto no nome da chave:
server_panel/nickname_colors/items/ametista

Objeto direto para inserir dentro de server_panel.nickname_colors.items:
{
  "ametista": {
    "id": "ametista",
    "label": "Ametista",
    "alias_of": "amethyst",
    "type": "solid",
    "color": "#9A5CC6",
    "css_value": "#9A5CC6",
    "enabled": true
  }
}
