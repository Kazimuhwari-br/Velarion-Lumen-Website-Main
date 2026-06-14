Velarion Lumen - Compatibilidade dos novos JSONs de badges (v12)

Esta versão atualiza o site para ler os campos novos adicionados nos caminhos:

- badges_verified
- badges_roles
- badges_raritys / badges_rarities
- badges_ranks
- badges_levelranks
- badges_fallbacks
- badges_avatarlocks / badges_warns / badges_moderation_status
- badges_achievements

Os campos antigos continuam funcionando: website.color, color2, glow, icon, label, min, max, title, banner, particles e shimmer.

Campos novos reconhecidos:
- id, type, description, category, priority, order, enabled
- visibility.card, visibility.profile, visibility.public
- display, hierarchy, progression, profile
- rarity.card_effects / rarity.profile_effects
- achievement.points, category, description, unlock, display
- avatarlock/status.public.safe_label e safe_description

O site não exige que você altere profilePlayers/DBPlayers imediatamente. Ele apenas passa a aproveitar os novos campos se eles existirem no Firebase.
