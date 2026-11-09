# Catalog Pipeline

## Scope and non-claim

The catalog pipeline turns a versioned source selection into static, inspectable client artifacts. Every row in the selected DrugCentral FDA list is evaluated. The checked-in snapshot is still a US source slice, not an exhaustive inventory of FDA applications, approved active moieties, marketed products, chemical forms, or global approvals.

Current checked-in coverage uses `drugcentral-fda-pubchem-eligible-v1.json` (snapshot ID `drugcentral-fda-pubchem-eligible-2026-08-22`):

| Measure | Result |
| --- | ---: |
| DrugCentral FDA-list source rows | 2,331 |
| Rows with a complete same-ID DrugCentral structure | 1,858 |
| Exact unique PubChem identity resolutions | 1,747 |
| Imported records with verified 2D + 3D pair | 1,552 |
| 2D structures published | 1,552 |
| 3D structures published | 1,552 |
| PubChem SDF assets | 3,104 |
| Alphabetic / therapeutic shards | 25 / 1 |
| Unresolved source rows | 779 |
| Exact duplicates merged | 0 |
| Display-name form/stereo conflict groups | 1 |
| Multicomponent parent relations unresolved | 2 |
| Product/application links unresolved | 2,331 |
| Therapeutic classifications still unresolved | 1,552 |

The 779 unresolved rows are partitioned by stage: 473 lack a complete same-ID DrugCentral identity structure, 111 do not resolve to one exact unique PubChem CID, and 195 do not have a verified complete 2D/3D pair. Every unresolved row retains `failClosed: true`; the build does not substitute a name-to-structure fallback, placeholder identity, or fake structure. A source name may only disambiguate PubChem CIDs that already share the exact source InChIKey.

The 15 original curated molecules remain regression fixtures and educational anchors under `lib/data/` and `public/structures/pubchem/`. They are deliberately not the generated catalog's size limit. Explore keeps only a bounded resident window and resolves any indexed catalog match lazily; exact PubChem identities are reused while form/stereo-distinct identities remain separate.

## Source adapters

| Adapter | Current state | Role in this snapshot |
| --- | --- | --- |
| `drugcentral-approved` | used | membership in the selected DrugCentral FDA list; all 2,331 rows evaluated |
| `drugcentral-structures` | used | source SMILES, InChI, InChIKey, INN, and form identity |
| `pubchem-pug-rest` | used | exact InChIKey resolution and 2D/3D SDF retrieval |
| `openfda-drugsfda` | available, not selected | typed application/product/ingredient parsing for future exact enrichment |
| `ema-future` | future | no direct EMA snapshot configured |
| `pmda-future` | future | no direct PMDA snapshot configured |

An imported approval listing currently says only that the selected identity is present in the DrugCentral FDA list. `applicationNumber`, `productId`, and commercial-product linkage remain unresolved for all 2,331 rows. The pipeline does not infer these fields from names. Selecting the openFDA adapter in a later snapshot will require exact application, product, ingredient, form, and jurisdiction matching before promotion.

## Data flow

```text
complete selected-source evaluation
  ├─ DrugCentral FDA list (regulatory-list membership)
  └─ DrugCentral structure snapshot (SMILES/InChI/InChIKey)
       └─ exact InChIKey resolution in PubChem
            ├─ 2D SDF
            └─ 3D SDF
                 ↓
versioned source snapshot
  ↓
form- and stereochemistry-aware normalization
  ├─ normalized entities
  └─ explicit unresolved records
       ↓
static manifest, search index, shards, projections, reports, and assets
       ↓
base-path-aware lazy client / Explore merge
```

React components do not parse source registries or decide chemical identity. Adapters and normalization live in `lib/catalog/`; reproducible command entry points live in `scripts/catalog/`; generated browser assets live in `public/catalog/`.

## Identity boundary

The generated entity model keeps these concepts distinct:

- normalized molecular identity and PubChem CID;
- full InChIKey, connectivity block, and stereochemical/protonation block;
- parent relation;
- stereoisomer identity and whether stereochemistry is specified;
- single- versus multi-component source form;
- active-ingredient source name;
- commercial products plus an explicit unresolved product/application-linkage state;
- approval-list membership;
- 2D and 3D structure assets;
- provenance snapshot and source IDs.

