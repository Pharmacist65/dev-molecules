# Dev Molecules 2.0 — Release Status

Status date: 2026-08-23

This document distinguishes implemented product flow, checked scientific coverage, and architecture-only capability. Counts are release evidence for this snapshot, never schema or product ceilings.

## Routed product surfaces

| Surface | Current implementation | Explicit boundary |
| --- | --- | --- |
| Home | Default route, search over the 1,552-record checked structure index, lazy featured molecule, Atlas/Academy/dossier entry paths | Featured content is not catalog coverage. |
| Drug Atlas · Browse | Default Atlas view; indexed search and paging over all 1,552 imported records; lazy 2D/entity hydration | Catalog membership does not imply a deep dossier or reviewed pharmacology. |
| Drug Atlas · Spatial | Lazy, one-WebGL representative Universe/cluster/focus/compare experience | The bounded scene represents only a sample of the checked structure index; unclassified generated records do not become invented clusters. |
| Drug Dossier | Story and Reference modes for the 15 curated seed records; independent identity, structure, classification, pharmacology, ADME, metabolite, synthesis, nomenclature, learning, and review indicators | Generated catalog records outside the seed fail to an explicit unavailable dossier. Pharmacology and quantitative ADME are not populated. |
| Family | Two bounded review workspaces with four exact PubChem identity/2D representatives each, computed-unreviewed structural fingerprint comparison, explicit coverage gaps, and unknown-ID fail-closed routing | No sourced production classification, shared mechanism, targets, ADME, or family comparison observations are configured. The representative set is not family coverage. |
| Academy | Eight-module map with real progress where activities exist | Five modules are available, Pharmacology and ADME are coverage-dependent, and standalone Reaction Mechanisms is planned. |
| Nomenclature Academy | Eight sections, 22 exercises, 20 parseable 2D structures, 16 response/widget contracts | Curated deterministic exercises; not a general IUPAC parser or arbitrary structure validator. |
| Synthesis Academy | Three drugs, six open routes, 20 transformations, 12 eligible mechanism records | Two reported routes are directly source-reported; Propranolol's reported-kind route is source-context reconstruction; nine flagship target slots are empty. |
| Lab | Route-lazy Ketcher 3.17.2, exact static-catalog identity check, computed seed comparison, local evidence card, opt-in JSON export | On-device/public-static only; no upload, account, persistent project store, live AI, or enabled research sandbox. |
| Instructor Studio | Real Academy/Synthesis task catalog, device-local lesson package, optional connected local progress export | No LMS, learner identity, server sync, cohort analytics, or automatic assignment delivery. |
| Reviewer Console | Typed authenticated/authorized/audited adapter boundary | Public and static builds inject no adapter, so the console remains locked. |
| Student / Expert | Student science presentation plus an Expert preference that opens curated Drug Dossiers in Reference mode by default | Atlas, Academy, Synthesis, and Lab remain on the same learner-safe presentation; no additional Expert measurement, assay, comparison, or export workflow is shipped. Expert never grants Reviewer access. |

## Data snapshot

| Measure | Current result |
| --- | ---: |
| Selected DrugCentral FDA-list rows | 2,331 |
| Complete same-ID DrugCentral structures | 1,858 |
| Exact unique PubChem identity resolutions | 1,747 |
| Imported complete 2D/3D records | 1,552 |
| Fail-closed unresolved rows | 779 |
| Published SDF assets | 3,104 |
| Active public-build source adapters | 2 |
| Configured enrichment snapshots | 0 |
| Enriched classification records | 0 |
| Enriched pharmacology profiles | 0 |
| Enriched ADME profiles | 0 |

The 779 unresolved rows are partitioned into 473 source-identity-structure gaps, 111 exact PubChem-resolution gaps, and 195 complete-pair gaps. Product/application linkage is unresolved for all 2,331 source rows, and all 1,552 generated therapeutic classifications remain unclassified.

DrugCentral and PubChem are the only enabled public-build source policies. Target, ChEMBL, Guide to PHARMACOLOGY, DailyMed, openFDA SPL, ClinPGx, and BindingDB policies exist without configured snapshots. ATC/DDD redistribution remains blocked pending a compatible rights decision. See the [source and license matrix](data/SOURCE_LICENSE_MATRIX.md) and [machine-readable enrichment readiness report](../public/catalog/reports/enrichment-readiness.json).

## Scientific coverage boundary

- Deep Dossier coverage is seed-only. No source-ineligible imported record is completed with generated prose.
- The checked catalog has no reviewed target-interaction snapshot. Pharmacology panels therefore expose an explicit unavailable state.
- Curated product/form route context can be present in ADME, but absorption, distribution, metabolism, and excretion measurements remain empty without direct evidence and conditions.
- No reviewed metabolite edges are configured. An empty graph does not mean that no metabolites exist.
- Synthesis route kind, source gate, and presentation are separate. The current six-route split is three `source-supported` and three `context-supported`; strict reported presentation counts only Atenolol and Carvedilol.
- Synthesis and nomenclature are educational content with their own review boundaries. Passing deterministic tests does not make them peer-reviewed science.
- PubChem 3D assets are computed conformers, not experimental structures, target-bound poses, or clinical evidence.

## Competitive capability status

The competitive program compares Dev Molecules with MolecuLens, MolAtlas, MolScope, and MolVerse, but it does not promote contracts into features:

- [Competitive benchmark](product/COMPETITIVE_BENCHMARK.md) records the official-source comparison and deliberate exclusions.
- [Feature parity matrix](product/FEATURE_PARITY_MATRIX.md) requires architecture, a real flow, real data, a passing test, and a current committed screenshot before `shipped` is allowed.
- [Differentiation strategy](product/DIFFERENTIATION_STRATEGY.md) defines the identity-preserving pharmaceutical journey and the separate Universal Molecule Lookup boundary.

Universal lookup, unified cross-representation Lens, Property Atlas distributions, expert measurement/QC adapters, Export Studio, quantum views, and target-complex views are typed P0 contracts or planned work. They are not complete public user flows. The product does not claim experimental structure determination, cryo-EM, docking efficacy, binding kinetics, thermodynamics, multi-omics analysis, or molecular simulation.

## Runtime and delivery

- Node.js `24.19.0` is pinned in CI and `>=24.19.0` is required by the package.
- `npm run build` exercises the Vinext/Cloudflare worker-capable build.
- `npm run build:pages` emits the static project-site artifact at `/dev-molecules/`.
- Both adapters mount the same product shell and use the same chemistry, evidence, curriculum, and scoring rules.
- The Pages build has no server runtime or secret. It loads the catalog, SDF files, route chunks, Ketcher worker, and Ketcher WASM from static assets.
- The public reviewer route is locked and the research sandbox is unavailable; static hosting does not simulate those server-backed capabilities.

Performance claims remain bounded to architecture and tests: route-level lazy loading, a single WebGL context for Spatial Atlas, bounded metadata/structure caches, and demand-driven asset loading are implemented. This release does not publish a universal device FPS, Lighthouse score, or network-latency guarantee.

## Release gate

Before handoff or deployment, run the commands in [README](../README.md#reproducible-gates), verify the [catalog reports](CATALOG_PIPELINE.md), inspect TR and EN at desktop and mobile sizes, and confirm that the anonymous public URL serves the root document, catalog manifest, and a real SDF. Passing the engineering gate does not replace qualified scientific, educational, privacy, accessibility, or licensing review.
