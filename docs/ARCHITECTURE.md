# Dev Molecules — Architecture

## Architectural intent

Dev Molecules is one product shell with independently governed scientific, learning, and rendering boundaries. React may compose those boundaries, but it is not allowed to manufacture chemistry, evidence status, scoring rules, or source provenance.

The current repository is a server-stateless React 19 application with two delivery adapters around the same product shell: Vinext for provider-neutral server-capable regression verification and a standalone Vite entry for static GitHub Pages delivery. It combines curated regression fixtures with generated static catalog shards and structure assets; explicit locale, presentation, and learning-progress state can remain device-local, but no persistent server database or object store is configured. Durable multi-user persistence is a roadmap item, not an implemented capability.

## Current dependency direction

```text
React product shell
  ├─ application view-model composition
  │    └─ typed domain rules and validators
  │          └─ checked-in data registries / provider ports
  ├─ localization runtime and typed localized content
  └─ rendering adapters
       ├─ shared Three.js 3D scene
       ├─ dynamically loaded SmilesDrawer 2D schemes
       └─ route-lazy Ketcher standalone editor and worker/WASM

Source SDF / SMILES / regulatory records / patent anchors
  └─ provenance and review state
       └─ eligible presentation or explicit unavailable state

Versioned catalog source snapshot
  └─ adapters and form/stereo-aware normalization
       └─ manifest / search index / shards / reports / lazy SDF assets
```

- `lib/domain/` owns identity, evidence, structure, synthesis, nomenclature, challenge, and learning contracts.
- `lib/application/` turns domain/data records into deterministic UI-facing models, including the Basic Molecular Record route resolver; it does not promote review status.
- `lib/catalog/` owns source adapters, identity normalization, sharding, bounded caches, and the static client.
- `lib/data/` composes curated regression fixtures, source registries, synthesis routes, challenges, and curricula.
- `scripts/catalog/` owns the reproducible snapshot → normalize → build → validate → report lifecycle.
- `components/` renders those contracts and sends user attempts back to pure evaluators.
- Rendering engines consume validated structure records. They are not sources of molecular identity or scientific truth.

This direction is tested. Application consumers do not import a family-specific fixture directly, and chemistry/scoring policies remain usable outside React.

## Product domains

### Routing and presentation

The primary route model is Home / Drug Atlas / Academy / Lab. Instructor and Reviewer are secondary workspaces rather than equal learner-navigation items. Retired Explore/Learn/Build/Teach/Discover top-level hashes resolve through compatibility mappings; molecule, cluster, and comparison hashes preserve the established Spatial Atlas state. Each of the 1,552 resolved index identities also owns a stable `#drug/{slug}` route. Route resolution checks an exact curated identity first, then the compact index, and hydrates only the selected non-seed entity; refresh preserves the record route and Atlas return navigation retains its query/page state.

Student and Expert are exhaustive learner preferences over the same scientific record. Student is the shared public science presentation. Expert currently changes only curated Drug Dossiers to open in Reference mode by default; Home, Atlas, Academy, Synthesis, and Lab keep the same learner-safe fields, source drawers, comparisons, and explicit local exports. Reviewer access is intentionally absent from that union. It requires a separate `ScientificReviewerAdapter` with authentication, authorization, record listing, audited writes, version/hash checks, and persistence. The public application injects no adapter and remains locked.

### Identity and Catalog

The catalog distinguishes normalized molecular entities, explicit chemical forms, regulatory products, approvals, external identifiers, structures, and educational classifications. Curated regression-fixture approval is attached to an exact Drugs@FDA `application + product + action` record and explicit `ChemicalForm`; it is not copied to a related normalized PubChem parent. Generated catalog approval entries use a separate, narrower DrugCentral FDA-list-membership contract.

The checked `drugcentral-fda-pubchem-eligible-v1` snapshot evaluates all 2,331 rows in the selected DrugCentral FDA list. It finds 1,858 complete same-ID DrugCentral structures, resolves 1,747 exact PubChem identities, imports 1,552 records with complete 2D/3D pairs, and retains 779 fail-closed unresolved rows partitioned as 473 identity-structure gaps, 111 PubChem-resolution gaps, and 195 full-pair gaps. It publishes exactly 3,104 SDF assets in 25 alphabetic shards plus one `unclassified` therapeutic shard. The original 15 curated molecules remain regression fixtures and teaching-content anchors, not a schema ceiling.

Generated approval entries represent DrugCentral FDA-list membership only. Application, product, and commercial-form linkage remains explicitly unresolved for all 2,331 source rows until exact openFDA enrichment is selected and succeeds. One display-name form/stereo conflict remains separate, and two multicomponent forms retain unresolved parent relations. The openFDA adapter is available but unused in this snapshot; direct EMA and PMDA adapters remain future work.

