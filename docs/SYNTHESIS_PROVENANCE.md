# Synthesis evidence provenance and publication boundary

## Purpose

Molevren records how synthesis evidence was searched, accessed, classified, and reviewed for every exact catalog identity. It does not treat a search hit, metadata record, decoded reaction fragment, or pending editorial draft as a reported synthesis route. It is an educational evidence surface, not a laboratory protocol, manufacturing recommendation, safety assessment, or guarantee of reproducibility.

## Four separate layers

1. **Coverage and candidate discovery** — all 1,552 exact catalog identities have one coverage record. The accepted discovery snapshot contains 14,897 molecule–evidence associations, all with terminal extraction outcomes.
2. **Source-content inspection** — accessible documents are inspected without bypassing access controls. The pipeline stores access and rights decisions, content hashes, structured locator tokens, and generated non-quoting review cues; it does not store source body text, schemes, figures, or procedure windows.
3. **Private canonical review** — exact source segments may support pending route drafts. A candidate source or metadata-only record cannot create a route. A local ignored retirement archive records six historical drafts over three identities, all attested pending and link-only. The current tracked public tree contains only aggregate counts/digests and cannot revalidate those withheld rows.
4. **Public projection** — only reviewed or verified, reuse-eligible routes can enter the generated public index. Current snapshot: zero public route details. Public coverage shards expose no route, source, locator, material, or step identifiers.

These layers are intentionally independent. A successful network request is not a reuse licence; an open-access label is not permission to redistribute a figure; an exact product match is not a complete route; and “not found in the recorded scope” is not novelty, patentability, or synthesizability.

## Independent scientific states

Coverage and evidence records preserve separate fields for assessment, source evidence, access, extraction outcome, route type, route completeness, review, applicability, identity scope, and licence/reuse state. They are never collapsed into a single status. Every “no supporting source resolved” result retains the searched providers, aliases, exact identity/form/stereo scope, assessment date, and pipeline version.

The candidate terminal states are `resolved`, `irrelevant`, `identity_mismatch`, `access_blocked`, `insufficient_detail`, `parse_error`, `retryable_error`, `duplicate`, and `superseded`. `unresolved` is not accepted as a final outcome. Retryable failures retain attempts and error policy rather than disappearing.

## Exact locator and identity policy

A source may remain a candidate without a locator. Promotion to a resolved segment or route requires a resolvable exact locator appropriate to the source family and exact molecular identity. Parent, salt, hydrate, solvate, and stereoisomer relationships are explicit; display-name similarity is never sufficient.

A teaching reconstruction may join source segments only through a structurally resolved shared intermediate with exact identity, compatible form, and compatible stereochemistry. Each edge retains its source segment and locator. Any connection not directly reported by one source is marked as an educational bridge and remains review-gated.

## Partial routes

A directly reported route may be `partial`, `upstream_gap`, or `convergent_partial`. Resolved source segments are retained alongside explicit gaps; no single complete-route source is required for a partial route. A partial draft is never presented as complete. The current public projection remains empty because the private migration aggregate records all six historical drafts as pending and link-only; public CI validates that aggregate and the zero-detail boundary, not the withheld rows.

## Reaction extraction and ORD boundary

Reaction participants, class, bond changes, atom mapping, and stereochemical result are stored only to the supported resolution. Computed classifications retain taxonomy/version/confidence and computed-versus-reviewed state. Atom mapping retains mapper/version/confidence and mapped/reviewed state. When mapping is unavailable, atom numbers are not invented.

Legacy qualitative formed/broken-bond descriptions are unreviewed transformation annotations while their mapping state is `not_mapped`; they are not computed atom-mapped bond changes and cannot support publication without qualified review or removal.

Decoded Open Reaction Database fragments remain private discovery candidates. They become source-segment evidence only after exact reactant/product identity, route-segment relevance, form/stereo compatibility, locator, review, and rights gates pass. The raw exact-target baseline and the active post-terminalization candidate subset are reported under different, explicitly defined metrics.

## Public and accessible presentation

Every Basic Molecular Record renders a Synthesis area. It distinguishes direct evidence pending review, candidate-only results, access barriers, and no supporting source resolved in the recorded scope. A coverage-artifact failure renders an explicit unavailable state and is not converted into “no route found.”

If a route eventually passes publication gates, the public detail renderer provides both a visual sequence and a screen-reader linear alternative. Every textual step includes reactants, transformation, product, and evidence status. Public/student artifacts exclude quantities, scale, temperature schedules, durations, detailed solvent/work-up, purification, and other operational protocol details.

## Current reproducible boundary

- coverage records: 1,552 / 1,552;
- terminal molecule–evidence associations: 14,897 / 14,897;
- unique source/reaction candidates in the accepted deduplicated snapshot: 14,616;
- private migration audit aggregate: 6 (withheld rows require separate private revalidation);
- public route index entries and detail artifacts: 0;
- operational synthesis detail published: false.

The complete distributions and limitations are recorded in [Synthesis Evidence Extraction Report](SYNTHESIS_EVIDENCE_EXTRACTION_REPORT.md) and the generated aggregate reports under `public/catalog/synthesis/reports/`.

The current-tree retirement is forward-only. Earlier public commits may retain retired alpha fixtures; this release does not claim that those historical objects became confidential or that repository history was rewritten.

## Verification commands

```bash
npm run synthesis:validate
npm run synthesis:boundary
node --test tests/synthesis-*.test.mjs tests/published-synthesis-route.test.mjs tests/public-synthesis-bundle-boundary.test.mjs
```

These commands establish data-shape, provenance, publication-boundary, and deterministic engineering consistency. They do not replace review by a qualified synthetic chemist, educator, accessibility specialist, or rights holder.
