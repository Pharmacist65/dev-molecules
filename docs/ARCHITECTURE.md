# Dev Molecules — Architecture

## Architectural intent

Dev Molecules is one product shell with independently governed scientific, learning, and rendering boundaries. React may compose those boundaries, but it is not allowed to manufacture chemistry, evidence status, scoring rules, or source provenance.

The current repository is a stateless React 19 application with two delivery adapters around the same product shell: Vinext for provider-neutral server-capable regression verification and a standalone Vite entry for static GitHub Pages delivery. It combines curated regression fixtures with generated static catalog shards and structure assets; no persistent database or object store is configured. Durable multi-user persistence is a roadmap item, not an implemented capability.

## Current dependency direction

```text
React product shell
  ├─ application view-model composition
  │    └─ typed domain rules and validators
  │          └─ checked-in data registries / provider ports
  ├─ localization runtime and typed localized content
  └─ rendering adapters
       ├─ shared Three.js 3D scene
       └─ dynamically loaded SmilesDrawer 2D schemes

Source SDF / SMILES / regulatory records / patent anchors
  └─ provenance and review state
       └─ eligible presentation or explicit unavailable state

Versioned catalog source snapshot
  └─ adapters and form/stereo-aware normalization
       └─ manifest / search index / shards / reports / lazy SDF assets
```

- `lib/domain/` owns identity, evidence, structure, synthesis, nomenclature, challenge, and learning contracts.
- `lib/application/` turns domain/data records into deterministic UI-facing models; it does not promote review status.
- `lib/catalog/` owns source adapters, identity normalization, sharding, bounded caches, and the static client.
- `lib/data/` composes curated regression fixtures, source registries, synthesis routes, challenges, and curricula.
- `scripts/catalog/` owns the reproducible snapshot → normalize → build → validate → report lifecycle.
- `components/` renders those contracts and sends user attempts back to pure evaluators.
- Rendering engines consume validated structure records. They are not sources of molecular identity or scientific truth.

This direction is tested. Application consumers do not import a family-specific fixture directly, and chemistry/scoring policies remain usable outside React.

## Product domains

### Identity and Catalog

The catalog distinguishes normalized molecular entities, explicit chemical forms, regulatory products, approvals, external identifiers, structures, and educational classifications. Curated regression-fixture approval is attached to an exact Drugs@FDA `application + product + action` record and explicit `ChemicalForm`; it is not copied to a related normalized PubChem parent. Generated catalog approval entries use a separate, narrower DrugCentral FDA-list-membership contract.

The checked `drugcentral-fda-pubchem-eligible-v1` snapshot evaluates all 2,331 rows in the selected DrugCentral FDA list. It finds 1,858 complete same-ID DrugCentral structures, resolves 1,747 exact PubChem identities, imports 1,552 records with complete 2D/3D pairs, and retains 779 fail-closed unresolved rows partitioned as 473 identity-structure gaps, 111 PubChem-resolution gaps, and 195 full-pair gaps. It publishes exactly 3,104 SDF assets in 25 alphabetic shards plus one `unclassified` therapeutic shard. The original 15 curated molecules remain regression fixtures and teaching-content anchors, not a schema ceiling.

Generated approval entries represent DrugCentral FDA-list membership only. Application, product, and commercial-form linkage remains explicitly unresolved for all 2,331 source rows until exact openFDA enrichment is selected and succeeds. One display-name form/stereo conflict remains separate, and two multicomponent forms retain unresolved parent relations. The openFDA adapter is available but unused in this snapshot; direct EMA and PMDA adapters remain future work.

### Explore

Explore owns lens definitions, versioned projections, spatial clusters, progressive level of detail, stable hash navigation, keyboard/list access, camera transitions, and Universe → cluster → focus/compare state.

Therapeutic-area, target-profile, and curated-scaffold lenses are deterministic categorical layouts. Their screen distance is explicitly **not** a fingerprint/Tanimoto score, binding measurement, clinical similarity, or efficacy claim. The separate structural lens hashes one-, two-, and three-token canonical-SMILES paths into 512 bits and calculates Tanimoto similarity. It is versioned as `canonical-smiles-path-fingerprint@1.0.0`; it is not ECFP, pharmacology, clinical equivalence, route similarity, or a patent relationship. Localized labels never change canonical inputs, scores, or coordinates.

### Synthesis and Synthesis Learning

The synthesis domain owns route type, version, direct source anchors, materials, ordered steps, reaction classes, bond changes, named-atom correspondence, stereochemistry scope, review state, limitations, and the non-operational safety contract.

