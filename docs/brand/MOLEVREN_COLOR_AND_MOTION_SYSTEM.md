# Molevren colour and motion system

Status: Product implementation rules, Phase A  
Last reviewed: 2026-08-25

## Palette and semantics

| Token intent | Value | Use |
| --- | --- | --- |
| Metallic Orange | `#FF8A00` | active choice, reaction, CTA, progress |
| Deep Copper | `#C85200` | deep metallic stop, controlled emphasis |
| Orange Highlight | `#FFD0A4` | metallic highlight and dark-surface detail |
| Parliament Blue | `#0A3D91` | navigation, hierarchy, links |
| Knowledge Cobalt | `#2D5BE3` | focus, selection, academic progress |
| Deep Navy | `#0B1324` | global dark surface |
| Midnight Stage | `#050A16` | molecule/synthesis stages |
| Soft Lake Ivory | `#F6F1E8` | elevated reading surfaces |
| Paper Ivory | `#FFFDF7` | long-form paper and controlled chemistry cards |
| Cool Gray | `#A5ADB8` | neutral UI and supporting text |
| Mole Teal | `#00B3C6` | supporting signal only |

The canonical metallic accent is:

```css
linear-gradient(
  135deg,
  #ffd0a4 0%,
  #ff9a2e 18%,
  #ff8a00 36%,
  #d95b00 58%,
  #ffb566 78%,
  #b94000 100%
)
```

It may appear on the large metallic logo, primary CTA border, active tab line,
reaction arrow, or important selection edge. It must not fill page backgrounds,
body text, or repeated cards.

## Surface hierarchy

1. **Midnight/global:** the deepest page field and molecular stage.
2. **Parliament:** directional navigation and information regions.
3. **Dark glass:** elevated controls and compact panels over atmosphere.
4. **Soft ivory:** readable cards and learning surfaces.
5. **Paper ivory:** long-form dossier/reference content and print-like details.
6. **Editor:** a controlled light field reserved for Ketcher and precise 2D work.

Pure `#FFFFFF` is not a full-page surface. It is allowed only inside bounded
technical canvases or exports when the embedded tool requires it.

## Contrast rules

- Main dark-surface text uses Paper/Soft Ivory, not Cool Gray.
- Supporting text on Deep Navy must retain WCAG AA contrast at its rendered size.
- Parliament Blue is not used for small text on Deep Navy; use Knowledge Cobalt
  only where the computed pair passes.
- Orange communicates activity together with a line, icon, label, or position.
- Focus rings combine a high-contrast outline and offset; colour alone is not
  sufficient.
- Atmosphere opacity is reduced behind text and on Atlas Spatial, molecule, and
  synthesis stages.

Automated tests guard canonical pairs, while browser acceptance verifies real
text, zoom, focus, and state combinations.

## Molecular atmosphere

The global `MolecularAtmosphere` is an abstract Canvas2D layer. It never depicts
a real molecule and never opens WebGL.

- desktop: at most 45 nodes;
- mobile: at most 20 nodes;
- links: nearby nodes only;
- drawing rate: throttled to 20–30 FPS;
- typical opacity: 3–8%; dark hero maximum: 8–14%;
- pointer events: none;
- visibility: animation pauses when the document is hidden or the host is out of
  the viewport;
- route tone: subtle and subordinate to content;
- scientific stages: lower opacity so the actual molecule remains primary.

The network is deterministic enough to avoid hydration or layout shifts. Canvas
dimensions follow the host without affecting document flow.

## Motion modes

| Mode | Behaviour |
| --- | --- |
| Full | slow drift, restrained parallax, and functional transitions |
| Reduced | static network plus short opacity/state transitions |
| Off | static gradient/surface; no atmosphere animation |

The initial preference follows `prefers-reduced-motion`. A user selection is
stored locally and overrides the media default until reset. No preference is
sent to a server.

## Timing

- micro state/focus/hover: 150–250 ms;
- line draw and large content transition: 400–700 ms;
- easing: smooth ease-out without overshoot;
- ambient drift: slow enough to remain peripheral;
- hidden tab: zero animation frames scheduled.

Recommended UI curve: `cubic-bezier(0.22, 1, 0.36, 1)`.

## Functional motion vocabulary

- logo entry: a non-blocking 500–700 ms line draw;
- active tab: a controlled orange reaction line;
- molecule selection: a low-energy orbital halo;
- 2D/3D switch: short crossfade, not a theatrical spin;
- family/dossier transition: subtle camera or surface depth cue;
- synthesis step: a bond-like line formation;
- hover: a minimal highlight sweep on the one primary action.

Do not use intro screens, scroll hijacking, cursor replacement, particle
explosions, perpetual high bloom, or animation on every card.

## Performance boundary

The atmosphere must not compete with the existing Three.js scene or Ketcher.
Only the molecular scene may own an active WebGL context. Route-level lazy
loading remains intact. Canvas buffers are capped to device-pixel-ratio needs,
listeners are removed on unmount, and animation resumes only when both motion
preference and visibility allow it.

## Reproduction

Brand raster derivatives and the board are regenerated from production SVG
sources with:

```bash
node --import tsx scripts/render-molevren-brand.mts
```

The generated board is documentation evidence, never an input to product UI.