The deduplication key includes the full PubChem InChIKey, source-form SMILES, and component count. Matching names or connectivity blocks are insufficient to merge records. A DrugCentral/PubChem InChIKey mismatch, absent identity, absent structure dimension, or conflicting exact identity becomes an unresolved report entry.

## Reproducible commands

```bash
npm run catalog:download
npm run catalog:normalize
npm run catalog:build
npm run catalog:validate
npm run catalog:report
```

- `catalog:download` reports the checked-in snapshot and performs no network request by default.
- `catalog:download -- --dry-run` reports the full selected-source evaluation without writing.
- `catalog:download -- --refresh` retrieves the configured DrugCentral sources, resolves every structurally eligible InChIKey through PubChem, downloads exact complete 2D/3D pairs, and rewrites the source snapshot. This is the only normal catalog command that requires network access.
- `catalog:normalize` runs form/stereo-aware normalization against the checked snapshot and prints counts without producing public shards.
- `catalog:build` regenerates the manifest, compact search index, reports, projections, and shards from the checked snapshot.
- `catalog:validate` checks manifest/index/shard counts, uniqueness, safe asset paths, byte lengths, SHA-256 digests, PubChem CIDs, and 2D InChIKeys for every generated structure; orphan or partial SDF files fail validation.
- `catalog:report` prints the source scope and exact coverage totals.

Refreshing a source snapshot is a review event, not a routine client build step. A changed snapshot must be diffed, rebuilt, validated, tested, and scientifically reviewed before release.

## Static output

```text
public/catalog/
  manifest.json
  search-index.v1.json
  projections/
    therapeutic.json
  reports/
    coverage.json
    unresolved.json
  shards/
    alphabetic/
      a.json ... z.json
      other.json
    therapeutic/
      unclassified.json
  structures/pubchem/
    cid-{CID}-2d.sdf
    cid-{CID}-3d.sdf
```

The manifest contains descriptors, not all records. The current 25 alphabetic shards contain at most 150 records each. The therapeutic projection is intentionally `unclassified` for all 1,552 generated records until curation; source-list membership is never used to invent a therapeutic class.

## Client loading and GitHub Pages

The static client first loads the manifest and compact search index. It resolves one alphabetic shard when an entity is requested, then resolves that entity's 2D or 3D SDF only when needed. Shards and structures use bounded least-recently-used caches; the manifest advertises a default maximum of 24 structure entries.

All public paths are resolved against the deployment base. Local and server-capable builds use `/`; the GitHub project site uses `/dev-molecules/`. The same static files therefore work without an API server or client secret.

Explore loads a deterministic, stratified resident metadata window of at most 40 generated records and leaves structure assets lazy. That metadata window is separate from the default eight-structure 3D overview. Full-index search and paging work across all 1,552 records; selecting a result resolves one shard/entity and one requested structure through bounded caches instead of adding the record to the prior Universe sample.

## Evidence files

- [Manifest](../public/catalog/manifest.json)
- [Coverage report](../public/catalog/reports/coverage.json)
- [Unresolved report](../public/catalog/reports/unresolved.json)
- [Search index](../public/catalog/search-index.v1.json)
- [Checked source snapshot](../scripts/catalog/source-snapshots/drugcentral-fda-pubchem-eligible-v1.json)

## Known limitations

- The selected DrugCentral source is exhaustively evaluated, but DrugCentral list membership is not the complete FDA product/application universe.
- The source FDA list is mediated through DrugCentral, not a direct FDA application/product snapshot.
- openFDA parsing exists but current records have not been enriched with it.
- Direct EMA and PMDA sources are not configured.
- All generated therapeutic groups are unresolved.
- PubChem 3D files are computed conformers, not experimental structures or bound poses.
- Parent-form resolution is explicit but incomplete: two multicomponent source forms remain unresolved, and no parent edge is inferred without independent evidence.
- Source availability and redistribution rights remain release-governance concerns; consult [Scientific governance](SCIENTIFIC_GOVERNANCE.md) and [Third-party notices](../THIRD_PARTY_NOTICES.md).