Synthesis Atlas contains six routes over propranolol, atenolol, and carvedilol: one foundational-education and one source-reported route per molecule. Together they contain 40 structure-backed materials, 20 conceptual transformations, and 12 curated mechanism teaching records. The reported atenolol and carvedilol routes provide five- and six-transformation paths respectively. The two complete electron-flow mappings originate in foundational transformations and anchor to actual 2D atoms/bonds. They remain bound to those material contexts; incompatible reported steps stay closed, while unmapped movements remain textual and draw no decorative arrows.

Primary-source locators are audited, while mechanism arrows and atom/bond interpretation remain curated educational annotations requiring qualified review. `getSynthesisAtlasSourceGate` fails closed unless direct HTTPS documents, locators, step/source resolution, and the non-operational safety contract are present. `canPresentSynthesisAtlasRouteAsReported` additionally requires a reported route with no declared evidence gap. Route, step, and mechanism navigation is deterministic; a mechanism layer opens only for an explicitly curated, source-gated step.

Challenge answer keys are not trusted blindly. Pure domain evaluators derive the expected answer from the referenced route, step, material role, bond changes, and provenance status; inconsistent configuration returns an invalid state.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md).

### Nomenclature Learning

The Nomenclature Academy domain contains eight ordered curriculum sections and 22 source-referenced exercises over 20 parseable structure records. Sixteen concrete response/widget contracts cover choice, atom/bond selection, ordered sequences, structure construction/choice, stereochemical assignment, and normalized text answers in TR and EN. A pure evaluator grades only the curated answer contract; it does not infer chemical identity or validate arbitrary names.

A typed local chemical-tool adapter supports four curated name↔structure records, verifies round trips, and fails closed for unknown names, structures, or mismatches. It is not a general IUPAC parser, OPSIN deployment, or RDKit validation service.

Progress is device-local UI state. Nomenclature persistence stores only a versioned current-topic ID, completed exercise IDs, and aggregate attempt counts; it excludes answers, structures, evaluations, and scientific claims. Learning progress cannot change evidence or review status.

### Build, Teach, and Discover

- Build owns guided educational fragment choices. A completed exercise is not synthesis evidence.
- Teach summarizes device-local progress and surfaces scientific review queues. There is no institution backend in this slice.
- Discover assembles curated evidence cards for a selected catalog identity. This slice has no durable store for user-created or research content, and missing evidence remains unknown.

### Evidence and optional narration

Evidence records separate evidence level from verification status and require stable source IDs. The evidence endpoint creates a curated local card first. If an external narrator is configured, it receives the user's question and only the allow-listed evidence context, then must return a strict schema whose cited source IDs resolve to the supplied set. Missing credentials, provider errors, invalid output, or citation failures return the curated card instead of unsupported prose. A deployment enabling this path must disclose the external-processing boundary and obtain any required consent.

The static GitHub Pages adapter has no API runtime and therefore invokes the same curated local card builder directly. This is an explicit deployment capability boundary, not a simulated network endpoint. The Pages bundle contains no provider credential, GitHub token, or external narration path.

## Delivery adapters

`app/` remains the vinext entry for local development and server-capable hosting. `deployment/github-pages/` is a thin client entry that mounts the same `DevMoleculesApp`; it contains no duplicate chemistry, curriculum, evidence, or UI implementation. `vite.pages.config.ts` sets the GitHub project base path, copies the checked-in public assets—including catalog manifest, shards, reports, and structure assets—and emits `dist-pages/`.

The application view model resolves only public asset fetch paths against `import.meta.env.BASE_URL`. Canonical domain `publicPath` records remain unchanged and continue to identify the checked-in asset. Hash navigation keeps Universe, cluster, and molecule-focus links inside the single static document.

The GitHub workflow validates both delivery adapters. Repository code runs without deployment credentials; the final Pages deployment job receives only `pages: write` and `id-token: write` after the quality and browser jobs succeed. See [Deployment](DEPLOYMENT.md).

## Localization architecture

The locale contract is `"tr" | "en"` and the default is Turkish. The runtime resolves locale in this order:

1. persisted browser preference;
2. supported browser language;
3. Turkish fallback.

`I18nProvider` updates `<html lang>`, persists selection under `dev-molecules:locale`, and exposes typed translation, interpolation, plural, and number helpers. The English message map defines the compile-time key union; the Turkish map must satisfy the same dictionary. Tests require exact key and placeholder parity and prohibit runtime fallback into the other language.

Synthesis uses a separate, stable-ID localized overlay for stories, steps, materials, atom labels, and limitations. Nomenclature records carry paired TR/EN educational text. SMILES, SDF records, formulas, molecule IDs, source IDs, evidence enums, route types, and projection inputs are not translated.