The enrichment registry records ten source policies but enables only DrugCentral identity/list data and PubChem structures in the public build. The current readiness artifact reports zero configured enrichment snapshots, zero enriched classifications, zero enriched pharmacology profiles, and zero enriched ADME profiles. A source policy or adapter interface is not scientific coverage.

### Drug Atlas and Dossier

Drug Atlas Browse is the default structure-index surface. It searches and pages all 1,552 imported records in the checked snapshot, then hydrates one shard/entity and the requested 2D/3D asset through bounded caches. Spatial is optional and lazy; it owns lens definitions, versioned projections, spatial clusters, progressive level of detail, stable hash navigation, keyboard/list access, camera transitions, and Universe → cluster → focus/compare state.

Therapeutic-area, target-profile, and curated-scaffold lenses are deterministic categorical layouts. Their screen distance is explicitly **not** a fingerprint/Tanimoto score, binding measurement, clinical similarity, or efficacy claim. The separate structural lens hashes one-, two-, and three-token canonical-SMILES paths into 512 bits and calculates Tanimoto similarity. It is versioned as `canonical-smiles-path-fingerprint@1.0.0`; it is not ECFP, pharmacology, clinical equivalence, route similarity, or a patent relationship. Localized labels never change canonical inputs, scores, or coordinates.

The molecular-record flow deliberately separates universal identity/structure coverage from curated depth. Every one of the 1,552 resolved index identities has a Basic Molecular Record boundary backed by its hydrated catalog entity: source-matched identifiers and aliases, checked 2D SDF, separately labelled PubChem-computed 3D conformer, conservative molecular-weight property when present, source/snapshot provenance, and nine independent coverage dimensions. Optional structure-neighbor hints are calculated only over the bounded resident metadata window with the existing canonical-SMILES path fingerprint and remain `computed-unreviewed`; they are not pharmacology, bioactivity, or clinical similarity.

The 15 identities that exactly map to `moleculeCatalog` resolve to the deeper Curated Drug Dossier. Every curated Dossier has Story and Reference presentations and independently calculated coverage indicators. Non-seed records do not inherit fixture claims and now open their Basic Molecular Record rather than an unavailable Dossier. The checked repository has no presentable target interactions, no quantitative ADME fields, and no reviewed metabolite edges. Curated exact product/form administration contexts can be shown without being relabelled as ADME measurement evidence.

The family domain and component validate parallel classification paths, provenance, representatives, comparison rows, and coverage gaps without forcing exclusive membership. The public route now exposes two deliberately bounded review workspaces—beta-adrenergic blockers and NSAIDs—with four exact PubChem identity/2D representatives each. Their canonical-SMILES fingerprint matrix is computed and unreviewed; classifications, shared mechanism, target families, motifs, and sourced comparison rows remain explicit gaps. This is not a curated production family dataset.

### Synthesis and Synthesis Learning

The synthesis domain owns route type, version, direct source anchors, materials, ordered steps, reaction classes, bond changes, named-atom correspondence, stereochemistry scope, review state, limitations, and the non-operational safety contract.

Synthesis now has four deliberately separate layers: catalog-wide discovery coverage, candidate/source-content extraction, private canonical route review, and a minimal public route projection. The first layer covers all 1,552 molecular identities. The accepted extraction run terminalizes all 14,897 molecule–evidence associations without converting candidates or decoded ORD fragments into routes. Source-content inspection stores hashes, access/rights outcomes, structured locator tokens, and generated non-quoting review cues only; it stores no source body or procedure window.

Six migrated route drafts remain private and pending. `getSynthesisRoutePublicationDecision` combines canonical validation, applicability, review, route/source reuse, and safety gates. The public publisher emits no route summary or detail when any gate is closed; the current generated public index is empty. A future eligible detail is parsed again by `published-synthesis-route.ts`, which validates identity, review, license, schema, index/detail agreement, safe paths, citations, and ordered steps before rendering both the visual graph and a linear screen-reader alternative. Legacy Dossier, Academy, Instructor, mission, and evidence-card data cannot bypass this projection.

Challenge answer keys are not trusted blindly. Pure domain evaluators derive the expected answer from the referenced route, step, material role, bond changes, and provenance status; inconsistent configuration returns an invalid state.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md).

### Academy and Nomenclature Learning

The Academy route composes eight modules from real destination and progress contracts. Structure Language, Organic Nomenclature, Pharmaceutical Nomenclature, Synthesis Atlas, and Drug Review Project are available. Pharmacology and ADME are coverage-dependent shells. Standalone Reaction Mechanisms is planned; it routes learners to the nearest eligible Synthesis Atlas content rather than fabricating a curriculum.

