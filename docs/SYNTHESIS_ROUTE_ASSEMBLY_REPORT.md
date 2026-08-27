# Public-Alpha Synthesis Route Assembly and Spatial Sprint

Report date: 2026-08-28

Catalog snapshot: `drugcentral-fda-pubchem-eligible-2026-08-22`

Assembly pipeline: `synthesis-route-assembly-1.0.0`

This sprint reprocessed the accepted extraction checkpoints; it did not run new discovery or fetch new source content. Its result is a separate public-alpha educational-draft channel, not synthesis content completion, a laboratory procedure, or a reviewed/verified route release.

## Result

| Measure | Actual count |
| --- | ---: |
| Catalog identities retaining a synthesis surface | 1,552 |
| Direct-source segments examined | 2,645 |
| Direct-source segments admitted by the public-draft gate | 2,645 |
| Direct-source segments rejected | 0 |
| Public-alpha draft alternatives | 2,645 |
| Partial alternatives | 2,645 |
| Target route graphs | 639 |
| Globally unique extracted source steps | 2,645 |
| Unique resolved intermediate identities | 73 |
| Exact-InChIKey teaching bridges | 3,033 |
| Graphs containing at least one teaching reconstruction | 231 |
| Explicit unresolved gaps | 2,645 |
| Expert-reviewed routes | 0 |
| Official canonical public route details | 0 |

“Public-alpha draft alternative” means an exact-target, source-located reaction segment, optionally joined to exact-identity upstream segments for teaching. It does not mean that one patent or paper reports a complete synthesis route. Every alternative remains partial and pending expert review.

The partial distribution is 2,587 `upstream_gap`, 58 `convergent_partial`, 0 plain `partial`, and 0 `complete` alternatives.

## Route extraction boundary

Each admitted step retains exact catalog coverage identity, exact target-product InChIKey, exact participant identities computed from structured SMILES, reactant and product roles, a resolvable ORD dataset-record locator, and a reusable independent 2D redraw input. Source figures, schemes, prose, procedures, and raw provider payloads are not republished.

The accepted checkpoint does not support a scientifically defensible reaction class, atom map, formed-bond set, or broken-bond set. These fields therefore remain `Unclassified`, `not_mapped`, and `not_resolved`; the UI says so instead of inferring them. Operational laboratory details are excluded.

The 1,720 source-locator candidate documents were examined as the second-priority input. None was promoted to a step: those records contain name-level, form/stereo-unresolved contexts without an exact participant graph. The prior source-content sweep had inspected 4,644 accessible full-text documents but intentionally retained no source body. Under the no-new-discovery constraint, there was no evidence-safe basis for reconstructing participant graphs from those locator cues.

## Route assembly boundary

An upstream segment is connected only when its exact product InChIKey equals an exact reactant InChIKey in the target-forming segment. Cross-source connections are marked `teaching_reconstruction`, and `reportedAsOneCompleteRoute` is always false. The 3,033 bridge edges resolve to 73 unique intermediate identities across 231 target graphs.

Every alternative retains one explicit upstream gap. A source-supported fragment with no exact upstream bridge is `upstream_gap`; a target-forming segment with at least two exact bridged inputs is `convergent_partial`. No alternative is marked complete.

## Public presentation and catalog coverage

The public-alpha channel is `public_alpha_source_supported_draft`. Every rendered graph carries:

- `reviewState: pending`;
- `verifiedScientificClaim: false`;
- the label “KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR”;
- exact target identity, catalog form/stereo scope, exact locators, independent 2D redraws, and explicit limitations;
- no quantities, conditions, time, temperature, work-up, purification, yield, or scale.

The reviewed/verified canonical publication channel remains separate and empty. A malformed identity, rights state, locator, review state, graph topology, or operational field makes the browser loader fail closed to coverage-only presentation.

The 1,552-record public surface distribution is mutually exclusive and exhaustive:

| Synthesis surface | Identities |
| --- | ---: |
| Public-alpha partial draft available | 639 |
| Sources identified; route extraction not yet resolved | 529 |
| No supporting source resolved in the recorded search scope | 384 |
| **Total** | **1,552** |

The exact machine report is [`public/catalog/synthesis/reports/route-assembly.json`](../public/catalog/synthesis/reports/route-assembly.json). Draft index and graph artifacts are digest-pinned in the synthesis manifest.

## Rights and review

Draft structures are generated independently from normalized SMILES; no source scheme or figure is copied. ORD-derived facts are attributed under CC BY-SA 4.0. This decision does not transfer to journal or patent candidate documents: all 1,720 locator candidates remain unpromoted, and their reuse status is not inferred from access.

Qualified expert review is still required for accuracy, nomenclature, reaction classification, teaching depth, route completeness, applicability, and reproducibility. Current reviewed and verified route counts are both zero.

## Spatial acceptance

The main Drug Atlas Spatial view is now a navbar-adjacent primary viewport with a desktop minimum height of `80svh`. The nested editorial hero and white filter band are absent. Search, lens, zoom, and centring controls float over the stage; molecule focus opens a right-side inspector. The default distant scene shows 4–6 large representative molecules, with a bounded 8–12 near level of detail and one WebGL context. The embedded Family variant remains intentionally compact.

## Reproducible gates

```bash
npm run synthesis:publish
npm run synthesis:validate
npm run synthesis:boundary
npm run typecheck
npm run lint
npm run build
npm run build:pages
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
```

These gates prove deterministic data shape, attribution, publication-state separation, UI integration, and engineering integrity. They do not constitute expert scientific review.
