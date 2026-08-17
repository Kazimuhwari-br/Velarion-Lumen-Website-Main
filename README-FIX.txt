Velarion Lumen — Social Emblem Fix v20.53

Arquivos principais alterados:
- assets/js/velarion-profile.js
- assets/js/velarion-profile-page.js
- assets/css/velarion-profile.css
- users/profile.html
- assets/data/website_panel.reference.json

Mudanças:
1. X/Twitter e YouTube recebem os emblems definidos no website_panel.
2. website_panel.json é carregado pelo standalone profile antes do primeiro render.
3. merge de social_fallback agora preserva campos website por rede (deep merge).
4. aliases e variantes de chaves são resolvidos genericamente.
5. CSS usa data-social-has-emblem para não depender apenas de :has().
6. users/profile.html passa de cache key v20.23 para v20.53.

IMPORTANTE:
Substitua também users/profile.html. Sem a mudança do cache key, o navegador/GitHub Pages pode continuar usando os JS/CSS antigos já armazenados.
