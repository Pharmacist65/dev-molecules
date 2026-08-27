# Synthesis Evidence Extraction and Spatial Integrity Report

Report date: 2026-08-27

Catalog snapshot: `drugcentral-fda-pubchem-eligible-2026-08-22`

Candidate extraction pipeline: `synthesis-extraction-2.0.0`

Source-content pipeline: `synthesis-source-content-2.0.0`

This report records engineering and evidence-processing results. It does not claim that a candidate source is a synthesis route, that a pending draft is verified science, or that a scoped source-search miss establishes novelty, patentability, safety, or synthesizability.

## 1. Spatial redesign

Spatial is now a full-width immersive Atlas stage rather than a card nested inside repeated hero panels. The desktop stage has a 78 vh minimum, with floating search, lens, zoom and centre controls; molecule focus opens a right-side drawer. Student mode hides technical telemetry. Far LOD renders 4–6 large representative structures and near LOD renders 8–12 while retaining one WebGL context. The representative sample is not presented as catalog or therapeutic-family coverage.

The acceptance matrix covers 1440×900, 1920×1080, 125% zoom-equivalent (1152×720), 150% zoom-equivalent (960×600), and 390×844 mobile. Automated geometry assertions independently measure stage height, visual envelope, label boxes, clipping, overlap, control occlusion, horizontal overflow, and WebGL context count.

## 2. Candidate evidence totals

The immutable starting snapshot is preserved separately from the terminalized run:

| Measure | Count |
| --- | ---: |
| Exact catalog identities | 1,552 |
| Candidate-bearing identities in baseline | 1,279 |
| Molecule–evidence associations | 14,897 |
| Unique global document/reaction candidates | 14,616 |
| Baseline exact-locator-missing associations | 10,915 |
| Decoded ORD fragments | 3,982 across 763 identities |

Deduplication retains 266 repeated global documents and 281 cross-molecule document associations as explicit audit facts; it found zero same-molecule document duplicates. A separate source-content sweep inspects 9,992 unique journal/patent documents representing 10,248 associations and 1,064 coverage identities. That document-centric sweep is not a 1,552-molecule coverage denominator and its locator-token totals are not molecules, steps, segments, or routes.

The V2 source-content run completed all 9,992 documents and all 10,248
document–identity associations. Its terminal document outcomes are:

| Source-content outcome | Count |
| --- | ---: |
| `source_locator_candidate` | 1,720 |
| `inspected_no_segment` | 2,924 |
| `metadata_only` | 3,047 |
| `access_blocked` | 0 |
| `retryable_error` | 0 |
| `parse_error` | 665 |
| `unsupported` | 1,636 |

Full text was accessible for 4,644 documents. Rights states remain separate:
23 `open_license_detected`, 4,621 `public_access_no_reuse_inference`, and
5,348 `metadata_only`. The sweep created zero canonical routes and made zero
direct-reported-evidence claims. Locator contexts are generated review cues,
not reactions, segments, steps, or routes; source bodies and public source-content
artifacts are not stored. The completed record-set attestation is
`254891232ab2c7612920b0e1434818deb8b4b9bcd1fb8fdd47a341e7ed6600fd`.

## 3. Journal fallback identity fix

All 4,099 journal associations were re-evaluated before extraction. The 1,654 legacy fallback identities remain in audit history and terminalize as `superseded`; active fallback identity count is zero. The current set contains 2,445 stable document identities, 3,403 preferred-name matches, 560 alias matches, 112 ambiguous aliases, 24 title mismatches, and 48 normalized-name collisions across 18 collision keys. The representative Salbutamol stereoisomer collision guard passes. Open-access markup inspection attempted all 428 labelled unique documents without treating an OA label as reuse permission.

## 4. Evidence terminal-state distribution

All 14,897 associations have exactly one terminal extraction outcome; `unresolved = 0`.

| Extraction outcome | Count |
| --- | ---: |
| `resolved` | 2,645 |
| `irrelevant` | 6,027 |
| `identity_mismatch` | 245 |
| `access_blocked` | 0 |
| `insufficient_detail` | 4,326 |
| `parse_error` | 0 |
| `retryable_error` | 0 |
| `duplicate` | 0 |
| `superseded` | 1,654 |

The access dimension is independent: 4,416 accessible, 8,827 metadata-only, 0 access-blocked, and 1,654 unavailable. The source-evidence dimension is also independent: 12,252 candidate, 2,645 direct segment, and 0 direct route. No terminal candidate association carries a route type; all route completeness values at this layer remain `unknown`.

