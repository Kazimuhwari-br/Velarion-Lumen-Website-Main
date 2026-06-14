Coloque aqui as imagens do loader.

Nomes:
background1.png
background2.png
background3.png
...

Depois altere em assets/js/velarion.config.js:
backgroundCount: quantidade real de imagens existentes.

Importante:
- Se você só colocou background1.png, deixe backgroundCount: 1.
- Se deixar backgroundCount: 10 mas só existir background1.png, o loader pode tentar imagens que não existem; esta versão volta para background1/fallback, mas o ideal é usar a quantidade real.
- fallback.png é usado quando uma imagem estiver faltando.
