# Molevren Public Alpha — Release Status

Status date: 2026-08-28

This document distinguishes implemented product flow, checked scientific coverage, and architecture-only capability. Counts are release evidence for this snapshot, never schema or product ceilings.

Dev Molecules V2.1 is the frozen integrity baseline. Molevren is the reversible public working brand layered on that technical platform, together with three audited flagship Dossier chains. Local acceptance and visual evidence are present in the release candidate. Release status remains per-commit: the [V2.1 product-integrity gates](V2_1_RELEASE_BLOCKER_SPRINT.md), CI deployment, and anonymous-live checks must all resolve against the same published commit.

## Working brand and evidence

- **Public name:** Molevren — Pharmaceutical Molecular Atlas & Academy.
- **Technical identity:** repository and platform remain `dev-molecules`; no destructive rename was performed.
- **Legal boundary:** the preliminary name review is **medium-high risk**, not trademark clearance. No domain or social handle was purchased or reserved. See [name and domain research](brand/MOLEVREN_NAME_AND_DOMAIN_RESEARCH.md).
- **Brand/layout reference:** 17 checksum-recorded Phase A PNGs remain under [`docs/assets/molevren/`](assets/molevren/). The retired Phase A and V2.0 route-detail captures and walkthroughs were removed because they predated the current pending-content publication boundary; this set is not current synthesis acceptance evidence.

## Routed product surfaces

| Surface | Current implementation | Explicit boundary |
| --- | --- | --- |
| Home | Default route, search over the 1,552-record checked structure index, lazy featured molecule, and Atlas/Academy/molecular-record entry paths | Featured content is not catalog coverage. |
| Drug Atlas · Browse | Default Atlas view; indexed search and paging over all 1,552 imported records; lazy entity and requested 2D/3D hydration | Catalog membership does not imply Curated Dossier depth or reviewed pharmacology. |
| Drug Atlas · Spatial | Lazy, one-WebGL representative Universe/cluster/focus/compare experience | The bounded scene represents only a sample of the checked structure index; unclassified generated records do not become invented clusters. |
| Basic Molecular Record | Stable record route for every one of the 1,552 resolved identities; source-matched names and identifiers, real 2D structure, computed 3D conformer, provenance, molecular weight when present, and explicit nine-dimension coverage | This is an identity/structure baseline. Unavailable classification, pharmacology, ADME, metabolite, synthesis, nomenclature, and learning fields remain unavailable; bounded structure-neighbor hints are computed and unreviewed. |
| Curated Drug Dossier | Story and Reference modes for 16 curated records: the fixed 15-record Atlas seed plus a separately reviewed Omeprazole identity. Propranolol, Celecoxib, and Omeprazole implement the Phase A flagship section set. | The other 13 curated records retain explicit scientific gaps. Flagship depth is not inferred for non-flagship or non-curated records, and the section set is not a claim that every end-to-end scientific journey is complete. |
| Family | Two bounded review workspaces with four exact PubChem identity/2D representatives each, computed-unreviewed structural fingerprint comparison, explicit coverage gaps, and unknown-ID fail-closed routing | No sourced production classification, shared mechanism, targets, ADME, or family comparison observations are configured. The representative set is not family coverage. |
| Academy | Eight-module map with real progress where activities exist | Five modules are available, Pharmacology and ADME are coverage-dependent, and standalone Reaction Mechanisms is planned. |
| Nomenclature Academy | Eight sections, 22 exercises, 20 parseable 2D structures, 16 response/widget contracts | Curated deterministic exercises; not a general IUPAC parser or arbitrary structure validator. |
| Synthesis Academy | Coverage navigation across all 1,552 exact catalog identities; 639 identities open pending public-alpha draft graphs while the official reviewed-route index remains empty | Public-alpha graphs are exact-target, source-located, independently redrawn, partial, and non-operational. They remain separate from the six-route private aggregate and from reviewed/verified canonical routes. |
| Lab | Route-lazy Ketcher 3.17.2, exact static-catalog identity check, computed seed comparison, local evidence card, opt-in JSON export | On-device/public-static only; no upload, account, persistent project store, live AI, or enabled research sandbox. |
| Instructor Studio | Eligible Nomenclature task catalog, device-local lesson package, optional connected local progress export | The public catalog currently has zero eligible synthesis tasks. Synthesis entries require a reviewed and reuse-rights-gated generated projection. No LMS, learner identity, server sync, cohort analytics, or automatic assignment delivery. |
| Reviewer Console | Typed authenticated/authorized/audited adapter boundary | Public and static builds inject no adapter, so the console remains locked. |
| Student / Expert | Student science presentation plus an Expert preference that opens curated Drug Dossiers in Reference mode by default | Atlas, Academy, Synthesis, and Lab remain on the same learner-safe presentation; no additional Expert measurement, assay, comparison, or export workflow is shipped. Expert never grants Reviewer access. |

## Data snapshot

