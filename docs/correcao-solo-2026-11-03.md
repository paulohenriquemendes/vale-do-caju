# Continuidade do cenário — 03/11/2026

Os blocos aparentes eram recortes da pintura original com chão e vegetação cortada nas bordas. A correção remove nove sobreposições decorativas, usa transparência real no pomar e açude, e troca as faixas retangulares opacas dos caminhos por gradientes.

## Arte

Criada com a ferramenta integrada image_gen, usando `public/assets/farm-retro.png` como referência. Os originais foram preservados.

- `public/assets/cashew-transparent.png`
- `public/assets/pond-transparent.png`

Prompt do cajueiro:

> Create ONE isolated game sprite: extract/recreate the FIRST mature cashew tree near the upper center of the reference farm painting. Preserve the detailed warm hand-painted retro-modern 2.5D top-down game style and full leafy crown with red/yellow cashew fruits, crooked brown trunk and visible roots. Entire tree fully within image with 8% transparent padding on ALL sides. True transparent background (alpha), including gaps between branches. NO ground, NO soil island, NO rectangle, NO grasses, NO stones, NO fence, NO other tree, NO scenery. Only the complete cashew tree on transparency. Square sprite asset intended for rendering at 192x204 pixels in the existing farm game. Save output image as a local PNG asset.

Prompt do açude:

> One isolated small shallow semi-arid farm pond game sprite, matching lower right pond in reference. Warm detailed painted retro 2.5D overhead view. Irregular oval muddy olive water basin surrounded by complete rounded stones, a few dry reeds. Full natural irregular outline completely inside image with transparent margin all sides. True transparent background around outer stones. NO rectangular ground patch, NO scenery, NO trees, NO fences, NO text. Only complete small pond and enclosing stones with sparse reeds. Match approved reference palette and texture, intended to draw at 235x225 pixels.

## Verificação

- Compilação de produção e tipos.
- Testes de integração existentes, incluindo quatro irmãos, entregas, salvamento e personalização.
- Teste de arquivos ampliado para as seis imagens carregadas pelo jogo.
- Inspeção visual do mapa completo e pomar ampliado no navegador.
- PNGs com canal alfa real; conteúdo visível totalmente dentro da imagem e cantos transparentes (alfa máximo 1/255).

As bordas dos canteiros e cercados dos galinheiros são construções do jogo, não falhas no chão.
