Velarion Lumen - Fallbacks e posições oficiais (v13)

Esta versão faz o site tratar badges_fallbacks como fonte oficial dos valores alternativos.

Quando um jogador não tiver algum parâmetro, ou quando um ID apontar para algo inexistente, o site tenta usar:

1. badges_fallbacks.defaults
2. badges_fallbacks.profile.website (compatibilidade antiga)
3. badges_fallbacks.<tipo>.fallback_id / id
4. fallback interno seguro

Tipos cobertos:
- avatar
- banner
- character
- verified
- role
- rank
- rarity
- levelrank
- status/avatarlock
- achievement
- clan

Também foi adicionado badges_fallbacks.positions.profile para controlar a ordem oficial das seções do perfil completo:
- header
- overview
- progression
- systems
- clan_title
- badges

Arquivos alterados:
- assets/js/main.js
- assets/js/velarion-card.js
- assets/js/velarion-profile.js
- profile-preview-dados.html

JSONs oficiais atualizados foram enviados no pacote velarion_firebase_badges_json_v3.zip.
