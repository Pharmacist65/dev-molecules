# Differentiation Strategy

## Strategic position

Dev Molecules wins through **connected pharmaceutical meaning**, not raw
compound count and not a collection of disconnected scientific widgets.

The continuous identity-preserving journey is:

```text
Structure
→ Molecular properties
→ Chemical/scaffold family
→ Pharmacological family
→ Target and mechanism
→ Drug journey
→ ADME
→ Metabolites
→ Synthesis
→ Nomenclature
→ SAR and comparison
→ Learning challenge
→ Expert source view
```

A flagship dossier should let a learner move through that journey without
silently switching parent molecule, salt, ester, stereoisomer, conformer, route,
formulation, target species, or evidence context.

## Two scopes, one explicit identity bridge

### Curated Drug Atlas

The curated scope contains approved small-molecule active ingredients and
eligible pharmaceutical meaning: parent/form relationships, approval scope,
classifications, pharmacology, route/form-specific ADME, metabolites, synthesis,
nomenclature, learning content, provenance, and review state.

Small curated teaching sets are depth seeds, never schema or catalog ceilings.

### Universal Molecule Lookup

The universal scope is an on-demand provider adapter with a bounded TTL/LRU
cache. It may return identity, synonyms, formula, SMILES, InChIKey, PubChem CID,
and provider-resolved structures. It does not turn absence into novelty and it
does not promote a general compound into a drug dossier.

An identity bridge may link a universal result to a curated record only through
an exact, unambiguous, provenance-preserving match. A “not found” response is
only a lookup outcome.

Contract: `lib/domain/capabilities/universal-molecule-lookup.ts`.

## Competitive response

### Match the immediate molecular-learning job

From MolecuLens, match the speed and clarity of search, direct 2D/3D
interaction, structure highlighting, guided learning, touch quality, and figure
creation. Exceed it with record-level claim/source retention and the complete
pharmaceutical journey. Do not enable AI or quantum surfaces without eligible
typed facts and named backends.

### Make property space pharmaceutical

From MolAtlas, adopt percentiles and two-property distribution context rather
than a decorative radar chart. Reference cohorts must distinguish all curated
approved drugs, pharmacological family, ATC family, and a user-selected set.
Every observation carries units, method/source, tool version, conditions,
computed/experimental status, and uncertainty/limitations.

Contract: `lib/domain/capabilities/property-atlas.ts`.

### Keep expert power behind progressive disclosure

From MolScope, adopt interoperability, measurements, descriptors, QC, graphs,
contact maps, and adapter discipline. Expert Analysis stays hidden from default
Student presentation. Python may run at build time, server-side, or through a
future MCP adapter, never as a bundled public-browser runtime. Lightweight
analysis is not called simulation, and docking rank is not efficacy or binding
proof.

Contract: `lib/domain/capabilities/expert-analysis.ts`.

### Connect ligands to experimental target context

MolVerse is a vision benchmark for target and complex context, not a direct UI
competitor. Eligible records may show protein, family, PDB ID, experimental
method, resolution, bound ligand instance, pocket, residues, interactions, and
pathway. A computed conformer, predicted protein, or docking pose can never
stand in for an experimental bound structure.

Contract: `lib/domain/capabilities/target-complex.ts`.

## Grounded AI boundary

AI may sequence and rephrase existing typed facts, create questions from
eligible facts, explain selected atoms/groups/properties, and summarize
source-supported comparisons. Generated tours and quizzes must retain the claim
IDs and source IDs used to produce them.

AI may not invent properties, targets, ADME values, orbitals, synthesis routes,
experimental complexes, or novelty; it may not translate docking score into
efficacy. Missing or citation-ineligible facts make the generation fail closed.

## Delivery sequence

### P0 — architecture in the current reset

- Benchmark, parity, and differentiation documents
- Curated-versus-universal scope boundary and bounded-cache contract
- Canonical atom mapping for a shared 2D/3D Lens
- Provenance-rich Property Atlas contract
- Expert Analysis and future parser/service/MCP port contracts
- Target/Complex and replaceable viewer contracts
- Export Studio and QuantumDataPort contracts
- Evidence-derived readiness and feature-route gates

P0 contracts are `partial` delivery evidence, not shipped user features.

### P1 — next functional release

- Real name/SMILES/formula/CID/draw search flows
- Complete Lens highlighting and 2D↔3D selection continuity
- Approved-drug property distributions and comparisons
- Source-grounded tours and quizzes
- Real figure renderer/export workflow
- Distance, angle, torsion, and QC flows

Each item needs real data, a complete user flow, an automated test, and a current
committed screenshot before it can be marked `shipped`.

### P2 — scientific expansion

- Experimental protein–ligand complex viewer and three source-resolved flagship records
- Contact maps and binding-site analysis
- Broader provenance-preserving file adapters
- Molecular graph and advanced expert exports
- Optional MolScope server/MCP adapter
- Eligible quantum/property backends

P2 must preserve experimental-versus-predicted distinctions at every boundary.

## Feature exposure rules

- Unfinished features do not appear as empty primary-navigation pages.
- A placeholder may be secondary only when it has an honest availability label
  and a working fallback route.
- An architecture contract, a button, a mock record, or an empty panel is never
  enough for `shipped`.
- A current user flow without real source/structure data remains `partial`.
- A real flow and data without a passing automated test and current committed
  screenshot remains `partial`.

These rules are executable in
`lib/domain/capabilities/feature-readiness.ts` and covered by
`tests/competitive-capability-contracts.test.mjs`.

## Deliberate exclusions

Dev Molecules does not claim or plan to simulate experimental structure
determination, cryo-EM acquisition/reconstruction, binding kinetics,
thermodynamics, multi-omics analysis, high-throughput experimental screening,
full molecular simulation, or a public in-browser Python runtime. Those jobs
require different teams, instrumentation, validation, infrastructure, and risk
controls. Where relevant, Dev Molecules may link to eligible external evidence
without presenting itself as the system that generated it.
