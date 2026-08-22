Velarion Lumen — Social Name Sync v20.55

Objetivo
- Toda chave existente em profilePlayers.<ID>.website_social passa a procurar automaticamente uma chave com o mesmo nome em website_panel.social_fallback.
- Não existe whitelist obrigatória de redes sociais no renderer. Novos nomes funcionam sem alterar o JavaScript.

Exemplo
profilePlayers.ID_0.website_social.gameram = "https://web.gameram.com/profile/Kazimuhwari"
website_panel.social_fallback.gameram.website = { ...visual... }

Resultado
- A conexão gameram usa automaticamente title, label, bio, color, color2, glow, gradient, intensity, icon, emblem, banner, aura, particles e shimmer definidos no social_fallback.gameram.

Compatibilidade
- Correspondência ignora diferenças simples de caixa, espaços e hífens/underscore.
- aliases/keys/social_keys continuam aceitos dentro da definição.
- type explícito continua podendo apontar para outro visual.
- default continua sendo usado somente quando não há correspondência.

Visual livre
Além de website, os campos visuais podem ser colocados diretamente na definição ou dentro de visual/style. A precedência é:
1. definição raiz
2. visual
3. style
4. website (maior prioridade)

Também há suporte opcional a:
- css_vars/cssVars: somente variáveis --vl-social-*
- classes/class_name/className: somente classes iniciadas por vl-social-

Arquivo principal alterado
- assets/js/velarion-profile.js

Cache atualizado
- users/profile.html
- pages/habitantes.html
- pages/rankings.html