| Measure | Current result |
| --- | ---: |
| Selected DrugCentral FDA-list rows | 2,331 |
| Complete same-ID DrugCentral structures | 1,858 |
| Exact unique PubChem identity resolutions | 1,747 |
| Imported complete 2D/3D records | 1,552 |
| Stable molecular-record routes | 1,552 |
| Fixed Atlas seed records | 15 |
| Curated Dossier records | 16 |
| Phase A flagship Dossiers | 3 |
| Fail-closed unresolved rows | 779 |
| Published SDF assets | 3,104 |
| Active public-build source adapters | 2 |
| Configured enrichment snapshots | 0 |
| Enriched classification records | 0 |
| Enriched pharmacology profiles | 0 |
| Enriched ADME profiles | 0 |
| Synthesis coverage records | 1,552 |
| Terminal molecule–evidence associations | 14,897 |
| Private migration audit aggregate | 6 |
| Public-alpha pending draft alternatives | 2,645 |
| Public-alpha exact-identity route graphs | 639 |
| Public-alpha teaching-reconstruction graphs | 231 |
| Official reviewed/verified synthesis route details | 0 |

The 779 unresolved rows are partitioned into 473 source-identity-structure gaps, 111 exact PubChem-resolution gaps, and 195 complete-pair gaps. Product/application linkage is unresolved for all 2,331 source rows, and all 1,552 generated therapeutic classifications remain unclassified.

DrugCentral and PubChem are the only enabled public-build source policies. Target, ChEMBL, Guide to PHARMACOLOGY, DailyMed, openFDA SPL, ClinPGx, and BindingDB policies exist without configured snapshots. ATC/DDD redistribution remains blocked pending a compatible rights decision. See the [source and license matrix](data/SOURCE_LICENSE_MATRIX.md) and [machine-readable enrichment readiness report](../public/catalog/reports/enrichment-readiness.json).

## Scientific coverage boundary

- Basic Molecular Record identity/structure coverage reaches all 1,552 resolved records. Deep flagship coverage is limited to the three named dossiers, and no other record is completed with generated prose.
- The checked catalog still has no scalable reviewed target-interaction or ADME enrichment snapshot. The three flagship dossiers use a separate, hand-curated source registry with explicit review and provenance.
- Propranolol, Celecoxib, and Omeprazole carry route/form-specific ADME measurements only when dose, formulation, population, conditions, units, and source are resolvable. Their known missing properties remain `null`.
- Reviewed metabolite edges exist only for the three flagship records. Activity boundaries remain exact: two Propranolol metabolites are `unknown`, Celecoxib statements are limited to COX-1/COX-2 inhibition, and Omeprazole statements are limited to antisecretory context.
- Synthesis assessment, source evidence, route type, completeness, review, applicability, access, and rights are independent dimensions. The private migration attestation records six historical drafts as `pending` and `link_only`. The public-alpha channel separately exposes 2,645 source-supported partial alternatives, all pending and explicitly not reviewed/verified; the official canonical public route index remains empty.
- Candidate/source discovery covers all 1,552 identities. All 14,897 molecule–evidence associations have an explicit terminal outcome; this processing coverage is not a claim that 14,897 reactions or routes were resolved.
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

## Candidate verification snapshot

The local release candidate passed on 2026-08-28:

- TypeScript, ESLint, Vinext production build, and GitHub Pages build;
- 413/413 Node unit and integration tests;
- 51/51 executed primary Chromium E2E scenarios, with one documentation-only capture test intentionally skipped;
- 5/5 GitHub Pages E2E scenarios;
- exact validation of 1,552 catalog records and 3,104 SDF assets;
- synthesis validation with 1,552 coverage records, a six-route private aggregate attestation, 2,645 pending public-alpha alternatives in 639 detail graphs, zero official canonical reviewed/verified route details, zero warnings, and zero errors; public CI does not revalidate withheld private rows;
- the public-synthesis boundary scanner across 1,509 generated release artifacts, 29 public documentation artifacts, and 411 tracked-source artifacts using 12 generic, catalog-aware patterns and no real private canary literals;
- third-party notice consistency and `npm audit --omit=dev --audit-level=high` with zero reported vulnerabilities;
- the 17-image Phase A brand/layout reference manifest; retired synthesis route-detail images and walkthroughs are deliberately absent from the current tracked tree and current release evidence. Earlier public commits may retain retired alpha fixtures; no history rewrite or retroactive confidentiality is claimed.

These are engineering acceptance results for the candidate commit, not scientific peer review, external accessibility certification, legal clearance, or a guarantee about future source availability.

## Release gate

Before handoff or deployment, run the commands in [README](../README.md#reproducible-gates), complete the [V2.1 product-integrity gate](V2_1_RELEASE_BLOCKER_SPRINT.md), verify the [catalog reports](CATALOG_PIPELINE.md), inspect TR and EN at desktop and mobile sizes, and confirm that the anonymous public URL serves the root document, catalog manifest, a Basic Molecular Record, a Curated Dossier, and a real SDF. Passing the engineering gate does not replace qualified scientific, educational, privacy, accessibility, or licensing review.
