# Student-First and Expert Experience

## Product decision

Dev Molecules opens in Student presentation. Home answers where to begin; Drug Atlas defaults to the checked structure-index Browse surface; Academy exposes a visible learning map; and Lab labels local computation and privacy before the editor opens.

An Expert preference remains available under Settings, but its shipped effect is deliberately narrow: curated Drug Dossiers open in Reference mode by default. Home, Atlas, Academy, Synthesis, and Lab retain the same learner-safe scientific presentation. No additional Expert measurement, assay-context, comparison, or export workflow is shipped. Reviewer Console is a separate access domain and stays locked on the public host without an authenticated, audited adapter.

The presentation preference is stored locally under `dev-molecules:presentation-mode`. If browser storage is unavailable, the product remains usable and defaults to Student. Molecular IDs, projection coordinates, source records, learning answers, and review status remain unchanged; the preference must never select the Reviewer presentation branch.

## What each mode shows

| Surface | Student | Expert |
| --- | --- | --- |
| Dossier default | Story mode | Reference mode |
| Atlas, Academy, Synthesis, Lab | learner-safe presentation | same learner-safe presentation |
| Sources | closed/on-demand drawers | same closed/on-demand drawers |
| Measurements and assay context | only fields actually implemented | same implemented fields; no extra Expert adapter yet |
| Comparison | existing guided comparison | same existing comparison |
| Export | explicit local Lab export only | same explicit local Lab export only |

Neither learner presentation displays raw scientific enums as user-facing labels. Student does not relabel pending content as verified, and Expert does not unlock Reviewer actions. Changing information hierarchy never changes scientific policy.

## Atlas journey

Drug Atlas has two complementary views:

- **Browse** is the default. It searches and pages through all 1,552 imported records and hydrates only the selected shard, entity, and requested structure.
- **Spatial** is optional and route-lazy. It uses one shared Three.js scene across four states:

```text
Universe
  ↓ select a spatial region
Cluster
  ├─ open one molecule → Focus
  └─ select 2–4 molecules → Compare
```

- **Universe:** starts with eight deterministic, source-backed structures in a fitted near overview. The rendered sample is never presented as catalog coverage. Spatial cluster regions are interactive and synchronized with camera pan/zoom.
- **Cluster:** flies the same camera toward one lens-defined region. Selecting a structure emphasizes it in the shared scene; opening it transitions to focus.
- **Focus:** presents an interactive high-detail structure and the Molecule Passport.
- **Compare:** places two to four source structures in the same scene and reports only a curated scaffold-family overlap. It does not claim to calculate a maximum common substructure.

Hash navigation supports Browse, Spatial Universe, cluster, focus, and compare state. Legacy molecule/cluster/compare hashes remain compatible. Escape moves one spatial level back; arrow-key navigation remains available for cluster and molecule selectors. Camera transitions use deterministic interpolation, and pointer release can continue bounded inertial motion.

## One-WebGL and level-of-detail boundary

Spatial Atlas owns one `WebGLRenderer` and one WebGL context. It does not create a separate heavyweight viewer for every molecule.

- Far Universe uses cluster glyphs and does not fan out structure requests.
- Near Universe normally loads eight collision-resolved source structures; its product budget is at most twelve while the renderer/cache safety ceiling remains forty.
- Cluster renders a deterministic sample of up to ten structures from the selected region in the shared scene.
- Focus renders one high-detail interactive molecule.
- Compare reuses the scene for two to four structures.

The initial generated-catalog metadata window is deterministic and bounded; it is neither the eight-structure scene sample nor the searchable catalog ceiling. Records without curated map classification remain searchable and directly openable in Browse but do not form a default spatial cluster.

The parser rejects a missing, malformed, 2D-only, or identity-mismatched 3D SDF. Partial failures keep valid structures visible and report the failed identities; total failure stays explicit. No fallback creates decorative atoms or random bonds.

## Drug Dossier coverage

The routed Drug Dossier currently resolves only the 15 curated seed records. It offers Story and Reference presentations over the same typed record and composes:

- preferred and PubChem systematic name when present in the checked SDF;
- molecular formula;
- deterministic functional-group cues derived from canonical SMILES;
- reviewed classification only when a directly resolvable source passes the presentation gate;
- an explicit unavailable pharmacology state because no reviewed target-interaction snapshot is checked in;
- exact product/form administration context where the curated record supplies it, while all quantitative ADME phase fields remain empty;
- an explicit empty metabolite state because no reviewed metabolite edge is configured;
- source-linked synthesis availability;
- a nomenclature learning cue;
- collapsed structure and regulatory sources.

Functional-group detection is a bounded educational classifier, not a general substructure-search engine. A missing systematic name, classification, target, ADME field, metabolite edge, or deep-Dossier record remains unavailable/pending; the Dossier does not ask an LLM to fill it. A generated Atlas record outside the 15-record seed opens an explicit unavailable state rather than an invented dossier.

## Spatial Atlas lenses

| Lens | Current algorithm | Meaning | Must not mean |
| --- | --- | --- | --- |
| Therapeutic area | versioned categorical layout | shared curated therapeutic label | clinical equivalence or efficacy |
| Target family | versioned categorical layout | shared curated target-profile label | binding strength, selectivity, or effect |
| Scaffold family | versioned categorical layout | shared human-authored structural-family label | quantitative chemical similarity |
| Structural similarity | canonical-SMILES path fingerprint + Tanimoto | overlap under this fingerprint version | ECFP, pharmacology, clinical equivalence, route, or patent relationship |

