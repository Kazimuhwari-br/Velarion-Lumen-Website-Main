Velarion Card — Character Media Layout por slot com fallback

Versão:
20.61-character-media-layout-slot-fallbacks

Cada slot em:
website_panel.character_media_layout.ID_N.velarion_card_sync.character_image.slots

aceita três tipos:

1) OBJETO
"id_1": {
  "image": false,
  "video": { ... }
}

2) FALLBACK
"id_2": "fallbacks_id_female"

Resolve para:
information_panel.badges_fallbacks.character_media_layout.website.female

Esse fallback deve conter diretamente:
{
  "image": { ... },
  "video": { ... }
}

3) FALSE
"id_3": false

Significa: nenhum override de character_media_layout naquele slot;
o CSS/renderer original assume.

Compatibilidade:
- também continua aceitando ID_N inteiro como "fallbacks_id_X".
