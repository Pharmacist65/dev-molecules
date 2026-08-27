# Dev Molecules — Roadmap and Acceptance Gates

## Roadmap rule

Explore, Learn, Build, Teach, and Discover remain the product north star. Milestones sequence scientific, technical, and operational risk; they do not redefine the platform as a permanently small demo.

The 15 curated molecule fixtures, 1,552-record generated catalog, privacy-safe six-route private migration aggregate, and 22 Nomenclature Academy exercises are current seed coverage. The withheld route rows live only in a local ignored review archive and are not revalidated by public CI. No schema, renderer, curriculum, or test may treat these counts as a product ceiling. The public synthesis-route index is currently empty by design.

## Current repository baseline

The current vertical slice implements:

- a bilingual TR/EN Home / Drug Atlas / Academy / Lab product shell that preserves Explore, Learn, Build, Teach, and Discover as capabilities rather than equal navigation tabs;
- Student by default and an Expert preference whose current effect is limited to the curated Dossier default; Reviewer is a separate, locked authorization domain;
- a Browse surface over the 1,552 imported structure records in the checked snapshot and an optional lazy Spatial Atlas with Universe → cluster → molecule focus/compare navigation;
- a single shared Three.js scene with bounded progressive level of detail and 2–4 molecule comparison;
- four versioned Spatial lenses, including a scoped canonical-SMILES path fingerprint/Tanimoto lens that is explicitly not ECFP or clinical similarity;
- an all-row static pipeline over the selected 2,331-row DrugCentral FDA list: 1,858 complete same-ID structures, 1,747 exact PubChem resolutions, 1,552 imported 2D/3D pairs, 779 explicit unresolved rows, 25 alphabetic shards, one `unclassified` therapeutic shard, and 3,104 PubChem SDF assets;
- stable molecular-record routes across all 1,552 resolved identities, with a Basic Molecular Record boundary for source-matched identity, 2D/3D structure, provenance, conservative properties, and explicit coverage;
- 15 curated regression fixtures with exact Drugs@FDA product/form/action anchors and the current Curated Dossier seed;
- Story/Reference Curated Dossier surfaces whose classification, pharmacology, ADME, metabolite, synthesis, nomenclature, learning, and review coverage fail independently;
- an eight-module Academy map: five available modules, two coverage-dependent modules, and one planned standalone module;
- a synthesis discovery and coverage pipeline spanning all 1,552 exact identities and 14,897 terminalized molecule–evidence associations, with a six-route private migration aggregate, locally archived withheld rows, and zero public route details;
- eight Nomenclature Academy sections with 22 exercises over 20 parseable structures and 16 concrete response/widget types;
- a route-lazy, on-device Ketcher 3.17.2 editor with exact static-catalog identity matching and explicit local JSON export;
- a device-local Instructor package/progress-export boundary and an adapter-gated Reviewer Console;
- a public GitHub Pages delivery adapter over the same application shell;
- typed competitive capability contracts and a parity gate that does not call contract-only work shipped;
- typecheck, lint, server/static production builds, Node tests, and Playwright gates in CI.

This baseline is not a production scientific publication or the exact FDA application/product universe. All 1,552 generated therapeutic classifications remain unresolved; all 2,331 product/application links remain unresolved; one display-name form/stereo conflict stays separate; and two multicomponent parent relations remain unresolved. The enrichment report has zero configured snapshots and zero classification, pharmacology, or ADME enrichment. The 15-record Dossier seed has no reviewed target interactions, no quantitative ADME fields, and no reviewed metabolite edges. openFDA enrichment is not configured; EMA and PMDA remain future sources. Synthesis mechanisms, educational classification wording, and the curriculum remain review-gated. There is no durable multi-user database, institution tenancy, scientific review backend, or research project store.

The implemented V2.1 release candidate remains behind the [V2.1 Release Blocker and Product Integrity Sprint](V2_1_RELEASE_BLOCKER_SPRINT.md): stable Basic Molecular Records for all resolved identities, non-repetitive Dossier gaps, and a telemetry-proven stable Home molecule must pass the full local, CI, deployment, and anonymous-live gates. Scientific enrichment is intentionally deferred until that gate passes.

## R1 — Public engineering release

Stabilize the repository and hosted build as a reproducible engineering artifact.

**Deliverables**

- clean public history with no secrets or personal filesystem references;
- reproducible `npm ci` build and branch-protected quality workflow;
- tested TR/EN navigation and fixed-size visual acceptance captures;
- dependency/license inventory and an explicit project-license decision;
- accessibility and production performance baselines for the implemented journeys;
- documented deployment, rollback, and incident-reporting path.

**Acceptance gate**

- A clean clone on Node `24.19.0` passes every documented command.
- Public GitHub Pages and local production builds expose the same core journeys; server-only capabilities fail closed to their documented local equivalent.
- No secret, private structure, generated credential, or personal path is present in the public tree or history.
- Critical keyboard paths and readable focus states pass manual and automated review.
- Deployment ownership, access policy, and rollback evidence are recorded.

## R2 — Qualified scientific and educational review

Turn source-audited educational drafts into reviewer-owned content without weakening the current fail-closed boundaries.

**Deliverables**

- named synthetic-chemistry review of route boundaries, transformation wording, stereochemistry scope, and draft atom correspondence;
- named organic-nomenclature/education review of the eight-section, 22-exercise curriculum and accepted answers;
- named pharmacology/editorial review of therapeutic-area, target-profile, and scaffold labels;
- resolved reuse status for each published source-backed field and asset;
- versioned correction, demotion, withdrawal, and dependent-cache invalidation procedures.

