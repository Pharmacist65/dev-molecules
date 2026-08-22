# Student-First Experience

## Product decision

Dev Molecules opens in Student Mode. The primary screen answers learner questions—what a molecule is, what structural features matter, how it relates to nearby records, and where to continue learning—before exposing catalog operations or review metadata.

Reviewer Mode remains available under Settings. It is a presentation layer for provenance, verification status, regulatory linkage, projection version/hash, and unresolved classification detail. It is not an authorization boundary and cannot promote, alter, or conceal the underlying scientific state.

The presentation preference is stored locally under `dev-molecules:presentation-mode`. If browser storage is unavailable, the product remains usable and defaults to Student Mode. Molecular IDs, projection coordinates, source records, learning answers, and review status are identical in both modes.

## What each mode shows

| Surface | Student Mode | Reviewer Mode |
| --- | --- | --- |
| Explore header | molecule and learning-oriented summary | same scene and navigation |
| Lens information | meaning and plain-language caveat | meaning, caveat, algorithm version, and input hash |
| Molecule focus | compact Passport and learning links | Passport plus full structure/regulatory provenance |
| Sources | collapsed secondary drawer | detailed 2D/3D and regulatory fields |
| Unknown classifications | plain pending/unavailable explanation | explicit verification and projection state |

Student Mode does not relabel pending content as verified. Moving technical fields out of the first reading path changes information hierarchy, not scientific policy.

## Explore journey

Explore uses one shared Three.js scene across four states:

```text
Universe
  ↓ select a spatial region
Cluster
  ├─ open one molecule → Focus
  └─ select 2–4 molecules → Compare
```

- **Universe:** starts with eight deterministic, source-backed structures in a fitted near overview. The separate catalog drawer searches and pages through all 1,552 indexed records; the rendered sample is never presented as catalog coverage. Spatial cluster regions are interactive and synchronized with camera pan/zoom.
- **Cluster:** flies the same camera toward one lens-defined region. Selecting a structure emphasizes it in the shared scene; opening it transitions to focus.
- **Focus:** presents an interactive high-detail structure and the Molecule Passport.
- **Compare:** places two to four source structures in the same scene and reports only a curated scaffold-family overlap. It does not claim to calculate a maximum common substructure.

Hash navigation supports Universe, cluster, focus, and compare state. Escape moves one level back; arrow-key navigation remains available for cluster and molecule selectors. Camera transitions use deterministic interpolation, and pointer release can continue bounded inertial motion.

## One-WebGL and level-of-detail boundary

Explore owns one `WebGLRenderer` and one WebGL context. It does not create a separate heavyweight viewer for every molecule.

- Far Universe uses cluster glyphs and does not fan out structure requests.
- Near Universe normally loads eight collision-resolved source structures; its product budget is at most twelve while the renderer/cache safety ceiling remains forty.
- Cluster renders a deterministic sample of up to ten structures from the selected region in the shared scene.
- Focus renders one high-detail interactive molecule.
- Compare reuses the scene for two to four structures.

The initial generated-catalog metadata window is deterministic and bounded; it is neither the eight-structure scene sample nor the searchable catalog ceiling. Search and paginated indexed browse operate across all 1,552 imported records, then hydrate only the selected shard/entity and requested structure through bounded caches. Records without curated map classification remain searchable and directly openable but do not form a default spatial cluster.

The parser rejects a missing, malformed, 2D-only, or identity-mismatched 3D SDF. Partial failures keep valid structures visible and report the failed identities; total failure stays explicit. No fallback creates decorative atoms or random bonds.

## Molecule Passport

The student Passport currently composes:

- preferred and PubChem systematic name when present in the checked SDF;
- molecular formula;
- deterministic functional-group cues derived from canonical SMILES;
- curated scaffold family and more specific scaffold label;
- educational drug class and mechanism summary;
- source-linked synthesis availability;
- a nomenclature learning cue;
- collapsed structure and regulatory sources.

Functional-group detection is a bounded educational classifier, not a general substructure-search engine. A missing systematic name or uncurated imported classification remains unavailable/pending; the Passport does not ask an LLM to fill it.

## Explore lenses

