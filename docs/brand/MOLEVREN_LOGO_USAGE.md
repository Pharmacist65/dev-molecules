# Molevren logo usage

Status: Production asset rules, Phase A  
Last reviewed: 2026-08-25

## Asset selection

| Context | Required asset |
| --- | --- |
| Product navigation on dark | `molevren-header-lockup-dark.svg` plus the adjacent HTML brand line |
| Large horizontal signature on dark | `molevren-lockup-horizontal-dark.svg` |
| Ivory editorial or print surface | `molevren-lockup-horizontal-light.svg` |
| Narrow marketing composition | matching stacked lockup |
| Compact product control, 24–64 px | `molevren-symbol-flat.svg` |
| Hero or brand board, 96 px and above | `molevren-symbol-metallic.svg` |
| Browser/PWA micro-size | `molevren-favicon.svg` or generated icon |
| One-colour light field | `molevren-monochrome-dark.svg` |
| One-colour dark field | `molevren-monochrome-light.svg` |
| Mask/pinned application | `molevren-mask-icon.svg` |

Do not use the supplied visual-reference PNG as a logo asset. Production PNGs
are deterministic derivatives rendered from the SVG files by
`scripts/render-molevren-brand.mts`.

## Clear space

Let **x** equal the diameter of one outer node in the symbol.

- Standalone symbol: keep at least `1.5x` clear on every side.
- Horizontal lockup: keep at least `2x` clear on every side.
- Stacked lockup: keep at least `2x` clear above/below and `1.5x` left/right.
- Favicon/app icon: its built-in safe area is final; do not add another frame.

No border, text, molecule label, navigation rule, or page edge may enter the
clear-space area.

## Minimum size

- Simplified favicon: 16 px.
- Flat standalone symbol: 24 px digital / 8 mm print.
- Metallic standalone symbol: 96 px digital / 24 mm print.
- Horizontal lockup: 220 px digital / 55 mm print.
- Header lockup: 228 px digital with a separate 11–12 px HTML brand line.
- Stacked lockup: 150 px digital / 38 mm print.
- Monochrome lockup: 160 px digital / 40 mm print.

Below these lockup sizes, use the standalone flat symbol and an adjacent HTML
product label if a name is required. The product header keeps the three-part
brand line as real HTML text so it remains legible and responsive; never
squeeze the tagline into a micro SVG.

## Backgrounds

Use dark assets on Deep Navy, Midnight Stage, Parliament Blue, or a sufficiently
dark photograph. Use light assets on Soft Lake Ivory or Paper Ivory. If a
background is visually busy, place the lockup on an approved solid or glass
surface; do not add an improvised glow or outline.

The metallic symbol is designed for a controlled large-format use on both dark
and ivory fields. Repeated UI always uses the flat symbol.

## Monochrome

Monochrome variants preserve the geometry and custom wordmark. Use only the
provided navy or ivory paths. For true single-ink output, map the asset to one
solid production colour without introducing tints inside the mark.

## Favicon and app icons

The favicon deliberately removes the orbital detail, divider, wordmark, and
tagline. At 16 px the three required signals remain visible: the M, the outer
geometry, and orange/blue separation.

Generated sizes:

- 16, 32, and 48 px browser icons;
- 180 px Apple touch icon;
- 192 and 512 px PWA icons;
- 512 px maskable icon;
- multi-size `favicon.ico`.

Do not place the wordmark inside an app icon. Do not use the metallic gradients
at 16 or 32 px.

## Wordmark integrity

The wordmark is custom vector artwork. Keep its original proportions and the
single orange V cut. Never:

- retype it in Fraunces, Manrope, Cinzel, Satoshi, or another font;
- change letter spacing by moving individual paths;
- recolour the V cut independently from the orange system;
- separate or animate individual letters in product UI;
- translate the name;
- attach “Dev Molecules” to the primary lockup.

## Incorrect use

Do not:

- stretch, shear, rotate, crop, or redraw the mark;
- convert the symbol into a claim about a specific molecule;
- replace it with a stock atom or molecule icon;
- apply chrome, bevel, shadow, or bloom to the flat assets;
- fill every node with a different colour;
- place it on low-contrast blue/orange photography;
- put the metallic gradient in body copy;
- repeat the full lockup in every card;
- show two competing primary brands;
- automatic-trace a raster board to make a new variant.

## Accessibility and HTML

When the adjacent text already says Molevren, treat the symbol as decorative
(`alt=""`). When the lockup is the only product identifier, use `alt="Molevren"`.
Linked home marks require a locale-aware accessible name such as “Molevren ana
görünümünü aç” or “Open the Molevren home view.” Inline SVGs must not expose
unlabelled path noise to assistive technology.
