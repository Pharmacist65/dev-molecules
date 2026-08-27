# Dev Molecules — Scientific Governance

## Scope

Scientific status belongs to one versioned claim, structure record, source extraction, synthesis interpretation, measurement, or learning item. It does not certify an entire molecule, route, source, screen, or application.

No status in Dev Molecules implies that a structure is safe, effective, novel, patentable, manufacturable, or suitable for clinical or laboratory use. Seed content follows the same rules intended for a larger catalog.

## Verification states used by the codebase

| State | Meaning | Publication boundary |
| --- | --- | --- |
| `verified` | The item passed the recorded higher-assurance rule for its item type. | Eligible only within its stated scope; it does not transfer to related claims. |
| `expert-reviewed` | A qualified reviewer checked identity/source alignment, wording, evidence class, and interpretation for the declared use. | Eligible for that reviewed use, with reviewer metadata and limitations. |
| `source-supported` | A direct source and locator support the scoped source assertion. Expert scientific interpretation may still be pending. | May support a clearly labelled source-reported reading; must never be presented as expert-reviewed or verified. |
| `pending-review` | Imported, editorial, user-entered, or materially changed content awaiting qualified review. | May appear only with an explicit pending/educational boundary; ineligible as reviewed scientific truth. |
| `predicted` | A model or computation produced a hypothesis or estimate. | Must remain visibly predicted and cannot be promoted automatically. |
| `conflicting` | Eligible records disagree or cannot yet be reconciled. | The conflict is the result; the application must not choose a convenient conclusion. |
| `unknown` | The named sources/rules do not support an assessment. | Show unknown/unavailable. Do not interpolate. |

Only `verified` and `expert-reviewed` satisfy the general reviewed-content predicate. `source-supported` is deliberately separate.

The legacy synthesis-story review model adds a scoped workflow status: `source-audited-pending-expert-review`. Synthesis Atlas adds separate `foundational-education` and `reported` route kinds plus direct-source, source-context, and evidence-gap step states. A passing source gate never upgrades curated mechanism arrows or pedagogical wording to expert-reviewed.

## Status transitions

The target controlled workflow is:

```text
draft/import/model output -> pending-review
pending-review -> expert-reviewed -> verified
expert-reviewed/verified -> pending-review     material change or revalidation
any state -> conflicting                       unresolved eligible disagreement
any state -> withdrawn                         correction, rights, or safety action
```

- Importers, automated tools, and models may create or update pending or predicted records only.
- A reviewer may promote only within recorded expertise and review scope.
- A verifier may promote only under a documented item-type verification rule.
- Material content, source, identity, or tool-version changes invalidate the prior promotion for the changed item.
- Demotion, conflict, correction, and withdrawal retain the prior version, actor, date, and rationale.

The current checked-in-data slice validates states and presentation rules but does not yet provide a persistent review/audit service. That service is a roadmap requirement; repository history is not a substitute for a scientific audit log.

## Required provenance

Every publishable scientific assertion must be able to retain:

- stable item and version IDs;
- canonical subject ID and relevant representation/form boundary;
- exact structured claim, measurement, or transformation statement;
- source ID, publisher, external ID, version/date, and direct record locator;
- retrieval/import date and extraction method;
- evidence class: reported experiment, regulatory record, curated database assertion, computed result, prediction, analogy, or educational interpretation;
- experimental/computed/predicted distinction and applicable scope;
- license, attribution, and redistribution status;
- verification state, reviewer role, decision date, and rationale;
- limitations, conflicts, superseded versions, and corrections.

A broad homepage or search-result URL is insufficient when an exact record, patent example, section, figure, table, or dataset row is available. Unresolvable provenance makes content ineligible for reviewed or verified publication.

## Identity and representation rules

- Molecular entity, stereoisomer, salt/solvate/ester, active ingredient, product, and approval record remain distinct.
- Approval is scoped to an exact product/application/action and explicit chemical form; it is not inherited by a normalized parent CID.
- Original input, normalized representation, tool/version, source ID, and warnings must remain traceable.
- A PubChem-computed conformer is not an experimental crystal structure or protein-bound pose.
- A 2D layout and a 3D conformer are different source records, not interchangeable proof.
- “No exact match” means only that no match was found in the named sources and versions under the stated identity rules.
- Missing or invalid structure data never authorizes generated atoms, bonds, stereochemistry, or identity.