## 5. Molecule-level 1,552 best-outcome distribution

These categories are mutually exclusive and sum exactly to 1,552:

| Best outcome | Count |
| --- | ---: |
| `direct_complete_reported` | 1 |
| `direct_partial_reported` | 2 |
| `teaching_reconstruction_complete` | 0 |
| `teaching_reconstruction_partial` | 0 |
| `candidate_only` | 1,165 |
| `access_blocked_only` | 0 |
| `no_supporting_source_resolved` | 384 |

The three direct-route outcomes come from the privacy-safe private migration assessment aggregate. Public Basic Molecular Records expose a safe pending-review boolean, not route type, completeness, steps, sources, or locators. Public CI does not revalidate the withheld route rows behind that aggregate.

## 6. Extracted route count

The local private retirement archive and its privacy-safe attestation record six historical route drafts: five `patent_reported`, zero `literature_reported`, one `teaching_reconstruction`, and zero `computational_proposed`. The current tracked public tree contains no canonical route rows, and public CI validates only the aggregate/digests and zero-detail boundary. The 2,645 normalized direct-source segments are explicitly excluded from the six-route aggregate. The source-content sweep creates zero canonical routes and claims zero direct reported evidence.

## 7. Complete/partial route distribution

The private migration attestation records two `complete`, zero plain `partial`, three `upstream_gap`, one `convergent_partial`, and zero `unknown`. “Complete” describes the archived private route boundary; it does not bypass pending scientific review or reuse gates. Partial routes retain resolved source-bounded segments and explicit gaps without implying one end-to-end source. These row-level claims require private revalidation before publication.

## 8. Teaching reconstruction results

One teaching reconstruction remains a private pending draft. Its two
source-bounded segments meet at a structurally resolved intermediate, and the
incoming connection is explicitly an educational bridge rather than one
source-reported complete route. Molecular identity, intermediate identity,
source locators, and bridge details are withheld from this public aggregate
report until review and reuse gates pass.

The archived private migration previously recorded this bridge result. The
current tracked tree and current release artifacts no longer carry the private
route, material, source, or locator rows needed to re-derive it. Earlier public
commits may retain retired alpha fixtures. Public CI validates only the six-route
aggregate, its coverage/assessment digests, and the zero-detail publication
boundary. Before any route can be published, a private review process must
re-run canonical validation; connectivity-only identity, missing InChIKey,
missing source association, or an undisclosed bridge must fail closed.

## 9. Access-blocked counts

The terminal candidate-association layer records zero `access_blocked` outcomes and zero access-blocked access states; metadata-only remains 8,827 and is never promoted to a route. The independent source-content document sweep records its final access distribution above. It obeys journal/patent host pacing, redirects only across allowlisted hosts, and does not bypass paywalls, CAPTCHA, 401/403/407/451 responses, or other access controls.

## 10. No-supporting-source-resolved counts

Exactly 384 identities have `no_supporting_source_resolved` in the recorded search scope. Each retains provider attempts, aliases, exact identity/form/stereo scope, assessment date, and pipeline version. The UI states this scoped result explicitly; it never converts it to “not synthesizable,” “novel,” or “patentable.” A runtime coverage-artifact failure renders a separate fail-closed unavailable Synthesis area.

## 11. ORD resolution results

All 3,982 exact-target ORD fragments decoded. Identity hardening yields 2,645 direct-segment candidates, 919 insufficient-reactant-identity results, 306 target-already-input results, 112 target-connectivity-input results, and zero parse errors. One previously provisional segment was downgraded after an unparseable structured reactant failed independent Indigo identity resolution.

Reaction classification is `unclassified`; atom mapping is `not_mapped`; promoted canonical route count is zero. Although Indigo can produce atom maps, no mapping is asserted because the available mapper result lacks a confidence score and cached participant roles can mix agents with substrates. The report distinguishes the raw baseline of 763 identities with an exact-target ORD fragment from the 733 identities retaining an active ORD candidate association after terminalization and supersession.

## 12. Review/license distribution

The private migration attestation records all six historical drafts as `pending` and `link_only`; none is attested reviewed, verified, withdrawn, permitted, or attribution-ready for route-detail publication. These withheld rows still require private revalidation. Candidate associations contain 13,796 amber and 1,101 hold licence states. Copyright is recorded separately from redistribution, paraphrase, and figure/scheme reuse permissions. All 14,897 figure/scheme permissions remain unknown; an OA label never upgrades them.

