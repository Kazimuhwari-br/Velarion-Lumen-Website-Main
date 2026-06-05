# Arquitetura Front-End

Esta versão substitui a estrutura antiga por uma estrutura modular.

## Regras

1. HTML não deve conter lógica grande.
2. Cada página possui um arquivo em `src/pages`.
3. Componentes ficam em `src/components`.
4. Busca de dados fica em `src/services`.
5. Funções auxiliares ficam em `src/utils`.
6. CSS global deve ser pequeno; CSS de componente fica em `src/styles/components`.

## Rotas

```txt
/                     Página inicial
/search/users/        Busca de jogadores
/users/?id=ID         Perfil de jogador
```

## Observação

A rota antiga `/users/ID/profile` foi trocada por `/users/?id=ID` para funcionar melhor em GitHub Pages sem backend.