**Acceptance gate**

- Every published scientific interpretation resolves to a direct source, reviewer identity/role, decision date, and scope.
- `source-supported` is never displayed as equivalent to `expert-reviewed` or `verified`.
- Review of one claim type does not promote an entire molecule, route, screen, or curriculum.
- Corrected content retains prior version and rationale in an auditable record.

## R3 — Durable identity, catalog, and content services

Extend the current checked-snapshot/static-shard pipeline into durable, versioned ingestion and review services.

**Deliverables**

- explicit schemas for molecular entities, stereoisomers, salts/solvates/esters, products, approvals, sources, claims, routes, lessons, and reviews;
- raw-import staging before normalization;
- immutable artifact storage for structure files and source snapshots;
- versioned chemical-tool ports for normalization, valence checks, fingerprints, similarity, conformers, and atom mapping;
- rebuildable search and Explore projection indexes.

**Acceptance gate**

- Duplicate, stereochemistry, salt/form, source-conflict, and withdrawal fixtures pass.
- Imports cannot overwrite reviewed content or silently merge incompatible identities.
- Every derived index can be rebuilt from authoritative records.
- Tenant authorization is enforced server-side before private data exists.
- Representative-scale catalog tests meet documented latency, memory, WebGL-context, and asset-fetch budgets.

## R4 — Learning and curriculum depth

Expand Learn and Build from the current vertical slice into reviewer-approved course material.

**Deliverables**

- qualified review, correction or withdrawal of the current six private route drafts before any route-detail publication, followed by evidence-gated expansion and versioned challenges;
- deeper Academy sequences beyond the current eight-section/22-exercise curriculum, with prerequisites, misconception tracking, and accessible non-spatial alternatives;
- hardening of the current Ketcher 2D editor behind its adapter, including validated import/export boundaries, identity-preserving history, and a source-labelled 3D preview;
- reusable course packs, learning objectives, rubrics, and content-version pinning;
- learning analytics that remain separate from evidence and scientific review state.

**Acceptance gate**

- 2D/3D edits preserve identity, charge, stereochemistry, and original input history.
- Invalid structures receive educational feedback without silent repair.
- Each scored activity has deterministic answers, explanation, misconception model, and content version.
- A target learner cohort demonstrates measurable improvement against a defined pre/post instrument.

## R5 — Instructor Studio and university pilot

Extend the current device-local lesson-package composer into courses, cohorts, assignments, rubrics, institution-private material, governed exports, and privacy controls only after the content and identity foundations are reviewable.

**Acceptance gate**

- Role, tenant, export, deletion, and institution-content ownership tests pass.
- An instructor can assign, review, revise, and repeat a real activity without developer assistance.
- Learner consent, retention, and analytics boundaries are documented and enforced.
- The pilot measures learning gain, completion, repeat use, and instructor preparation time.
- A pilot partner commits to another teaching cycle before institution-specific scope expands.

## R6 — Evidence-grounded narration

Extend the current curated-card-first endpoint into typed structure, identity, synthesis, and biological evidence tools. Explanatory prose remains optional and comes after evidence assembly.

**Acceptance gate**

- Golden-set tests contain no fabricated citation or unsupported high-impact conclusion.
- Every material statement resolves to an eligible claim and direct source.
- Missing, conflicting, analog, computed, and predicted evidence remain visibly distinct.
- External narration cannot change review status or access another user’s private data.
- Latency, failure rate, cost, and fallback rate are measured per tool path.

## R7 — Approved small-molecule catalog expansion

Expand ingestion, review operations, search, lens projections, and curriculum coverage toward a clearly defined approved small-molecule universe.

**Acceptance gate**

- Coverage is reported by jurisdiction, source, version, identity rule, and review status—never as vague “all drugs.”
- New lens definitions record their algorithm, inputs, meaning, non-meaning, and comprehension evidence.
- Atlas loading remains bounded through progressive level of detail at representative scale.
- Correction throughput and source/license monitoring are operationally sustainable.

## R8 — Private Discovery Beta

Open private projects, versioned designs, exact/analog search, proposed routes, evidence cards, and collaboration to invited research users.

**Acceptance gate**

- Designs are private by default; sharing and training use require explicit consent.
- Proposed routes and model outputs are unmistakably predicted and untested.
- “Not found” never becomes novelty, patentability, safety, efficacy, or synthesizability language.
- Security, audit, export, deletion, and incident-response behavior pass institution review.

## R9 — Additional modality universes

Add peptides, oligonucleotides, proteins/antibodies, natural products, or radiopharmaceuticals only through modality-specific identity, visualization, evidence, and governance models.

**Acceptance gate**

- The small-molecule platform is operationally stable first.
- Each modality has named expert ownership and source/license coverage.
- No modality is forced into incompatible small-molecule assumptions.
- Cross-universe relationships are explicit, sourced, versioned, and reversible.

## Gates that apply to every release

- **Scientific:** provenance, scope, uncertainty, and review eligibility are visible and correct.
- **Product:** the release solves a measured learner or educator job, not only a visual showcase.
- **Technical:** domain invariants, accessibility, production build, representative-scale performance, and rollback pass.
- **Localization:** TR and EN have exact key/content parity, correct language metadata, and no silent cross-language fallback.
- **Privacy:** private designs, questions, learner data, and institution content remain isolated and auditable.
- **Security:** secrets and private material remain outside source, logs, screenshots, and issue reports.
- **Operations:** content, model, importer, asset, and projection revisions can be demoted or withdrawn without corrupting prior audit history.
