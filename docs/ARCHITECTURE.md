# Dev Molecules — Architecture

## Architectural intent

Dev Molecules is one product shell with independently governed domains. The web experience may combine them, but no UI component, AI model or imported dataset becomes the scientific source of truth.

The current project shell is a React/vinext application intended for Sites/Cloudflare delivery. Domain logic must remain portable and testable outside framework components. Persistence bindings are activated only when their milestone requires them; schemas must not assume the initial seed is the final catalog.

## Dependency direction

```text
Web UI -> Application use cases -> Domain services -> Ports
                                                -> Evidence policy
Adapters (D1/R2/search/chemical tools/AI/providers) implement ports
```

- UI renders view models and submits commands; it does not decide scientific status.
- Application use cases coordinate authorization, domain operations and audit events.
- Domain services own identity, route, learning, scoring and evidence invariants.
- Adapters may fail or be replaced without weakening domain rules.
- Evidence policy is consulted before any scientific claim is shown as reviewed or verified.

## Bounded domains

### Identity and Catalog

Owns molecular entities, stereoisomers, salts/solvates/esters, active ingredients, products, approvals, synonyms and canonical external identifiers. It is the only domain allowed to merge or separate chemical identities.

### Explore

Owns lens definitions, precomputed coordinates, clusters, level-of-detail representations and navigation. A lens is a named projection over catalog/evidence data, not a new scientific fact. Every coordinate set stores its algorithm, input version and meaning.

### Synthesis

Owns routes, steps, atom mappings, precursors, transformations, conditions visibility, route type and review state. A molecule may have many routes. Proposed and reported routes cannot share the same presentation status.

### Learning and Games

Owns learning objectives, lessons, challenges, answer models, hints, attempts and educational scoring. Scores cannot write biological or discovery claims.

### Workbench

Owns user designs, versions, branches, fragments and 2D/3D representations. It calls chemical validation through a port. Designs are tenant-private by default.

### Evidence

Owns sources, source versions, claims, measurements, provenance, evidence class, conflicts, review decisions and audit history. All other domains reference evidence claim IDs rather than copying conclusions into free text.

### AI Orchestration

Owns prompts, tool calls, response schemas, citation resolution, refusal/fail-closed behavior and evaluation results. It can create pending assessments but cannot promote scientific content to reviewed or verified.

### Teaching

Owns institutions, courses, cohorts, assignments, attempts, rubrics and progress summaries. It consumes published learning content; it cannot silently edit canonical scientific content.

### Discovery Sandbox

Owns private research projects and evidence assessments for user designs. It consumes Workbench and Evidence services and always labels hypotheses, predictions and missing evidence. It never publishes into the reviewed catalog without a separate review workflow.

## Data boundaries

- **Relational operational data:** Drizzle-compatible SQLite/D1 tables for identities, relationships, claims, reviews, lessons, assignments and audit events.
- **Large immutable artifacts:** object storage such as R2 for SDF/MOL/PDB files, source snapshots, generated conformers and rendered assets. Store hashes and metadata in the relational database.
- **Derived search/index data:** exact identifiers, structure fingerprints, text indexes, vectors and spatial coordinates are rebuildable projections. They are never authoritative records.
- **Chemical computation:** structure normalization, valence checks, fingerprints, similarity, conformer generation and atom mapping live behind versioned chemical-tool ports.
- **External sources:** every importer stages raw records and provenance before normalization. Imports never overwrite reviewed claims directly.

Canonical identity should retain source IDs plus normalized representations such as canonical/isomeric SMILES and InChIKey where scientifically appropriate. Equality rules must state whether stereochemistry, charge, isotope and salt form participate.

## Evidence and AI request flow

```text
User structure or question
  -> structure parser/validator
  -> canonical identity and exact-match lookup
  -> analog and evidence retrieval
  -> synthesis/biology adapters when allowed
  -> evidence eligibility filter
  -> LLM explanation using a strict response schema
  -> citation and claim validator
  -> evidence card or fail-closed “unknown” result
```

The model never receives authority to invent a missing source, infer novelty from absence, convert an analog observation into direct evidence, or relabel prediction as experiment. If schema, citation or eligibility validation fails, the user sees an unavailable/unknown state rather than a best guess.

## Web and interaction boundary

- Keep molecule viewers and editors behind adapter components so 3Dmol.js, Mol*, Ketcher or alternatives can change.
- Use progressive level of detail: icons/clusters at universe scale, structures at family scale, full 3D only on demand.
- Preserve keyboard-accessible list/search navigation beside the spatial atlas.
- Do not serialize authoritative scientific status into client-only state.
- Keep route and molecule URLs stable enough for teaching references and source review.
- Avoid framework-specific code inside chemistry, evidence and scoring rules.

## Security and privacy

- Enforce tenant and project authorization in server-side use cases, not only in UI state.
- Default user designs, uploads and assessments to private.
- Separate public catalog data, institution-owned course content and private research data.
- Record explicit consent for sharing or training; absence of consent means no use.
- Treat imported documents and retrieved text as untrusted input to AI tools.
- Log scientific status changes, data exports and privileged review actions.

## Quality gates

- Unit tests for identity normalization, state transitions, scoring and evidence eligibility.
- Fixture-based tests for stereochemistry, salts, duplicate identities and conflicting sources.
- Render and interaction tests for 2D/3D consistency and spatial lens labels.
- Golden-set AI tests for citation resolution, uncertainty language and forbidden conclusions.
- Migration tests before any persistent schema release.
- Performance budgets for atlas loading and 3D activation, measured with expanded—not only seed—fixtures.