The Nomenclature Academy domain contains eight ordered curriculum sections and 22 source-referenced exercises over 20 parseable structure records. Sixteen concrete response/widget contracts cover choice, atom/bond selection, ordered sequences, structure construction/choice, stereochemical assignment, and normalized text answers in TR and EN. A pure evaluator grades only the curated answer contract; it does not infer chemical identity or validate arbitrary names.

A typed local chemical-tool adapter supports four curated name↔structure records, verifies round trips, and fails closed for unknown names, structures, or mismatches. It is not a general IUPAC parser, OPSIN deployment, or RDKit validation service.

Progress is device-local UI state. Nomenclature persistence stores only a versioned current-topic ID, completed exercise IDs, and aggregate attempt counts; it excludes answers, structures, evaluations, and scientific claims. Learning progress cannot change evidence or review status.

### Lab and role workspaces

- Lab loads Ketcher `3.17.2` only on its route. Ketcher standalone returns SMILES, molfile, and InChIKey locally; exact identity lookup uses the static catalog index. Local project export is explicit. No account, upload, or persistent project store is configured.
- Lab comparison uses the versioned path fingerprint against the curated seed and labels results computed/unreviewed. The evidence workspace assembles curated local cards; public model generation is disabled. Research Sandbox is visibly unavailable.
- Instructor composes device-local lesson packages from current Academy exercises and source-gated Synthesis challenges. A progress report requires a connected device-local snapshot. There is no learner identity, server sync, LMS, automatic delivery, or cohort backend.
- Reviewer is not a presentation setting. Its injected port must authorize before listing records, validate provenance and expected version/hash before actions, and return an audit receipt. The public app passes `adapter={null}`.

### Evidence and optional narration

Evidence records separate evidence level from verification status and require stable source IDs. The current evidence endpoint returns only a curated local card and does not invoke an external narrator. Any future narrator is an acceptance requirement rather than a present adapter: it must receive only allow-listed evidence context, return a strict schema with resolvable claim/source IDs, fail closed to the curated card, and disclose the external-processing boundary with any required consent.

The static GitHub Pages adapter has no API runtime and therefore invokes the same curated local card builder inside Lab. This is an explicit deployment capability boundary, not a simulated network endpoint. The Pages bundle contains no provider credential, GitHub token, reviewer adapter, research API, or external narration path.

## Delivery adapters

`app/` remains the Vinext entry for local development and a Cloudflare worker-capable production build. `deployment/github-pages/` is a thin client entry that mounts the same `DevMoleculesApp`; it contains no duplicate chemistry, curriculum, evidence, or UI implementation. `vite.pages.config.ts` sets the GitHub project base path, copies the checked-in public assets—including catalog manifest, shards, reports, and structure assets—and emits `dist-pages/`. The Pages build also emits the route-lazy Ketcher code, worker, and WASM needed by the on-device editor.

Both Vite configurations replace only Ketcher's required `global` and `process.env.NODE_ENV` compile-time identifiers. They do not polyfill the full `process` object or expose build-machine environment variables. The Vinext build externalizes explicit Ketcher packages only for server consumers while bundling the real browser editor for the client route.

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

The generated-catalog resident metadata window is separately bounded and stratified. The default Atlas Browse surface searches and pages all 1,552 imported records; selecting an off-window result hydrates only its shard/entity and requested SDF through bounded caches. Generated records whose therapeutic projection is explicitly unclassified stay outside the default spatial map while remaining searchable and pageable.

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

The full local pre-release gate is:

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

Unit and fixture tests cover domain invariants, catalog adapters/normalization/shards/caches, full-index stable record routing, Basic Molecular Record composition, provenance resolution, fail-closed states, deterministic scoring, i18n parity, SDF parsing, structural similarity, renderer contracts, and bounded LOD behavior. Playwright exercises production bundles, non-seed Basic Records, curated Dossiers, refresh/Atlas-return behavior, real scene interactions, context disposal, missing-asset failure, fixed-size visual captures, the GitHub project base path, source SDF delivery, and the serverless curated-evidence boundary. Focused Node tests also cover Atlas/Dossier, the eight-module Academy, synthesis readiness, Ketcher runtime contracts, device-local Instructor behavior, and fail-closed Reviewer authorization. These checks are acceptance evidence, not scientific peer review, a catalog-exhaustiveness proof, or a universal GPU benchmark. The V2.1 implementation remains release-pending until the complete [product-integrity gate](V2_1_RELEASE_BLOCKER_SPRINT.md) passes against the deployed commit.
