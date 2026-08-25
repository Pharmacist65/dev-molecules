# Molevren brand guide

Status: Public Alpha brand system, Phase A  
Last reviewed: 2026-08-25

## Brand architecture

**Public product name:** MOLEVREN  
**English descriptor:** Pharmaceutical Molecular Atlas & Academy  
**Turkish descriptor:** Farmasötik Moleküler Atlas ve Akademi  
**Optional brand line:** STRUCTURE. MOTION. KNOWLEDGE.  
**Technical repository/platform:** dev-molecules / Dev Molecules

Molevren is the only primary public-facing brand. Dev Molecules remains the
technical platform and repository name and may appear in technical
documentation, About copy, or a small footer attribution:

> Molevren is built on the Dev Molecules platform.

The two names must not appear with equal visual weight or in the same primary
lockup.

## Brand idea

Molevren makes the connected nature of pharmaceutical knowledge visible. Its
identity joins four ideas: molecular structure, relationships, motion, and
learning. The mark is deliberately abstract; it is not a representation of a
real molecule, medicinal product, target, reaction, or scientific result.

The six-node geometry suggests a bounded knowledge system. The open orbital
node suggests inquiry beyond the current boundary. The geometric M creates a
stable centre without turning the mark into a generic atom icon. Orange means
motion and active choice; blue means knowledge and information hierarchy.

## Voice

Molevren speaks to a curious learner, not to a build pipeline. Public copy is
direct, calm, and human:

- Explore molecules.
- Inspect a drug structure.
- Follow a synthesis pathway.
- Learn nomenclature from the structure.
- Draw a molecule and compare it with the catalog.

Turkish equivalents should be idiomatic rather than literal:

- Molekülleri keşfet.
- Bir ilacın yapısını incele.
- Sentez basamaklarını takip et.
- Nomenklatürü yapı üzerinden öğren.
- Bir molekül çiz ve katalogla karşılaştır.

Developer terms such as “raw row”, “selected source slice”, “pending review”,
or “evidence-aware” belong in source and coverage disclosures, not the hero.

## Logo system

The production system is built from original SVG source files in
`public/brand/`. The supplied concept board was a binding direction reference,
not a production asset; no part of it is cropped, rasterised, traced, or
embedded in the production mark.

- `molevren-symbol-flat.svg`: default compact UI and small-format mark.
- `molevren-symbol-metallic.svg`: large, considered brand moments only.
- `molevren-wordmark.svg`: custom vector wordmark; never typeset from a font.
- horizontal and stacked lockups: primary marketing and product signatures.
- monochrome variants: one-colour or constrained reproduction.
- `molevren-favicon.svg`: simplified micro-size mark.
- `molevren-mask-icon.svg`: single-colour pinned/mask application.

The controlled orange cut in the V suggests a reaction arrow and supplies the
wordmark's identifying detail. It must not be removed or repeated on other
letters.

## Colour

| Role | Name | Value |
| --- | --- | --- |
| Active / motion | Molevren Metallic Orange | `#FF8A00` |
| Deep accent | Deep Copper | `#C85200` |
| Highlight | Orange Highlight | `#FFD0A4` |
| Information | Parliament Blue | `#0A3D91` |
| Knowledge accent | Knowledge Cobalt | `#2D5BE3` |
| Primary dark | Deep Navy | `#0B1324` |
| Deep stage | Midnight Stage | `#050A16` |
| Reading surface | Soft Lake Ivory | `#F6F1E8` |
| Paper surface | Paper Ivory | `#FFFDF7` |
| Neutral UI | Cool Gray | `#A5ADB8` |
| Supporting accent only | Mole Teal | `#00B3C6` |

Orange is a signal, not a wallpaper. Use it for CTA emphasis, active state,
progress, reaction lines, and selection. Parliament Blue carries navigation,
links, academic hierarchy, and data emphasis. Mole Teal is supporting only and
must never compete with the primary blue/orange relationship.

## Typography

The product uses self-hosted fonts; no page load depends on a third-party font
CDN.

- **Fraunces Variable** — editorial display, hero, and dossier titles.
- **Manrope Variable** — navigation, UI, body, and long-form reading.
- **IBM Plex Mono** — formulae, CIDs, SMILES, InChIKeys, and technical data.

All three are distributed under the SIL Open Font License 1.1. The installed
Fontsource 5.3.0 packages include Latin Extended subsets. Their declared
Unicode ranges cover the Turkish characters `ğ ş ı İ ö ü ç`; these glyphs are
also checked in rendered TR acceptance screens.

The SVG wordmark is independent of these fonts. Serif is reserved for
editorial hierarchy. Monospace is never used for paragraphs or status labels.

Minimum product sizes:

- desktop body: 16 px;
- mobile body: 15 px;
- secondary text: 14 px;
- labels: 13–14 px;
- buttons: 14–16 px;
- chemical data: 14 px;
- hero: fluid 48–72 px on desktop;
- section heading: fluid 30–48 px.

## UI expression

The global environment is Deep Navy/Midnight with a low-contrast molecular
atmosphere. Content is layered on dark glass, Soft Lake Ivory, or Paper Ivory.
Long reading surfaces may be light; the application must never become a set of
full-page pure-white slabs. Ketcher and 2D chemistry views retain controlled
light drawing surfaces for accuracy.

Metallic treatment is reserved for the large symbol, thin CTA borders, active
tab lines, reaction arrows, and selected-state highlights. Flat colour is the
default for small controls and repeated components.

## Motion

Motion explains connection, selection, and transition. UI transitions use
150–250 ms; larger state transitions use 400–700 ms with a calm ease-out. The
brand atmosphere never captures pointer input and never opens a WebGL context.

Every moving experience has Full, Reduced, and Off equivalents. The system
respects `prefers-reduced-motion`, pauses while the page is hidden, and keeps
content legible without animation.

## Accessibility

- Use colour and a text/icon/shape cue together for state.
- Preserve a visible keyboard focus ring on dark and light surfaces.
- Use the supplied light lockup on dark fields and dark lockup on ivory fields.
- Keep the atmosphere below text and reduce its opacity on scientific stages.
- Do not place body copy directly over the metallic gradient.
- Provide meaningful alternative text for branded images; decorative marks use
  empty alternative text.
- Keep the wordmark's aspect ratio and never substitute typed “MOLEVREN”.

## TR/EN usage

The brand name remains **Molevren** in sentence case and **MOLEVREN** in the
wordmark in both locales. Translate the descriptor and product copy, not the
brand name or the line `STRUCTURE. MOTION. KNOWLEDGE.`. Turkish copy must retain
native characters; ASCII transliteration is not acceptable.

## Public Alpha boundary

Molevren is a serious Public Alpha for education and research. Passing the
defined V2.1 and Phase A engineering checks is not independent product,
scientific, clinical, or legal certification. The global footer carries one
concise boundary statement:

- EN: “For education and research; not personal clinical advice.”
- TR: “Eğitim ve araştırma amaçlıdır; kişisel klinik öneri değildir.”

