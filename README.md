# Velarion Lumen Website

Website front-end da comunidade **Velarion Lumen**, com páginas de apresentação, busca de jogadores e perfil individual.

## Demo

Quando publicado no GitHub Pages:

```txt
https://kazimuhwari-br.github.io/Velarion-Lumen-Website-Main/
```

## Funcionalidades

- Página inicial moderna.
- Busca de jogadores.
- Perfil individual por `users/?id=ID_DO_PLAYER`.
- Integração com Firebase Realtime Database.
- Componentes reutilizáveis em JavaScript puro.
- CSS separado por base, layout, tokens e componentes.
- Estrutura pronta para portfólio GitHub.

## Estrutura

```txt
├─ index.html
├─ 404.html
├─ search/users/index.html
├─ users/index.html
├─ src/
│  ├─ components/
│  ├─ config/
│  ├─ pages/
│  ├─ services/
│  ├─ styles/
│  └─ utils/
├─ docs/
├─ assets/
└─ data/
```

## Como rodar localmente

Use um servidor local, porque o projeto usa ES Modules:

```bash
python -m http.server 5500
```

Depois abra:

```txt
http://localhost:5500
```

## Arquitetura

- `pages`: entrada JS de cada página.
- `components`: pedaços visuais reutilizáveis.
- `services`: comunicação com Firebase/API.
- `utils`: funções pequenas reutilizáveis.
- `styles`: organização visual do projeto.
- `config`: URLs e constantes globais.

## Roadmap

- Adicionar filtros avançados de rank/plataforma.
- Adicionar paginação.
- Criar tema claro/escuro.
- Adicionar screenshots no README.
- Migrar para Vite quando precisar de build profissional.
