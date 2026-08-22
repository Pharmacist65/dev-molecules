# Dev Molecules 2.0 implementation plan

Status date: 2026-08-23  
Baseline: public `main` at `b395777073af50998b60ca820395dab1ca379414`  
Stable URL: <https://pharmacist65.github.io/dev-molecules/>

## Product contract

Dev Molecules is an interactive pharmaceutical atlas and academy for learning, comparing, and researching approved small-molecule drugs from structure through targets, the journey through the body, ADME, synthesis, and nomenclature.

The existing 1,552-record static catalog, 3,104 validated PubChem SDF assets, bounded shards, hash deep links, lazy hydration, one-WebGL renderer, bilingual UI, provenance rules, and fail-closed scientific boundaries remain the technical foundation.

## Delivery strategy

Work advances as normal commits from the current public `main`. The repository, public URL, and history are not rewritten. Each phase has an explicit acceptance boundary; an unfinished phase remains labelled in progress.

### Phase 1 — Product and visual reset

- Replace five equal abstract modes with Home, Drug Atlas, Academy, and Lab.
- Make Home the welcoming default with global search, one featured molecular object, and three clear starting paths.
- Add the lake-white / paper-white / navy / orange / knowledge-blue token system and readable typography.
- Remove reviewer and engineering vocabulary from Student surfaces.
- Preserve old hashes through deterministic compatibility routing.
- Gate: TR/EN, keyboard navigation, reduced motion, 390 px and desktop viewport checks.

### Phase 2 — Atlas and Drug Dossier

- Make Browse the default Atlas route and Spatial an optional, lazy-loaded view.
- Keep full-catalog search separate from the bounded spatial sample.
- Add Family pages without forcing a molecule into one exclusive classification.
- Add Story and Reference dossier modes, chemistry presentation, coverage summary, and closed Sources drawer.
- Gate: full-catalog search, dossier deep links, Browse/Spatial switch, one WebGL context, exact lazy SDF loading.

### Phase 3 — Pharmacology and ADME foundation

- Add typed classification, target-interaction, claim, ADME, and metabolite models.
- Keep value, unit, conditions, source, evidence type, and review status attached to every scientific field.
- Add Drug Journey, route/form-specific ADME, target graph, and metabolite graph components.
- Publish only source-resolved demonstrators; all other dossiers show explicit coverage rather than generated prose.
- Gate: source resolution, route/form separation, missing-data fail-closed behavior, Student/Expert presentation difference.

### Phase 4 — Catalog enrichment

- Preserve the current DrugCentral/PubChem catalog core and add versioned, rights-aware enrichment adapters.
- Add `catalog:enrich` only when snapshots, licenses, and deterministic parsers are present.
- Track identity, structure, classification, pharmacology, ADME, synthesis, nomenclature, learning, and review coverage independently.
- FDA/EMA/PMDA union remains a target scope, not a release claim, until dated adapters and coverage reports prove it.
- Gate: coverage, unresolved, conflict, and redistribution-rights reports.

### Phase 5 — Academy

- Reframe the existing interactive Nomenclature Academy inside the new learning map.
- Preserve real 2D atom/bond/ring interactions, deterministic grading, progress storage, and TR/EN.
- Add pharmacology and ADME lesson routes only with curated teaching data.
- OPSIN, RDKit, and Ketcher remain adapter-gated; unsupported names never fall back to an LLM.
- Gate: structure selection, supported round-trip cases, mobile interaction, and bilingual terminology tests.

### Phase 6 — Synthesis Atlas

- Preserve reported versus teaching route boundaries and atom-endpoint mechanism gating.
- Make Route / Step / Mechanism levels the primary lesson language.
- Grow beyond the three current deep routes only when direct sources and review are present.
- The 12-drug flagship set is a content target, not a fabricated completion metric.
- Gate: graph navigation, source drawer default closed, endpoint mapping, challenge grading, and explicit upstream gaps.

### Phase 7 — Lab, Instructor, and Reviewer

- Group Builder, Compare, and local evidence tools under Lab.
- Keep Research Sandbox labelled private beta until auth, server storage, quota, consent, and audit exist.
- Separate Instructor lesson/progress work from Reviewer provenance/correction work.
- Gate: local-only privacy, catalog exact-match behavior, export/import, role-specific navigation, no false AI availability.

### Phase 8 — Premium polish and release

- Apply meaningful molecule/bond transitions with reduced-motion equivalents.
- Route-split Three.js and future chemical-editor/toolkit payloads.
- Validate accessibility, mobile, browser zoom, screenshots, bundle boundaries, and public Pages paths.
- Produce the required screenshot set and a silent 60–90 second walkthrough only after the routed product is stable.
- Gate: typecheck, lint, build, catalog validation/report, all Node tests, full Playwright, production audit, diff check, CI, and anonymous live checks.

## Scientific release boundary

Catalog breadth and deep educational coverage are different metrics. Every resolved catalog entity receives a dossier shell; pharmacology, ADME, synthesis, nomenclature, and learning sections appear only when their coverage exists. Missing content is never completed with generated scientific prose.

## Commit sequence

1. `feat: reset product architecture and home`
2. `feat: add atlas browse family and dossier`
3. `feat: add sourced pharmacology and adme foundation`
4. `feat: expose coverage-aware catalog enrichment`
5. `feat: integrate academy synthesis and lab journeys`
6. `perf: split routes and refine responsive motion`
7. `test: capture v2 acceptance and release evidence`

The exact sequence can be split further when a phase needs an independently reversible scientific-data change.
