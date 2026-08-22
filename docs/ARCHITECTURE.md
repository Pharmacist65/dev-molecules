# Dev Molecules — Architecture

## Architectural intent

Dev Molecules is one product shell with independently governed scientific, learning, and rendering boundaries. React may compose those boundaries, but it is not allowed to manufacture chemistry, evidence status, scoring rules, or source provenance.

The current repository is a stateless React 19/vinext application configured for Sites/Cloudflare delivery. It uses checked-in seed data and structure assets; no persistent database or object store is configured. Durable multi-user persistence is a roadmap item, not an implemented capability.

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
```

- `lib/domain/` owns identity, evidence, structure, synthesis, nomenclature, challenge, and learning contracts.
- `lib/application/` turns domain/data records into deterministic UI-facing models; it does not promote review status.
- `lib/data/` composes the seed catalog, source registry, synthesis stories, challenges, nomenclature curriculum, and provider adapters.
- `components/` renders those contracts and sends user attempts back to pure evaluators.
- Rendering engines consume validated structure records. They are not sources of molecular identity or scientific truth.

This direction is tested. Application consumers do not import a family-specific fixture directly, and chemistry/scoring policies remain usable outside React.

## Product domains

### Identity and Catalog

The catalog distinguishes normalized molecular entities, explicit chemical forms, regulatory products, approvals, external identifiers, structures, and educational classifications. Regulatory approval is attached to an exact Drugs@FDA `application + product + action` record and explicit `ChemicalForm`; it is not copied to a related normalized PubChem parent.

The current seed contains 15 molecules from more than one family. This is coverage for the implemented vertical slice, not a schema ceiling or a claim to contain every approved drug.

### Explore

Explore owns lens definitions, versioned categorical projections, clusters, progressive level of detail, stable hash navigation, keyboard/list access, and the Universe → cluster → focus transition.

The current therapeutic-area, target-profile, and curated-scaffold lenses are deterministic categorical layouts. Their screen distance is explicitly **not** a fingerprint/Tanimoto score, binding measurement, clinical similarity, or efficacy claim. Localized labels never change canonical category inputs or coordinates.

### Synthesis and Synthesis Learning

The synthesis domain owns route type, version, direct source anchors, materials, ordered steps, reaction classes, bond changes, named-atom correspondence, stereochemistry scope, review state, limitations, and the non-operational safety contract.

The three current stories are patent-reported educational readings. Primary-source locators are audited, while editorial atom maps remain draft and require named synthetic-chemistry review. `canPresentAsSourceReported` is a fail-closed presentation gate: it requires an eligible route type, eligible source status, a direct HTTPS document and locator, matching source IDs, and `operationalDetailsIncluded === false`.

Challenge answer keys are not trusted blindly. Pure domain evaluators derive the expected answer from the referenced route, step, material role, bond changes, and provenance status; inconsistent configuration returns an invalid state.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md).

### Nomenclature Learning

The nomenclature domain contains ten ordered topics, ten source-referenced exercises, and six interaction contracts. A pure evaluator handles single choice, multiple choice, and normalized text answers in TR and EN. It grades only the curated answer contract; it does not infer chemical identity or validate arbitrary names.

Progress is device-local UI state. It is a learning measure and cannot change evidence or review status.

### Build, Teach, and Discover

- Build owns guided educational fragment choices. A completed exercise is not synthesis evidence.
- Teach summarizes device-local progress and surfaces scientific review queues. There is no institution backend in this slice.
- Discover assembles curated evidence cards for a selected catalog identity. This slice has no durable store for user-created or research content, and missing evidence remains unknown.

### Evidence and optional narration

Evidence records separate evidence level from verification status and require stable source IDs. The evidence endpoint creates a curated local card first. If an external narrator is configured, it receives the user's question and only the allow-listed evidence context, then must return a strict schema whose cited source IDs resolve to the supplied set. Missing credentials, provider errors, invalid output, or citation failures return the curated card instead of unsupported prose. A deployment enabling this path must disclose the external-processing boundary and obtain any required consent.

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
- **Near Universe:** a maximum of 40 visible source structures.
- **Cluster:** the selected cluster in the shared scene.
- **Focus:** one high-detail interactive structure.

The adapter uses source SDF coordinates, instanced atom/bond geometry, a cache bounded to 40 parsed or in-flight structures, demand-driven rendering, and deterministic disposal. Ball-and-stick and space-filling representations, rotate/pan/zoom/reset, hydrogen visibility, and atom hover/selection are scene operations rather than alternate scientific records.

Runtime loading requires a valid 3D SDF. When a PubChem CID expectation is present, the file CID must match. A malformed, 2D-only, missing, or identity-mismatched file cannot become 3D geometry. Partial multi-record failure retains valid structures and reports failed identities; total failure is explicit.

### SmilesDrawer client boundary

Synthesis reaction schemes use `SmilesStructure`, a client component that dynamically imports `smiles-drawer`. Dynamic loading keeps the browser-only parser/renderer outside server execution and avoids adding another WebGL context. It renders source-associated SMILES to SVG. Parse or import failure exposes the original SMILES string; it never substitutes a decorative molecule or generated connectivity.

SmilesDrawer is a presentation adapter. The underlying material ID, SMILES, source ID, role, and review state remain in typed data.

## Structure and source data

Each seed catalog identity has checked-in PubChem 2D and 3D SDF records:

```text
public/structures/pubchem/cid-{CID}-2d.sdf
public/structures/pubchem/cid-{CID}-3d.sdf
```

The provider endpoint represented by those assets is:

```text
https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/record/SDF?record_type=2d|3d
```

PubChem 3D records are computed conformers, not experimental crystal structures or protein-bound poses. Tests validate file identity, atoms, bonds, formula, InChIKey, coordinate dimension, provenance fields, and directional 2D stereo bonds.

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
node --test tests/*.test.mjs
npx playwright test
npm audit --omit=dev --audit-level=high
```

Unit and fixture tests cover domain invariants, provenance resolution, fail-closed states, deterministic scoring, i18n parity, SDF parsing, renderer contracts, bounded LOD/cache behavior, and representative 500-record selection policy. Playwright exercises the production bundle, real scene interactions, five-mode navigation, context disposal, missing-asset failure, and fixed-size visual captures. These checks are acceptance evidence, not a scientific peer review or GPU benchmark.
