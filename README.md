# Dev Molecules V2.1 — Public Alpha

Dev Molecules is a bilingual, student-first pharmaceutical atlas and academy. It connects source-resolved molecular identity and structure to learning journeys without presenting missing, predicted, or educational content as verified science.

[Live application](https://pharmacist65.github.io/dev-molecules/) · [Public repository](https://github.com/Pharmacist65/dev-molecules)

**Release boundary:** this repository is a public engineering and curriculum alpha. It is not a complete approved-drug database, peer-reviewed scientific publication, clinical decision tool, laboratory protocol, patent assessment, or autonomous discovery system. The active product-integrity gate is documented in [Dev Molecules V2.1](docs/V2_1_RELEASE_BLOCKER_SPRINT.md).

## Product architecture

The primary navigation is deliberately small:

- **Home** — search over the 1,552-record structure index, one lazily loaded molecular object, and clear paths into Atlas, Academy, and the molecular-record flow.
- **Drug Atlas** — **Browse** pages through the 1,552 imported structure records in the checked snapshot; **Spatial** is an optional, lazily loaded representative Three.js view. Two bounded Family review workspaces compare four exact identity/2D records each while keeping unsourced family science empty. The spatial sample and Family representatives are never presented as catalog coverage.
- **Academy** — an eight-module map that distinguishes working lessons, coverage-dependent lessons, and planned curriculum.
- **Lab** — an on-device Ketcher structure editor, curated comparison, local evidence cards, and an explicitly unavailable private-research beta.

The Explore, Learn, Build, Teach, and Discover north star is preserved as product capability, not as five equal top-level tabs. Existing `#explore`, `#learn`, `#build`, `#teach`, and `#discover` links have deterministic compatibility routes. Existing molecule, cluster, and comparison hashes still open the Spatial Atlas.

Student is the public scientific presentation across Home, Atlas, Academy, Synthesis, and Lab. The current Expert preference changes only curated Drug Dossiers to open in Reference mode by default; the rest of the public surfaces retain the same learner-safe science view. No denser measurement, assay, comparison, or export workflow is shipped for Expert. Reviewer is not an Expert alias: it is a separate authorization domain and stays locked on the public host because no authenticated, audited reviewer adapter is injected.

Read [Release status](docs/RELEASE_STATUS.md), [Product context](docs/PRODUCT_CONTEXT.md), and [Student experience](docs/STUDENT_EXPERIENCE.md).

## Current catalog and dossier coverage

The checked snapshot evaluates every row in the selected DrugCentral FDA list. That source selection is exhaustive for this snapshot, but it is not the exact FDA product/application universe or a global approved-drug inventory.

| Measure | Checked-in result |
| --- | ---: |
| DrugCentral FDA-list rows evaluated | 2,331 |
| Rows with a complete same-ID DrugCentral structure | 1,858 |
| Exact unique InChIKey → PubChem CID resolutions | 1,747 |
| Imported records with a complete checked 2D + 3D pair | 1,552 |
| Unresolved source rows retained fail-closed | 779 |
| PubChem SDF assets | 3,104 (1,552 × 2D/3D) |
| Alphabetic / therapeutic shards | 25 / 1 (`unclassified`) |
| Product/application links unresolved | 2,331 |
| Generated therapeutic classifications unresolved | 1,552 |

The 779 unresolved rows are accounted for without name-based identity guessing: 473 lack a complete same-ID DrugCentral identity structure, 111 do not resolve to one exact unique PubChem CID, and 195 lack a complete checked 2D/3D pair.

Catalog breadth and scientific depth are separate:

- Atlas Browse searches and pages through all 1,552 imported records, then loads one shard/entity and requested structure through bounded caches.
- Every one of the 1,552 resolved identities has a stable record route and a Basic Molecular Record boundary: source-matched identity, real 2D and computed 3D structures, provenance, conservative properties when present, and explicit nine-dimension coverage.
- The 15 original curated molecules remain regression fixtures, teaching anchors, and the current Curated Dossier seed. Their routes retain Story/Reference depth; non-seed records open the Basic Molecular Record instead of an unavailable Dossier.
- The current enrichment readiness report has two active source adapters, zero configured enrichment snapshots, zero enriched classifications, zero enriched pharmacology profiles, and zero enriched ADME profiles.
- Basic Record and Curated Dossier identity/structure fields are source-linked. Classification, target, ADME, metabolite, synthesis, nomenclature, and learning coverage are independently gated.
- Pharmacology currently has no reviewed target-interaction dataset. ADME may show an exact curated product/form administration context, but it has no sourced quantitative phase measurements. Metabolite graphs have no reviewed edges.

See [Catalog pipeline](docs/CATALOG_PIPELINE.md), [enrichment readiness](public/catalog/reports/enrichment-readiness.json), [coverage](public/catalog/reports/coverage.json), and [unresolved rows](public/catalog/reports/unresolved.json).

## Academy and synthesis truth

The Academy map has eight modules:

- five currently available routes: Structure Language, Organic Nomenclature, Pharmaceutical Nomenclature, Synthesis Atlas, and Drug Review Project;
- two coverage-dependent shells: Pharmacology and ADME;
- one planned standalone curriculum: Reaction Mechanisms. Its nearest working material is the curated mechanism layer inside Synthesis Atlas.

The interactive Nomenclature Academy contains eight ordered sections and 22 exercises over 20 parseable 2D structures, using 16 concrete response/widget contracts. Evaluation is deterministic; the four-record local name↔structure adapter is not a general IUPAC parser.

Synthesis Academy derives its current metrics from the route data: three drugs, six routes, 20 transformations, and 12 mechanism records. All six routes pass their declared source gate; three are direct-source supported and three are source-context supported. Only the Atenolol and Carvedilol reported routes qualify for the strict `source-reported` presentation. The Propranolol reported-kind route remains a source-context reconstruction. Nine positions in the 12-drug publication target are intentionally unassigned.

Synthesis content is non-operational: it omits quantities, scale, apparatus, execution conditions, work-up, purification, yield, and manufacturing instructions. See [Synthesis provenance](docs/SYNTHESIS_PROVENANCE.md).

## Private-by-default Lab and role boundaries

Ketcher `3.17.2` is route-lazy and runs its standalone chemistry engine in the browser. The Lab can export SMILES, molfile, and InChIKey through the editor adapter, compare an exact InChIKey against the static catalog, compute a clearly labelled unreviewed path-fingerprint ranking against the curated seed, and create a local JSON project only when the user chooses to export. The public build has no account, upload, private cloud store, or automatic structure transmission.

Instructor Studio builds local lesson packages from real Nomenclature Academy and Synthesis Atlas task IDs. Package and connected progress exports are device-local JSON artifacts; there are no learner accounts, server sync, cohort analytics, or automatic delivery.

Reviewer Console requires an injected adapter that authenticates, authorizes, lists provenance-complete records, and returns audited action receipts. The static public application passes no adapter, so the console fails closed.

## Run locally

Requirement: Node.js `>=24.19.0`. CI pins `24.19.0`; this is also the tested runtime for the route-lazy Ketcher integration.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000/>. Primary hashes include:

```text
#home
#atlas
#atlas/spatial
#drug/propranolol
#academy
#academy/nomenclature/foundations
#academy/synthesis/propranolol/overview
#lab
#instructor
#reviewer
```

## Reproducible gates

```bash
npm run typecheck
npm run lint
npm run catalog:validate
npm run catalog:report
npm run licenses:check
npm run build
npm run build:pages
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
npm audit --omit=dev --audit-level=high
git diff --check
```

`npm run catalog:enrich` regenerates the current readiness report; it does not create scientific coverage because no enrichment snapshot is configured. Passing engineering gates is not scientific peer review.

## Visual review evidence

[Watch the V2.1 ten-second Home stability recording](docs/assets/v21/home-featured-10s.mp4). It contains exactly 300 frames at 30 FPS and accompanies the fixed-size idle captures.

[![Dev Molecules V2.1 stable Home](docs/assets/v21/home-featured-idle-start.png)](docs/assets/v21/home-featured-10s.mp4)

The committed V2.1 acceptance set covers the [pre-fix clipped Home](docs/assets/v21/home-featured-before-tr-start.png), [stable Home at start](docs/assets/v21/home-featured-idle-start.png), [the same Home after three idle seconds](docs/assets/v21/home-featured-idle-after-3s.png), [the non-selectable Home molecule](docs/assets/v21/home-featured-selected-state.png), [Beta-sitosterol Basic Molecular Record](docs/assets/v21/beta-sitosterol-basic-record.png), [Propranolol Curated Dossier](docs/assets/v21/propranolol-curated-dossier.png), [compact empty ADME state](docs/assets/v21/empty-adme-compact.png), [Student Spatial Atlas](docs/assets/v21/atlas-spatial-student.png), and [the real Ketcher Lab editor](docs/assets/v21/lab-ketcher.png). Screenshots demonstrate routed behavior and explicit gaps; they are not evidence of scientific review.

[Watch the 86-second silent V2.0 baseline walkthrough](docs/assets/demo/dev-molecules-v2-walkthrough.mp4). It predates the V2.1 Basic Molecular Record and product-integrity changes.

[![Dev Molecules V2.0 baseline Home](docs/assets/screenshots/home-en.png)](docs/assets/demo/dev-molecules-v2-walkthrough.mp4)

The older V2.0 baseline capture set remains available for regression comparison: [Home in Turkish](docs/assets/screenshots/home-tr.png), [Atlas Browse](docs/assets/screenshots/atlas-browse.png), [Atlas Spatial](docs/assets/screenshots/atlas-spatial.png), [Dossier overview](docs/assets/screenshots/dossier-overview.png), [Pharmacology](docs/assets/screenshots/dossier-pharmacology.png), [ADME](docs/assets/screenshots/dossier-adme.png), [Synthesis](docs/assets/screenshots/dossier-synthesis.png), [Nomenclature lesson](docs/assets/screenshots/nomenclature-lesson.png), [Synthesis route learning](docs/assets/screenshots/synthesis-route.png), [Lab](docs/assets/screenshots/lab.png), [the fail-closed Family review workspace](docs/assets/screenshots/family-page.png), and [mobile Home](docs/assets/screenshots/mobile-home.png).

## Delivery architecture

```text
app/                              Vinext application entry
deployment/github-pages/          thin static entry over the same product shell
components/                       routed Home, Atlas, Dossier, Academy, Lab, and role surfaces
lib/domain/                       identity, evidence, curriculum, role, and capability contracts
lib/application/                  deterministic view-model and fail-closed composition
lib/catalog/, scripts/catalog/    snapshot normalization, shards, validation, and enrichment readiness
lib/data/                         curated fixtures, curricula, routes, and source registries
public/catalog/                   manifest, index, shards, reports, and 3,104 SDF assets
tests/, e2e/, e2e-pages/          domain, integration, and browser acceptance evidence
```

`npm run build` validates the Vinext/Cloudflare worker-capable adapter. `npm run build:pages` emits the static GitHub project-site artifact under `/dev-molecules/`. Both mount the same React product shell and use the same domain rules. The Pages artifact has no server runtime or secrets; catalog assets, Ketcher worker/WASM, and public structures are loaded from the project base path.

Further documentation:

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Scientific governance](docs/SCIENTIFIC_GOVERNANCE.md)
- [Source and license matrix](docs/data/SOURCE_LICENSE_MATRIX.md)
- [Competitive benchmark](docs/product/COMPETITIVE_BENCHMARK.md)
- [Feature parity matrix](docs/product/FEATURE_PARITY_MATRIX.md)
- [Differentiation strategy](docs/product/DIFFERENTIATION_STRATEGY.md)
- [Localization](docs/LOCALIZATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Security policy](SECURITY.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Scientific and licensing boundary

- Source-linked does not mean expert-reviewed or verified.
- PubChem 3D records are computed conformers, not experimental crystal structures or protein-bound poses.
- “Not found” never becomes novelty, patentability, efficacy, safety, or synthesizability.
- Missing, unclassified, unresolved, pending-review, predicted, and conflicting states remain explicit.
- User-created structures are private by default; no persistent user database or object store is configured.
- The application code is publicly reviewable but is not currently offered under an open-source project license. DrugCentral-derived artifacts have a separate CC BY-SA 4.0 data-licensing boundary; PubChem/NCBI policy and third-party submitted-content rights remain separate. Review [Third-party notices](THIRD_PARTY_NOTICES.md) before redistribution.

## Türkçe kısa özet

Dev Molecules V2.1 Public Alpha; Home, İlaç Atlası, Academy ve Lab ana mimarisine sahip iki dilli bir farmasötik öğrenme prototipidir. Atlas Browse 1.552 çözümlenmiş kaydın tamamını indeksler ve her kimlik için kararlı bir kayıt yolu sunar. Seed dışındaki kayıtlar gerçek kimlik, 2B/3B yapı, köken ve açık kapsam durumları taşıyan Temel Moleküler Kayıt açar; 15 kürate seed kayıt ise Story/Reference derinliğindeki Kürate İlaç Dosyası'na ilerler. Spatial görünüm yalnız temsili ve sınırlandırılmış bir örneklem gösterir. Güncel enrichment raporunda sınıflandırma, farmakoloji ve ADME için eklenmiş kayıt sayısı sıfırdır; eksikler yapay içerikle doldurulmaz. Academy sekiz modülden oluşur. Sentez kapsamı üç ilaç, altı rota, 20 dönüşüm ve 12 mekanizma kaydıdır; yalnız iki reported rota doğrudan kaynakta bildirilmiş olarak sunulur. Ketcher Lab cihazda çalışır ve kullanıcı açıkça dışa aktarmadıkça yapı için dosya veya sunucu kaydı oluşturmaz. V2.1 yerel kabul kapıları ve kanıt seti tamamlanmıştır; yayımlanan her commit yine CI, dağıtım ve anonim canlı kontrollerinden geçmelidir.
