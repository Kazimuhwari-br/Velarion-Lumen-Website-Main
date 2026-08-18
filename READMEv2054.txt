VELARION SOCIAL AVATAR FRONTEND — V20.54

Substitua exatamente estes arquivos no site público:

- assets/js/velarion-profile.js
- assets/css/velarion-profile.css
- users/profile.html

velarion-profile-page.js NÃO precisa ser alterado nesta etapa.
Ele já carrega o objeto completo do jogador em profilePlayers e o entrega ao
VelarionProfile.render(), portanto website_social_cache chega ao renderer sem
nenhuma adaptação adicional.

Prioridade visual do quadrado esquerdo:
1) player.website_social_cache[rede].icon
2) website_panel.social_fallback[rede].website.icon
3) letra da rede

O emblem do lado direito continua vindo somente do website_panel.