| Lens | Current algorithm | Meaning | Must not mean |
| --- | --- | --- | --- |
| Therapeutic area | versioned categorical layout | shared curated therapeutic label | clinical equivalence or efficacy |
| Target family | versioned categorical layout | shared curated target-profile label | binding strength, selectivity, or effect |
| Scaffold family | versioned categorical layout | shared human-authored structural-family label | quantitative chemical similarity |
| Structural similarity | canonical-SMILES path fingerprint + Tanimoto | overlap under this fingerprint version | ECFP, pharmacology, clinical equivalence, route, or patent relationship |

The structural lens tokenizes canonical SMILES, creates unique one-, two-, and three-token path features, hashes them into 512 bits, computes pairwise Tanimoto coefficients, and performs a fixed-iteration deterministic 2D projection. Its version is `canonical-smiles-path-fingerprint@1.0.0`.

This is deliberately **not an ECFP implementation**. Hash collisions, SMILES representation choices, omitted long-range topology, and lack of validation against a chemical benchmark limit its scientific interpretation. It is an inspectable educational lens that can later sit behind a replaceable, independently validated chemical-tool adapter.

## Learn map and Nomenclature Academy

Learn opens on a map rather than dropping the learner into a technical workspace. It currently separates the synthesis journey from the Pharmaceutical Nomenclature Academy.

### Synthesis Atlas

Synthesis Atlas contains paired foundational-education and source-reported routes for propranolol, atenolol, and carvedilol: six routes, 40 source-associated material records, and 20 conceptual transformations in total. The reported atenolol route contains five transformations; the reported carvedilol route contains six.

The interaction moves from a zoomable/pannable route graph to a selected transformation and, only where a curated source-gated interpretation exists, to a mechanism layer. Twelve transformations carry curated mechanism teaching records. The two complete atom/bond endpoint mappings originate in foundational transformations and remain bound to those material contexts. Reported steps with incompatible materials fail closed. Unmapped movements remain explanatory text and draw no decorative arrow; steps without an eligible mechanism fail closed. Forward and retrosynthetic reading use the same route data in reversed deterministic order. Four route-bound challenge types cover reaction class, step order, missing intermediate, and mechanism choice.

Every route has a direct HTTPS patent-document anchor and human-resolvable locator. A bad/search URL, missing anchor, missing step-source mapping, or declared evidence gap prevents presentation as a fully source-supported reported route. Mechanism arrows are curated teaching interpretations consistent with the cited connectivity; they are not claimed to be diagrams published in the patent.

All Atlas records set `operationalDetailsIncluded: false`. The interface includes general reaction-class, reagent-family, condition-family, functional-group, and bond-change language, but excludes quantity, scale, concentration, apparatus, temperature, duration, work-up, purification, yield, and execution instructions. The linked third-party patents may themselves contain operational information.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md) for exact route/source boundaries.

### Nomenclature Academy

The Academy contains eight ordered sections and 22 exercises over 20 parseable 2D structure records. Sixteen concrete response/widget types cover bond and atom selection, implicit-hydrogen reasoning, parent chain/ring selection, ordered atom numbering, functional-group selection, affix and name-part ordering, structure↔name choices, heterocycle numbering, ring-system classification, R/S and E/Z work, pharmaceutical-form/name-layer classification, name correction, and natural-product classification.

Answer evaluation is deterministic and tied to curated exercise contracts. Incorrect answers return the violated rule, an explanation, stepwise resolution, and the correct atom/bond region where applicable. A local typed chemical-tool adapter supports four curated name/structure records and verifies round trips; unrecognized names or structures fail closed. It is not a general IUPAC parser and does not infer arbitrary chemistry.

Academy progress is device-local and content-versioned. It stores identifiers and aggregate attempt counts, not a scientific review decision.

## Scientific and accessibility safeguards

- Source-supported, pending-review, predicted, conflicting, unknown, expert-reviewed, and verified states remain distinct.
- Screen distance always belongs to the active lens; no layout is universal similarity.
- PubChem 3D structures are labelled computed conformers.
- 2D rendering uses parseable structures; failures expose the source representation instead of substituting an illustration.
- Focus and compare have non-spatial text controls and keyboard paths.
- Live-region announcements identify state transitions without making scientific claims.
- Motion and visual polish must respect reduced-motion preferences and readable focus states.

See [Architecture](ARCHITECTURE.md), [Catalog pipeline](CATALOG_PIPELINE.md), [Scientific governance](SCIENTIFIC_GOVERNANCE.md), and [Localization](LOCALIZATION.md).