## Generated catalog governance

The checked `drugcentral-fda-pubchem-eligible-v1` snapshot evaluates all 2,331 rows in the selected DrugCentral FDA list. Of those, 1,858 have a complete same-ID DrugCentral structure, 1,747 resolve to one exact source-name-aligned PubChem CID, and 1,552 publish with a verified 2D/3D pair. The remaining 779 rows fail closed: 473 lack the complete source identity structure, 111 lack one exact PubChem resolution, and 195 lack a complete verified structure pair. Source-row evaluation is exhaustive for this snapshot; `exhaustive: false` still correctly rejects any claim that this is the exact FDA product/application universe or a global approved-drug inventory.

- Generated approval entries represent source-list membership, not exact FDA application/product/form approval.
- Exact DrugCentral/PubChem InChIKey agreement and both 2D/3D assets are required for import.
- Name or connectivity similarity cannot silently merge different forms or stereochemical identities.
- One display-name group with distinct form/stereo identities remains separate and record-level auditable.
- Two multicomponent source forms retain explicitly unresolved parent relations; no parent identity is invented.
- Product/application linkage remains explicitly unresolved for all 2,331 source rows.
- All 1,552 generated therapeutic classifications remain unresolved in one `unclassified` therapeutic shard.
- The enrichment-readiness artifact has two active identity/structure adapters, zero configured enrichment snapshots, zero enriched classifications, zero enriched pharmacology profiles, and zero enriched ADME profiles.
- openFDA enrichment is not configured; EMA and PMDA are not configured.

Every one of the 1,552 resolved index identities has a Basic Molecular Record boundary containing only its source-matched identity, checked 2D SDF, separately labelled computed 3D conformer, conservative property values when present, resolvable source/snapshot provenance, and explicit coverage states. This availability does not make the identity a reviewed pharmaceutical dossier. A generated catalog identity outside the 15-record seed cannot inherit curated fixture claims, classifications, targets, ADME, metabolites, synthesis, nomenclature, or learning content. Missing dimensions stay unavailable.

The deep Curated Dossier remains limited to the 15 curated seed records. Within that seed, there is no presentable target-interaction dataset, no quantitative ADME field, and no reviewed metabolite edge. Exact product/form route context may be displayed only as context; it is not absorption, exposure, metabolism, or excretion evidence. Any Basic Record structure-neighbor hint is bounded, computed, and unreviewed; it cannot be presented as pharmacological, biological, clinical, route, or patent similarity.

See [Catalog pipeline](CATALOG_PIPELINE.md).

## Synthesis governance

Every synthesis record declares independent route type, completeness, applicability, review, access, and reuse states. Discovery candidates, source locators, route segments, teaching reconstructions, public-alpha drafts, and computational proposals are separate layers; no layer upgrades another by implication. The current migration retains six legacy route drafts in the private canonical review layer. All six are pending and link-only, so none is eligible for the official canonical route index or reviewed detail renderer. A separate public-alpha channel may expose pending exact-target source segments and exact-identity teaching bridges only after identity, locator, independent-redraw rights, non-operational-content, and explicit-gap gates pass. That channel must display `pending` and `verifiedScientificClaim: false` and must not supply reviewed curriculum or answer keys.

### Current educational safety boundary

The private review representation may include the following only when its typed evidence gates pass:

- cited named materials and parent connectivity;
- reaction-class and transformation explanations;
- formed/broken bond annotations;
- source-associated SMILES for 2D teaching diagrams;
- curated mechanism interpretations only on explicitly eligible steps;
- atom-anchored electron-flow arrows only from the two complete mappings defined by foundational transformations; reported steps with a different material context stay closed, and unmapped moves draw no decorative arrows;
- exact primary-document links and human-resolvable example locators.

Canonical route fields remain private while review or reuse is pending. A future reviewed public route must pass canonical validation, applicability, review, and source-specific reuse gates before the minimal canonical route schema can be generated. Public-alpha draft fields use a separate, smaller schema and cannot be consumed as canonical routes.

They intentionally omit:

- amounts or equivalents;
- apparatus and setup;
- solvent, concentration, temperature, pressure, pH, or duration;
- work-up, purification, yield, scale, and execution sequence;
- claims of reproducibility, safety, manufacturing suitability, or clinical performance.

