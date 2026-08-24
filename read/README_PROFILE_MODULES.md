# Arquitetura modular do perfil

A página de perfil usa `velarion-profile.js` somente como coordenador do shell, navegação, conexões, conquistas e integração com o card oficial.

Os três blocos abaixo são componentes independentes e são a única fonte de visual/lógica de seus respectivos módulos:

- Documento do Aventureiro
  - CSS: `assets/css/velarion-profile-document.css`
  - JS: `assets/js/velarion-profile-document.js`
- Progresso
  - CSS: `assets/css/velarion-profile-progression.css`
  - JS: `assets/js/velarion-profile-progression.js`
- Registro Público
  - CSS: `assets/css/velarion-profile-public-record.css`
  - JS: `assets/js/velarion-profile-public-record.js`

`assets/css/velarion-profile.css` não deve voltar a receber regras visuais desses três componentes. Isso evita que versões antigas sobrescrevam os módulos atuais pela cascata do CSS.

`users/profile.html` carrega explicitamente os CSS/JS modulares antes do coordenador para evitar dependência de carregamento tardio e problemas de cache/fallback.