See [Localization](LOCALIZATION.md).

## Molecular rendering boundaries

### Shared Three.js scene

`MolecularScenePort` separates React navigation from the Three.js implementation. One adapter owns one `WebGLRenderer` and therefore one WebGL context for Explore. Universe, cluster, and focus update the same scene instead of opening a viewer for every molecule.

The explicit level-of-detail policy is:

- **Far Universe:** cluster glyphs; no structure download fan-out.
- **Curated/near Universe:** eight deterministic source structures by default, with a product budget of at most twelve. Forty remains a defensive renderer/cache ceiling, not a visual target.
- **Cluster:** a deterministic sample of up to ten structures from the selected cluster in the shared scene.
- **Focus:** one high-detail interactive structure.

The adapter uses source SDF coordinates, instanced atom/bond geometry, measured post-scale molecule extents, deterministic collision resolution, whole-layout camera fitting, a cache bounded to 40 parsed or in-flight structures, demand-driven rendering, and deterministic disposal. Ball-and-stick and space-filling representations, rotate/pan/zoom/reset, hydrogen visibility, and atom hover/selection are scene operations rather than alternate scientific records.

The generated-catalog resident metadata window is separately bounded and stratified. A modal, paginated catalog surface searches and browses all 1,552 imported records; selecting an off-window result hydrates only its shard/entity and requested SDF through bounded caches. Generated records whose therapeutic projection is explicitly unclassified stay outside the default spatial map while remaining searchable, pageable, and directly openable.

Runtime loading requires a valid 3D SDF. When a PubChem CID expectation is present, the file CID must match. A malformed, 2D-only, missing, or identity-mismatched file cannot become 3D geometry. Partial multi-record failure retains valid structures and reports failed identities; total failure is explicit.

### SmilesDrawer client boundary

Synthesis reaction schemes use `SmilesStructure`, a client component that dynamically imports `smiles-drawer`. Dynamic loading keeps the browser-only parser/renderer outside server execution and avoids adding another WebGL context. It renders source-associated SMILES to SVG. Parse or import failure exposes the original SMILES string; it never substitutes a decorative molecule or generated connectivity.

SmilesDrawer is a presentation adapter. The underlying material ID, SMILES, source ID, role, and review state remain in typed data.

## Structure and source data

Each curated regression identity has checked-in PubChem 2D and 3D SDF records:

```text
public/structures/pubchem/cid-{CID}-2d.sdf
public/structures/pubchem/cid-{CID}-3d.sdf
```

The provider endpoint represented by those assets is:

```text
https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/record/SDF?record_type=2d|3d
```

PubChem 3D records are computed conformers, not experimental crystal structures or protein-bound poses. Tests validate file identity, atoms, bonds, formula, InChIKey, coordinate dimension, provenance fields, and directional 2D stereo bonds.

The generated catalog publishes a separate, sharded static tree under `public/catalog/`. Its validator checks descriptor counts, uniqueness, byte lengths, SHA-256 digests, embedded PubChem CIDs, and 2D InChIKeys across exactly 3,104 current SDF assets; orphan or partial files fail validation. The client searches compact metadata before resolving one shard and one structure on demand. See [Catalog pipeline](CATALOG_PIPELINE.md).

Drugs@FDA anchors retain exact application/product/action identifiers, linked form, dataset and retrieval dates, official record URLs, review scope, and reproducible normalized hashes. The recorded `ORIG/1/AP` date is the selected product application's action date; it is not presented as the active moiety's first historical approval.

## Security and privacy boundary

- No client-only flag may be treated as authorization for future persisted data.
- User designs, uploads, and research assessments are private by default.
- Public catalog data, future institution content, and future private research data require distinct authorization domains.
- Imported or retrieved text is untrusted input to any external narration tool.
- Secrets, private keys, populated environment files, patient data, and unpublished structures are prohibited from the repository.

See [Security policy](../SECURITY.md).

## Quality strategy

The local and CI gate is:

```bash
npm run typecheck
npm run lint
npm run build
npm run build:pages
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
npm audit --omit=dev --audit-level=high
```

Unit and fixture tests cover domain invariants, catalog adapters/normalization/shards/caches, provenance resolution, fail-closed states, deterministic scoring, i18n parity, SDF parsing, structural similarity, renderer contracts, and bounded LOD behavior. Playwright exercises the production bundle, real scene interactions, five-mode navigation, context disposal, missing-asset failure, fixed-size visual captures, the GitHub project base path, source SDF delivery, and the serverless curated-evidence boundary. These checks are acceptance evidence, not a scientific peer review, catalog exhaustiveness proof, or GPU benchmark.
