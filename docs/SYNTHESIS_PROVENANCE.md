# Synthesis Atlas Provenance

## Purpose

Synthesis Atlas is a bilingual, structure-backed reading of source-linked transformations. It is designed to teach route topology, functional-group changes, bond changes, and selected mechanism concepts. It is not a laboratory protocol, manufacturing route, safety assessment, route recommendation, or claim that a synthesis will reproduce.

The current Atlas contains six routes for three molecules. These counts are curriculum coverage, not a route or molecule ceiling.

| Molecule | Foundational route | Reported-kind route presentation | Reported transformations |
| --- | --- | --- | ---: |
| Propranolol | foundational epoxide opening | source-context reconstruction | 3 |
| Atenolol | foundational glycidyl-ether route | directly source-reported | 5 |
| Carvedilol | foundational two-fragment route | directly source-reported | 6 |

Across all foundational and reported-kind views, the Atlas contains 40 source-associated material records, 20 conceptual transformations, and 12 curated mechanism teaching records. Every material has a parseable SMILES representation used for real 2D rendering. Two foundational transformations define the complete electron-flow mappings anchored to actual 2D atoms/bonds. Those mappings remain bound to their own material contexts; incompatible reported steps expose no mechanism layer.

## Primary-source anchors

| Source ID | Direct document | Atlas scope and locator |
| --- | --- | --- |
| `source:patent-us3337628a` | [US 3,337,628 A — 3-Naphthyloxy-2-hydroxypropylamines](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3337628) | General process; Examples 1 and 4; immediately following hydrochloride paragraph. Supports naphthoxy chlorohydrin/epoxide paths, propranolol parent connectivity, and reported hydrochloride form. |
| `source:patent-us3663607a` | [US 3,663,607 A — 1-Carbamoylalkyl phenoxy-3-amino-2-propanols](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3663607) | Example 1 and the immediately following glycidyl-ether starting-material description. Supports the para-amide glycidyl ether and its conversion to atenolol connectivity. |
| `source:patent-ru2423346c2` | [RU 2,423,346 C2 — Improved method for synthesis of beta-blocker](https://patentimages.storage.googleapis.com/d1/e3/cb/4926ba59fa3dcc/RU2423346C2.pdf) | Scheme V; Examples 12–14 and 23; racemic atenolol claims. Supports the five-transformation protected-amine route. |
| `source:patent-us4503067a` | [US 4,503,067 A — Carbazolyl-(4)-oxypropanolamine compounds](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4503067) | General starting-compound description and Example 2. Supports convergence of carbazole epoxide and methoxyphenoxyethylamine into carvedilol connectivity. |
| `source:patent-us4273711a` | [US 4,273,711 A — Process for the preparation of 4-hydroxycarbazole](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4273711) | Example covering hydrazone formation, Fischer cyclisation, and aromatisation. Supports three transformations from cyclohexane-1,3-dione and phenylhydrazine to 4-hydroxycarbazole. |
| `source:patent-wo2005113502a1` | [WO 2005/113502 A1 — Process for the preparation of carvedilol](https://patentimages.storage.googleapis.com/07/b8/32/9a59cbe1e5bfd9/WO2005113502A1.pdf) | Reaction scheme and Example, Steps 1–4. Supports the reported path from tetrahydrocarbazolone through carbazole epoxide and benzyl-carvedilol to carvedilol. |

The repository links to these third-party documents; it does not copy the PDFs into the application. A source link and locator establish a bounded source relationship, not expert approval or permission to redistribute the document.

## Route/source gate

`getSynthesisAtlasSourceGate` returns `blocked` unless all of the following hold:

- the route has at least one transformation and one source anchor;
- every anchor is a direct HTTPS document rather than a search/query URL;
- every anchor has non-empty TR and EN locators;
- every transformation resolves at least one source ID to an anchor on the route;
- `operationalDetailsIncluded` remains exactly `false`.

A route with a declared step-level evidence gap returns `partial-with-declared-gap`. `canPresentSynthesisAtlasRouteAsReported` returns true only for a `reported` route whose source gate is `source-supported`. Foundational routes may be source-supported educational compositions, but they are not relabelled as source-reported routes.

All six current routes pass a non-blocked internal source gate: three are `source-supported` and three are `context-supported`. Only two reported-kind routes satisfy the stricter direct-source presentation predicate. That result verifies data shape, direct-document resolution, evidence-state consistency, and declared scope. It does not prove independent chemical correctness, reproducibility, optimality, safety, scalability, or manufacturing suitability.

## Route, step, and mechanism levels

The route level presents a forward or retrosynthetic graph. The step level presents source-associated input/output structures, reaction class, general reagent and condition families, functional-group changes, and bond changes. The mechanism level is available only when the selected step has an explicit curated mechanism and no evidence gap.

Mechanism records identify a nucleophile, electrophile, intermediate, stereochemical scope, common error, and at least two electron-movement explanations. These are curated teaching interpretations consistent with cited connectivity. Electron-flow arrows render only from the two complete endpoint mappings defined by foundational transformations; a source-gated reported step can reuse one only through its explicit mechanism reference. An unmapped movement remains explanatory text and explicitly draws no decorative arrow; a step without an eligible mechanism fails closed. Unless the source publishes that exact explanatory layer, these records must not be described as patent-published atom maps or mechanism arrows.

Forward and retrosynthetic navigation uses one canonical transformation sequence. Retrosynthesis reverses that order; it does not create a second scientific record. Unknown or stale step identifiers fail closed to a valid visible step, and graph navigation is clamped rather than inventing a node.

## Structure presentation

Starting materials, intermediates, parents, and forms are rendered from SMILES stored on typed Atlas material records. SmilesDrawer dynamically renders those records as client-side SVG. A parser/renderer failure exposes the source representation and unavailable state; it does not substitute a decorative structure or generated connectivity.

The final parent structures align to the curated catalog identities for propranolol, atenolol, and carvedilol. A chemical form such as propranolol hydrochloride remains separate from the parent molecule. Stereochemistry scope is declared per route; the current racemic/connectivity-level routes do not claim a single enantiomer.

Explore's 3D focus is a separate representation boundary. PubChem 3D SDFs are computed conformers, not evidence that an Atlas intermediate or mechanism has an experimental bound pose.

## Non-operational contract

The Atlas may present:

- route boundary, direction, kind, and version;
- source-associated 2D structures and material roles;
- ordered conceptual transformations;
- reaction class and general reagent/condition family;
- functional-group and formed/broken/order-changed bond explanations;
- selected mechanism concepts, stereochemistry scope, limitations, and source locators.

The Atlas intentionally excludes:

- quantities, equivalents, concentrations, and scale;
- apparatus or setup;
- solvent recipes, temperature, pressure, pH, atmosphere, and duration;
- work-up, purification, yield, and execution instructions;
- claims of reproducibility, safety, manufacturing suitability, or recommendation.

Automated tests reject operational field names and common quantity/condition patterns in Atlas data. This protects application content; it does not claim that linked primary patents contain no operational information.

## Learning challenges

Four route-bound challenge kinds currently cover reaction class, step ordering, missing intermediate, and mechanism choice. Answer keys are stable IDs tied to the route data. The evaluator rejects unknown options, duplicates, malformed configuration, and empty answers as invalid rather than guessing.

Challenge success changes learning state only. It cannot promote a route, transformation, source, mechanism, or molecule to a higher scientific review status.

## Verification commands

```bash
node --test tests/synthesis-atlas.test.mjs
node --test tests/synthesis-provenance.test.mjs
node --test tests/synthesis-challenges.test.mjs
node --test tests/synthesis-curriculum.test.mjs
```

These tests validate route/material/step resolution, parseable 2D structures, five-plus reported paths, direct source documents and locators, fail-closed source gates, the two strict source-reported presentations, Propranolol's source-context reconstruction, forward/retro navigation, mechanism eligibility, the two atom-anchored foundational transformations, no-decorative-arrow behavior for unmapped moves, non-operational data shape, bilingual content, and route-bound challenge evaluation. They establish internal consistency and provenance shape; they do not replace review by a qualified synthetic chemist or educator.
