VELARION — PERFIL EM PÁGINA DEDICADA

Nova rota pública:
  /users/{ID}/profile.html

Exemplo:
  antigo: pages/aventureiros.html#profile-1
  novo:   /users/1/profile.html

Arquivos principais:
  users/profile.html
  assets/js/velarion-profile-page.js
  404.html

Em GitHub Pages/HTTP, o link público é sempre /users/{ID}/profile.html.
O 404.html funciona como roteador para IDs dinâmicos: ele usa internamente
users/profile.html?id={ID}, e velarion-profile-page.js restaura imediatamente
a URL pública /users/{ID}/profile.html na barra do navegador.

Ao abrir o projeto diretamente por file://, não existe roteamento dinâmico de
pastas. Nesse modo, o fallback local continua sendo users/profile.html?id={ID}.
Para testar exatamente /users/1/profile.html localmente, execute o projeto em
um servidor HTTP local (por exemplo Live Server).

A página Aventureiros não carrega mais velarion-profile.js/velarion-profile.css.
O perfil dedicado carrega, nesta ordem:
  velarion-card.css
  velarion-profile.css
  velarion-card-fx.css
  velarion-card.js
  velarion-card-fx.js
  velarion-profile.js
  velarion-profile-page.js