The structural lens tokenizes canonical SMILES, creates unique one-, two-, and three-token path features, hashes them into 512 bits, computes pairwise Tanimoto coefficients, and performs a fixed-iteration deterministic 2D projection. Its version is `canonical-smiles-path-fingerprint@1.0.0`.

This is deliberately **not an ECFP implementation**. Hash collisions, SMILES representation choices, omitted long-range topology, and lack of validation against a chemical benchmark limit its scientific interpretation. It is an inspectable educational lens that can later sit behind a replaceable, independently validated chemical-tool adapter.

## Academy map and Nomenclature Academy

Academy opens on an eight-module map rather than dropping the learner into a technical workspace. Five modules have working destinations, Pharmacology and ADME are coverage-dependent, and standalone Reaction Mechanisms is planned. The map keeps the Synthesis journey distinct from the Pharmaceutical Nomenclature Academy.

### Synthesis Atlas

Synthesis Atlas contains paired foundational-education and reported-kind routes for propranolol, atenolol, and carvedilol: six routes, 40 source-associated material records, and 20 conceptual transformations in total. The reported atenolol route contains five transformations; the reported carvedilol route contains six.

The interaction moves from a zoomable/pannable route graph to a selected transformation and, only where a curated source-gated interpretation exists, to a mechanism layer. Twelve transformations carry curated mechanism teaching records. The two complete atom/bond endpoint mappings originate in foundational transformations and remain bound to those material contexts. Reported steps with incompatible materials fail closed. Unmapped movements remain explanatory text and draw no decorative arrow; steps without an eligible mechanism fail closed. Forward and retrosynthetic reading use the same route data in reversed deterministic order. Four route-bound challenge types cover reaction class, step order, missing intermediate, and mechanism choice.

Every route has a direct HTTPS patent-document anchor and human-resolvable locator. A bad/search URL, missing anchor, missing step-source mapping, or declared evidence gap prevents presentation as a fully source-supported reported route. The current route gates split into three direct-source-supported and three source-context-supported routes. Only the Atenolol and Carvedilol reported-kind routes qualify for strict source-reported presentation; Propranolol remains a source-context reconstruction. Mechanism arrows are curated teaching interpretations consistent with the cited connectivity; they are not claimed to be diagrams published in the patent.

All Atlas records set `operationalDetailsIncluded: false`. The interface includes general reaction-class, reagent-family, condition-family, functional-group, and bond-change language, but excludes quantity, scale, concentration, apparatus, temperature, duration, work-up, purification, yield, and execution instructions. The linked third-party patents may themselves contain operational information.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md) for exact route/source boundaries.

### Nomenclature Academy

The Nomenclature Academy contains eight ordered sections and 22 exercises over 20 parseable 2D structure records. Sixteen concrete response/widget types cover bond and atom selection, implicit-hydrogen reasoning, parent chain/ring selection, ordered atom numbering, functional-group selection, affix and name-part ordering, structure↔name choices, heterocycle numbering, ring-system classification, R/S and E/Z work, pharmaceutical-form/name-layer classification, name correction, and natural-product classification.

Answer evaluation is deterministic and tied to curated exercise contracts. Incorrect answers return the violated rule, an explanation, stepwise resolution, and the correct atom/bond region where applicable. A local typed chemical-tool adapter supports four curated name/structure records and verifies round trips; unrecognized names or structures fail closed. It is not a general IUPAC parser and does not infer arbitrary chemistry.

Academy progress is device-local and content-versioned. It stores identifiers and aggregate attempt counts, not a scientific review decision.

## Lab, Instructor, and Reviewer boundaries

- The Ketcher 3.17.2 editor is loaded only on the Lab route and processes structures in the browser. It creates a file only after an explicit local export; the public build has no upload or private cloud persistence.
- Exact InChIKey matching uses the 1,552-record static search index. A non-match is only a non-match in that snapshot and never evidence of novelty, patentability, activity, or synthesizability.
- Computed comparison uses the versioned canonical-SMILES path fingerprint against the curated seed and remains labelled unreviewed.
- Instructor Studio composes local packages from real Academy and Synthesis task IDs. It has no learner account, LMS, server delivery, or cohort backend.
- Reviewer Console requires an injected authenticated, authorized, audited persistence adapter. The public route intentionally supplies `null` and stays locked.

## Scientific and accessibility safeguards

- Source-supported, pending-review, predicted, conflicting, unknown, expert-reviewed, and verified states remain distinct.
- Screen distance always belongs to the active lens; no layout is universal similarity.
- PubChem 3D structures are labelled computed conformers.
- 2D rendering uses parseable structures; failures expose the source representation instead of substituting an illustration.
- Focus and compare have non-spatial text controls and keyboard paths.
- Live-region announcements identify state transitions without making scientific claims.
- Motion and visual polish must respect reduced-motion preferences and readable focus states.

See [Architecture](ARCHITECTURE.md), [Catalog pipeline](CATALOG_PIPELINE.md), [Scientific governance](SCIENTIFIC_GOVERNANCE.md), and [Localization](LOCALIZATION.md).
