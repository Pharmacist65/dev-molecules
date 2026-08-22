# Dev Molecules

Dev Molecules is a bilingual, student-first environment for exploring real molecular structures, learning source-linked synthesis logic, and practising pharmaceutical nomenclature without confusing educational content with verified science.

[Live application](https://pharmacist65.github.io/dev-molecules/) · [Public source repository](https://github.com/Pharmacist65/dev-molecules)

**Repository status:** public educational vertical slice. It is an engineering and curriculum artifact, not a complete approved-drug database, a peer-reviewed scientific publication, clinical guidance, or an operational synthesis system.

## Product experience

The default interface is **Student Mode**. It leads with the molecule, plain-language learning context, and a compact Molecule Passport. Technical projection identifiers, source integrity details, regulatory linkage, and review states move to the secondary **Reviewer Mode** in Settings. Changing presentation mode never changes molecular identity, evidence status, coordinates, or learning answers.

The five product modes remain visible:

- **Explore** — one shared Three.js/WebGL scene supports Universe → cluster → molecule focus and a 2–4 molecule comparison view. The opening curated overview renders eight deterministic, collision-resolved source structures while a separate paginated drawer browses the complete 1,552-record index. Focus provides ball-and-stick and space-filling representations, 2D/3D switching, rotate, pan, zoom, reset, hydrogen visibility, and atom hover/selection.
- **Learn** — a six-stage learning map connects structure language, organic and pharmaceutical nomenclature, reaction mechanisms, Synthesis Atlas, and a molecule-review project. The Atlas exposes route → step → mechanism learning over six source-gated routes for propranolol, atenolol, and carvedilol. Two foundational transformations currently define complete electron-flow endpoints anchored to real 2D atoms/bonds; reported steps with incompatible material contexts stay closed, and unmapped moves draw no decorative arrows. The eight-section Academy contains 22 curated exercises over 20 parseable 2D structures using 16 concrete response/widget types.
- **Build** — a guided educational fragment-building exercise. Completion is a learning result, not evidence of laboratory feasibility.
- **Teach** — device-local learning progress and scientific review queues remain separate.
- **Discover** — a private-by-default, fail-closed evidence workspace. Missing evidence never becomes novelty, efficacy, patentability, or synthesizability.

Read [Student experience](docs/STUDENT_EXPERIENCE.md) for the mode boundary, Explore interaction model, Molecule Passport, and accessibility behavior.

## Current catalog snapshot

The checked snapshot evaluates every row in the selected DrugCentral FDA list. That source selection is exhaustive for this snapshot; it is still not the complete FDA approval/product universe or a global approved-drug inventory.

| Measure | Current checked-in result |
| --- | ---: |
| Rows in the referenced DrugCentral FDA list | 2,331 |
| Rows with a complete same-ID DrugCentral structure | 1,858 |
| Exact unique InChIKey → PubChem CID resolutions | 1,747 |
| Imported records with verified 2D + 3D pair | 1,552 |
| Unresolved source rows retained in the report | 779 |
| PubChem SDF assets | 3,104 (1,552 × 2D/3D) |
| Alphabetic metadata shards | 25 |
| Therapeutic metadata shards | 1 (`unclassified`) |
| Display-name form/stereo conflict groups preserved | 1 |
| Multicomponent parent relations unresolved | 2 |
| Product/application links unresolved | 2,331 |

The 779 unresolved rows are accounted for without fallback inference: 473 lack a complete same-ID DrugCentral identity structure, 111 do not resolve to one exact unique PubChem CID, and 195 lack a verified full 2D/3D structure pair. The importer never falls back to a drug-name guess or invented geometry.

The original 15 curated molecule records remain regression fixtures and teaching-content anchors, not a schema or product ceiling. Explore keeps a bounded representative resident metadata window, shows a deterministic eight-structure overview (up to ten in a selected cluster), searches or pages through the complete 1,552-record static index, hydrates one matching shard/entity on demand, and loads individual structures through bounded caches.

See [Catalog pipeline](docs/CATALOG_PIPELINE.md), the machine-readable [coverage report](public/catalog/reports/coverage.json), and the [unresolved report](public/catalog/reports/unresolved.json).

## Structural-similarity boundary

Explore includes a versioned structural-similarity lens based on a 512-bit canonical-SMILES path fingerprint and the Tanimoto coefficient. It hashes one-, two-, and three-token SMILES paths and places records with a deterministic educational projection.

This implementation is explicitly **not ECFP**, a validated cheminformatics replacement, a binding model, a pharmacology model, or evidence of clinical similarity. Tanimoto scores in this lens describe overlap in this specific fingerprint version only. Curated scaffold, therapeutic-area, and target-family lenses remain categorical and must not be interpreted as quantitative similarity.

## Catalog workflow

Checked-in snapshots make the default path reproducible and offline after installation:

```bash
npm run catalog:download
npm run catalog:normalize
npm run catalog:build
npm run catalog:validate
npm run catalog:report
```

`catalog:download` reads the checked `drugcentral-fda-pubchem-eligible-v1` snapshot by default. `npm run catalog:download -- --refresh` evaluates all rows in the configured DrugCentral FDA list and rewrites the snapshot only after exact identity and structure resolution. DrugCentral and PubChem are used in the current snapshot. An openFDA product/application adapter is implemented but not selected for this build; EMA and PMDA adapters remain future work and no records are inferred from them.

## Run locally

Requirement: Node.js `>=22.23.2`.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`. Stable Explore hashes include:

```text
http://localhost:3000/#universe
http://localhost:3000/#cluster/therapeutic/Cardiovascular
http://localhost:3000/#molecule/propranolol
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
npm run build:pages
npm run catalog:validate
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
npm audit --omit=dev --audit-level=high
git diff --check
```

The tests cover catalog normalization and fail-closed identity handling, static shards and bounded caches, SDF identity/provenance, form and stereochemistry boundaries, deterministic lens projections and Tanimoto scoring, one-scene level of detail, TR/EN parity, learning evaluators, GitHub Pages base-path behavior, and real-browser interaction. Passing these gates is engineering evidence; it is not scientific peer review.

## Architecture

```text
app/                              server-capable application entry
components/universe/              Explore state, navigation, compare, and LOD
components/molecular-scene/       one shared Three.js scene port and adapter
components/platform/              Explore/Learn/Build/Teach/Discover surfaces
lib/domain/                       identity, evidence, curriculum, and scoring rules
lib/application/                  deterministic view-model composition
lib/catalog/                      source adapters, normalization, shards, static client
lib/data/                         curated regression fixtures and curricula
lib/explore/                      categorical and structural-similarity projections
scripts/catalog/                  reproducible catalog lifecycle
public/catalog/                   manifest, indexes, shards, reports, and SDF assets
public/structures/pubchem/        curated regression-fixture SDF assets
deployment/github-pages/          thin static entry over the same product shell
tests/, e2e/, e2e-pages/          domain and browser acceptance evidence
```

The public application is a static GitHub Pages project site under `/dev-molecules/`. The Pages entry mounts the same product shell; it does not fork chemistry, curriculum, or scoring logic. Catalog metadata and structures are static assets loaded lazily under the project base path. GitHub Pages has no server runtime, so Discover uses the same curated local, fail-closed evidence-card builder and receives no API secret.

Further documentation:

- [Architecture](docs/ARCHITECTURE.md)
- [Student experience](docs/STUDENT_EXPERIENCE.md)
- [Catalog pipeline](docs/CATALOG_PIPELINE.md)
- [Roadmap and acceptance gates](docs/ROADMAP.md)
- [Scientific governance](docs/SCIENTIFIC_GOVERNANCE.md)
- [Synthesis provenance](docs/SYNTHESIS_PROVENANCE.md)
- [Localization](docs/LOCALIZATION.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Scientific boundary

- Source-linked does not mean expert-reviewed or verified.
- PubChem 3D records are computed conformers, not experimental crystal structures or protein-bound poses.
- Generated catalog approval entries currently mean membership in the selected DrugCentral FDA list; they are not exact FDA application/product/form records. All 2,331 product/application links remain explicitly unresolved.
- The openFDA adapter does not promote a listing until exact enrichment is selected and succeeds.
- Unclassified, unresolved, missing, conflicting, pending-review, and predicted states remain visible and distinct.
- Educational synthesis content omits quantities, conditions, apparatus, duration, work-up, yield, and other operational laboratory parameters.
- User-created structures are private by default. No persistent user database or object store is configured in this repository slice.

The application source code is publicly reviewable but is **not currently offered under an open-source project license**; repository visibility does not grant a license to that code. The DrugCentral-derived portions of `scripts/catalog/source-snapshots/` and `public/catalog/` are a separate data-licensing boundary and are redistributed under CC BY-SA 4.0 with attribution, ShareAlike, and modification notices as detailed in [Third-party notices](THIRD_PARTY_NOTICES.md). PubChem/NCBI data policies and possible third-party submitted-content rights remain separate. Review [Deployment](docs/DEPLOYMENT.md) and [Scientific governance](docs/SCIENTIFIC_GOVERNANCE.md) before redistribution.

## Türkçe kısa özet

Dev Molecules; gerçek kaynak yapılarıyla molekül keşfi, operasyonel laboratuvar tarifi vermeyen sentez eğitimi ve farmasötik adlandırma alıştırmaları sunan TR/EN bir öğrenme ortamıdır. Varsayılan Öğrenci Modu, teknik inceleme ayrıntılarını ikincil Reviewer Mode’dan ayırır. Mevcut pipeline seçilen DrugCentral FDA listesindeki 2.331 satırın tamamını değerlendirir; 1.858 satırda aynı DrugCentral ID’sine bağlı tam yapı bulur, 1.747 exact InChIKey/PubChem kimliğini çözer ve 1.552 kaydı doğrulanmış 2B/3B çiftle içe alır. Kalan 779 satır 473/111/195 neden dağılımıyla fail-closed bırakılır. Bu kapsam tüm FDA ürünleri veya küresel onaylı ilaç evreni iddiası değildir.