The external primary patent documents may contain operational information. Dev Molecules links to those third-party documents for provenance but does not reproduce that material as an application protocol.

A route can pass the narrow source-reported presentation gate while its mechanism interpretation remains curated educational content. This means the scoped source assertion is supported; it does **not** mean the editorial electron flow is patent-published or expert-reviewed, the procedure is reproducible, or the route is recommended.

See [Synthesis provenance](SYNTHESIS_PROVENANCE.md).

## Nomenclature and learning governance

The eight-module Academy map separates available, coverage-dependent, and planned learning routes. It cannot count a module complete when only a route shell or missing scientific coverage exists. The eight-section Nomenclature Academy is `curated-educational` content tied to IUPAC references and, where relevant, exact product records. Its 22 exercises use 20 parseable structure records and 16 concrete response/widget types. Deterministic grading against curated answer contracts is not independent scientific verification.

- A correct learning response changes progress only.
- Learning scores cannot change molecular identity, evidence, or review state.
- Accepted systematic-name answers must be reviewed when curriculum content changes.
- The four-record local name↔structure adapter is a curated registry, not a general IUPAC parser or arbitrary structure validator; unknown input must fail closed.
- Generic, systematic, chemical-form, and product/brand names remain separate concepts.
- The current curriculum needs named subject-matter and instructional review before institutional publication.

## External narration fail-closed policy

An external narration model is an optional explanation layer, not a scientific authority.

- The application assembles a curated evidence card before requesting prose.
- The model receives only supplied, scoped findings and source records.
- Output must satisfy a strict response schema.
- Every cited source ID must resolve to the request's allow-list.
- Missing credentials, provider failure, invalid JSON/schema, or citation failure returns the curated fallback card.
- The model cannot promote review state, overwrite source records, approve a route, infer novelty, or expose private content.
- Analog, computed, and predicted evidence must remain labelled as such.

When external narration is configured, the question and curated evidence context cross the local application boundary. A production deployment must disclose the provider, purpose, retention settings, and consent basis; private or unpublished structures must not enter this path without an explicitly reviewed data contract.

The public static Lab uses the curated local evidence-card builder and has model generation disabled. Its Research Sandbox is unavailable. The presence of typed AI evidence contracts does not mean a live model path is shipped.

The application must reject unsupported conclusions such as “this molecule can be synthesized,” “this molecule is safe,” “this structure is patentable,” or “this molecule treats a disease.” A precisely scoped reported or regulatory assertion may be displayed as its own sourced claim; it must not be generalized by narration.

## User structures and role boundaries

- Ketcher standalone processes the current structure in the browser. The public application has no upload endpoint, account store, or persistent project database; a JSON artifact exists only after explicit local export.
- An exact catalog non-match means only that the current static index did not return one exact InChIKey. It cannot become a novelty, patentability, activity, or synthesizability conclusion.
- Instructor Studio may package current learning-task IDs and a connected device-local progress snapshot. It cannot create learner identities, deliver assignments, or promote scientific content.
- Expert is a learner preference whose current shipped effect is the curated-Dossier default, not scientific authorization.
- Reviewer Console must remain locked unless a host injects an authenticated, authorized, audit-backed adapter. Local settings, Instructor access, or a public hash route cannot open it.

## Review operations

The production review system must record reviewer identity, declared expertise, conflicts of interest, item version, source set, rationale, and decision scope.

- Scientific screens must provide a correction/report path.
- Corrections create a new version and invalidate dependent projections, cached narration, and affected teaching content.
- Source and reuse-status changes can demote or withdraw presentation while preserving lawful audit history.
- Periodic sampling must test source drift, link resolution, translation drift, and model-generated wording drift.
- Review in one locale must check that the other locale preserves the same scope and uncertainty.

## Release gate

Scientific content is eligible for release only when:

- every visible item has a correct verification label and resolvable provenance;
- source and reuse status are recorded;
- pending, predicted, conflicting, and unknown content are unmistakable;
- synthesis views preserve the non-operational boundary;
- fail-closed tests pass;
- localized copy preserves scientific scope in TR and EN;
- and a named qualified reviewer has signed off each item type that is presented as expert-reviewed or verified.

Until that gate is met, the content must remain explicitly educational, source-supported, pending, predicted, conflicting, or unknown according to its actual state.
