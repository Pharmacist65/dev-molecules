# Dev Molecules — Synthesis Provenance

## Purpose

This document records the provenance boundary for the three seed stories in Synthesis Theatre. They are structural, non-operational readings of primary patent examples. They are not laboratory protocols, manufacturing routes, safety assessments, or claims that a synthesis will reproduce.

The data model is versioned and generic; three stories are the current seed, not a route-count ceiling.

## Primary-source anchors

| Story ID | Molecule | Route version | Primary source | Exact locator represented in the story | Scoped support |
| --- | --- | --- | --- | --- | --- |
| `synthesis:propranolol-educational-scaffold` | Propranolol | `2.1.0` | [US 3,337,628 A — 3-Naphthyloxy-2-hydroxypropylamines](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3337628) | Example 4: naphthoxy epoxide/isopropylamine paragraph and the immediately following named-product paragraph | The reported input pair and propranolol free-base connectivity. The story does not extend backward into an uncited epoxide preparation. |
| `synthesis:atenolol-educational-scaffold` | Atenolol | `2.1.0` | [US 3,663,607 A — 1-Carbamoylalkyl phenoxy-3-amino-2-propanols](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3663607) | Example 1 named-product paragraph and the immediately following paragraph beginning preparation of the epoxypropane starting material | The named phenolic precursor, glycidyl-ether intermediate, isopropylamine input, and atenolol parent connectivity. |
| `synthesis:carvedilol-educational-scaffold` | Carvedilol | `2.1.0` | [US 4,503,067 A — Carbazolyl-(4)-oxypropanolamine compounds and therapeutic compositions](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4503067) | Example 2, starting-material paragraph and named-product paragraph | The two reported preformed fragments and carvedilol parent connectivity. Upstream preparation of either fragment is outside the story. |

Source registry IDs are `source:patent-us3337628a`, `source:patent-us3663607a`, and `source:patent-us4503067a`. Each record links directly to the official USPTO PDF rather than a search page and records retrieval date, support scope, verification note, and reuse status.

The repository links to the patent documents; it does not check copies of those PDFs into the application. The registry currently marks downstream reuse requirements as unknown, so redistribution of source material beyond links and original educational paraphrase requires a separate rights review.

## Structure presentation

Starting-material and intermediate diagrams are rendered from source-associated SMILES stored on typed material records. Those SMILES are an encoded presentation of the cited named/depicted connectivity; they are not claimed to be a verbatim field extracted from the patent.

Final parent-connectivity diagrams also resolve to the catalog's PubChem identity source:

| Final material ID | Source ID | External identity |
| --- | --- | --- |
| `material:propranolol:free-base` | `source:pubchem-4946` | PubChem CID 4946 |
| `material:atenolol:parent` | `source:pubchem-2249` | PubChem CID 2249 |
| `material:carvedilol:parent` | `source:pubchem-2585` | PubChem CID 2585 |

SmilesDrawer dynamically renders these records as client-side SVG. A renderer failure exposes the original SMILES string and does not substitute invented geometry. The Explore focus view separately loads checked-in PubChem 3D SDF coordinates; a computed conformer is not an experimental pose.

## Review-state interpretation

All three stories currently have:

- route type `patent-reported`;
- verification state `source-supported`;
- route review state `source-audited-pending-expert-review`;
- named-atom correspondence state `draft` on transforming steps;
- stereochemistry source presentation `not-assigned`;
- `operationalDetailsIncluded: false`.

`source-supported` means that the official document, patent number/title, exact example boundary, named inputs, and named product connection were audited. It does **not** mean that a synthetic chemist has independently approved the teaching map, that the patent procedure was reproduced, or that the route is optimal, safe, scalable, or recommended.

The named-atom correspondence and bond-change narration are editorial teaching annotations. The patents do not publish those application-specific maps. They remain draft until a named qualified reviewer records scope and rationale.

## Non-operational contract

The application may present:

- route boundary and version;
- material roles and source-associated 2D connectivity;
- ordered conceptual transformations;
- reaction class;
- formed/broken bond explanation;
- stereochemistry scope, limitations, review state, and direct source locator.

The application does not include:

- quantities, equivalents, concentrations, or scale;
- apparatus or setup;
- solvent, temperature, pressure, pH, atmosphere, or duration;
- work-up, purification, yield, or execution instructions;
- hazard-control instructions that could be mistaken for a complete safety assessment.

Automated tests reject operational field names and common quantity/condition patterns in the story records. This is a content guard, not a guarantee that an external primary document contains no operational information.

## Fail-closed presentation

`canPresentAsSourceReported` returns true only when:

- the route type is literature-reported or patent-reported;
- route verification is `verified`, `expert-reviewed`, or `source-supported`;
- at least one primary source anchor exists;
- each anchor has a direct HTTPS document URL and non-empty locator;
- anchor source IDs are included in the story source set;
- operational details remain explicitly excluded.

An AI-proposed route, an uncited educational draft, a non-HTTPS/search URL, or a missing locator fails this gate. Challenge grading independently derives expected answers from the referenced story and returns invalid when an answer key conflicts with route data.

## Verification commands

```bash
node --test tests/synthesis-provenance.test.mjs
node --test tests/synthesis-challenges.test.mjs
```

The provenance tests validate direct primary-document shape, story/source resolution, material roles, step inputs/outputs, bond changes, mapping scope, limitations, route validators, operational-detail exclusion, and source-reported failure cases. They verify internal consistency and source anchoring; they do not replace expert chemical review.
