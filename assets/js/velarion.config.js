/* ======================================================================
   CONFIGURAÇÃO RÁPIDA — Velarion Lumen
   ----------------------------------------------------------------------
   Edite este arquivo quando quiser trocar quantidade de backgrounds,
   duração do carregamento ou ativar/desativar manutenção.

   Para adicionar mais imagens:
   1) coloque os arquivos em assets/img/loading/
   2) nomeie como background1.png, background2.png, background3.png...
   3) altere apenas loading.backgroundCount abaixo.
   ====================================================================== */
window.VELARION_CONFIG = {
  loading: {
    enabled: true,

    // true = aparece só no primeiro acesso da aba/sessão.
    // false = aparece sempre que abrir/recarregar uma página.
    showOncePerSession: true,

    // Quantidade total disponível em assets/img/loading/background{number}.png
    // Exemplo: se tiver background1.png até background25.png, use 25.
    backgroundCount: 4,

    // Caminho padrão pedido: ./assets/img/loading/background{number}.png
    // O site ajusta automaticamente para páginas dentro de /pages.
    backgroundPathPattern: "./assets/img/loading/background{number}.png",

    // Tempo mínimo e máximo do loader.
    // Aumentei o mínimo para a tela aparecer com presença, sem parecer um flash rápido.
    minDurationMs: 6500,

    // Segurança: mesmo se algum dado demorar ou falhar, o loader fecha sozinho.
    maxDurationMs: 12000,

    // Troque este texto quando quiser forçar o loader a aparecer novamente em testes.
    // Exemplo: "v2", "v3"...
    version: "loader-performance-v7",

    // Fallback real. Nesta versão, fallback.png é uma imagem de carregamento,
    // não apenas um fundo geométrico. Se aumentar backgroundCount e algum arquivo
    // estiver faltando, o loader volta para background1/fallback em vez de ficar vazio.
    fallbackImage: "./assets/img/loading/fallback.png",

    // Descrições de fantasia moderna exibidas no carregamento.
    texts: [
      "Abrindo os portões de Lumen",
      "A névoa da cidade desperta",
      "Ecos do Codex atravessam o véu",
      "Relíquias urbanas respondem ao chamado",
      "As luzes de Velarion se alinham",
      "O caminho dos aventureiros está sendo traçado"
    ],

    // Modo leve: escolhe UMA imagem aleatória por carregamento e não troca durante a tela.
    // Isso evita consumo alto quando existem muitas imagens ou imagens pesadas.
    rotateDuringLoading: false,

    // Use apenas se quiser trocar de imagem enquanto ainda carrega.
    // Recomendado deixar 0/false para PC antigo e navegador mais leve.
    backgroundIntervalMs: 0,

    // Preload da próxima imagem. Desligado para evitar consumo extra.
    preloadNextBackground: false,

    // true = o loader espera a imagem do fundo aparecer antes de começar a fechar.
    // Isso evita a imagem surgir só no final do carregamento.
    waitForBackground: true,

    // Tempo mínimo que a imagem precisa ficar visível antes do loader fechar.
    backgroundVisibleMinMs: 2200,

    // Segurança: se a imagem demorar demais, o loader continua sem ficar preso.
    backgroundWaitMaxMs: 4200,

    // Evita repetir imediatamente a última imagem mostrada.
    avoidImmediateRepeat: true,

    // Barra visual de progresso do carregamento. É interrompida ao fechar.
    progressEnabled: true,

    // true = remove o loader do DOM após o fade, parando animações e downloads pendentes.
    destroyAfterClose: true
  },

  performance: {
    // true = reduz efeitos contínuos pesados depois do loader, sem mudar o layout.
    lowPowerMode: true,

    // false = mais leve: mantém nomes com gradiente, mas sem animação JS infinita.
    // true = anima gradientes em baixa frequência e pausa quando a aba fica oculta.
    animateNameGradients: false,

    // Só usado quando animateNameGradients estiver true.
    gradientAnimationFps: 10
  },

  maintenance: {
    // Troque para true para mandar o site para a página maintenance.html.
    enabled: false,

    // Página separada de manutenção.
    page: "maintenance.html",

    // Permite visualizar o site mesmo com manutenção ligada usando:
    // ?vlMaintenancePreview=1
    // Remova ou troque esse valor se não quiser esse atalho visual.
    previewParam: "vlMaintenancePreview"
  }
};