The review queue contains 1,237 identities: 946 medium-priority and 291
low-priority/sample-pool entries. The deterministic random reason applies to
32 of those identities; it is not the size of the whole low-priority pool.
Privacy-safe route-review aggregates add three pending-route identities and
three multiple-route-comparison identities without publishing their rows. A
qualified expert sets policy using representative routes and reviews conflicts,
low-confidence records, and random samples; the expert is not expected to enter
1,552 records manually.

Legacy formed/broken-bond wording is retained only as an unreviewed transformation annotation with `not_mapped` state. It is not a computed atom-mapped bond change and cannot pass publication until qualified review supplies supported mapping or removes the annotation.

## 13. Public Synthesis Atlas changes

The public route index and detail set contain zero entries. Public synthesis shards contain coverage-only projections and expose no route IDs, source IDs, locators, materials, steps, route type, or completeness. Pending flagship synthesis stories, missions, and evidence cards were removed from public bundles. Public aggregate count reports are not route-detail publication and do not map private route properties back to molecular identities.

The Academy’s published-route counter is derived from the validated public index. A missing or malformed index renders “unavailable,” not a scientifically meaningful zero. Reviewed/verified and reuse-eligible generated artifacts are the only path to future route detail.

## 14. Accessibility results

Existing button and keyboard navigation remains. Any future publishable route has a semantic linear alternative listing, for each ordered step, reactants, transformation, products, and evidence state; visual SVG connectors remain decorative. Spatial keeps keyboard/list access, visible focus, a right-side inspector that does not overlap the canvas, reduced-motion behavior, mobile stacking, and no horizontal overflow in the acceptance matrix.

## 15. Test/CI results

The 2026-08-27 release-candidate workspace passed TypeScript typecheck, ESLint,
catalog validation (1,552 records, 25 alphabetic shards, and 3,104 structure
assets), synthesis validation (1,552 coverage records, a six-route private
aggregate attestation, zero public route details, zero warnings, and zero
errors), third-party licence consistency, the
Vinext production build, and the GitHub Pages static build. The complete Node
suite passed 407/407 tests. The full Chromium suite passed 51 executed scenarios
with one documentation-capture scenario intentionally skipped; the separate
Pages suite passed 5/5 scenarios. `npm audit --omit=dev --audit-level=high`
reported zero vulnerabilities. The public-synthesis boundary scanner now uses
12 generic, catalog-aware patterns and covers 227 generated release artifacts,
28 public documentation artifacts, and 407 tracked-source artifacts; real
private canary literals are not embedded in the scanner.

GitHub Actions and Pages are commit-scoped gates rather than a property of an
uncommitted workspace. Their live result must therefore be checked on the exact
published commit in the repository Actions/Deployments views and in the final
release handoff; a previous green deployment is not reused as evidence for this
candidate.

The gates cover typecheck, lint, catalog validation, synthesis validation, licence checks, production/static builds, all Node tests, the public-synthesis boundary scanner, focused and full Playwright suites, dependency audit, Git diff hygiene, CI, Pages deployment, and anonymous-live verification against the same commit.

## 16. Remaining scientific limitations

- The private migration attestation records no qualified scientific review or route-detail reuse permission for its six historical drafts; public route details therefore remain zero, and the withheld rows require private revalidation.
- Candidate discovery and source-content locator cues are triage evidence, not route resolution. Exact locators still require source-specific human review before promotion.
- The document sweep is limited to the implemented journal and patent access adapters and only 1,064 of the 1,552 coverage identities have journal/patent associations in that layer; broader coverage also includes aggregator and ORD evidence.
- Locator inspection retained 13,981 review cues across only 654 exact coverage identities; 9,933 additional contexts were cap-truncated. These are document-centric triage cues, not terminal-document incompleteness or route/step evidence, and the truncation is a material recall/review limitation.
- ORD fragments remain unclassified and unmapped; no computational retrosynthesis engine is configured, so computationally proposed routes remain zero.
- No claim is made about experimental reproducibility, yield, safety, optimality, scale-up, manufacturing suitability, patentability, or novelty.
- The private archive records a structurally resolved and source-associated teaching bridge, but public CI cannot revalidate its withheld rows; it remains an educational inter-document construction and must be revalidated privately before any publication.
- The source-content V1 artifact was rejected because it retained source-text windows. V2 re-ran from a clean boundary and stores no source prose, procedures, figures, schemes, or public artifacts.
- Current-tree retirement was forward-only. Earlier public commits may still contain retired alpha fixtures; this release does not claim a history rewrite or retroactive confidentiality.
- Engineering and deterministic validation do not replace review by a qualified synthetic chemist, educator, accessibility specialist, or rights holder.
