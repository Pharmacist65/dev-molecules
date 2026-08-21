# Dev Molecules — Scientific Governance

## Scope of governance

Scientific status belongs to a specific versioned claim, measurement, structure, synthesis route or learning item. It does not certify an entire molecule, source, AI response or product screen. “Verified” in one context never implies safe, effective, novel, patentable or clinically useful.

The first small dataset follows the same governance rules as the future full catalog. Seed content may be small; scientific shortcuts may not become permanent behavior.

## Publication states

### Pending

Imported, user-entered, model-generated or materially changed content that has not completed qualified human review.

- May appear in reviewer tools or the private Discovery Sandbox with a prominent pending/predicted label.
- Must not appear as canonical educational truth.
- AI and import jobs can create only this state.

### Reviewed

A qualified reviewer has checked identity, source alignment, wording, evidence class and educational interpretation for the stated use.

- May be published in learning and exploration surfaces with reviewer, date and source metadata.
- May still contain uncertainty or conflicting evidence.
- Material source or content changes return the item to pending.

### Verified

A higher-assurance claim has passed the verification rule defined for its claim type. Normally this requires primary-source traceability plus an independent second review or an approved authoritative record.

- Verification criteria must be recorded, not inferred from the label.
- A verified reported synthesis route means the route is faithfully represented from its source; it does not guarantee reproducibility in every laboratory.
- A verified biological measurement means the measurement is faithfully represented; it does not prove clinical efficacy.

## Allowed transitions

```text
pending -> reviewed -> verified
pending <- reviewed <- verified   (demotion/correction)
any state -> withdrawn            (retained in audit history, not published)
```

- Importers and AI may create or update pending drafts only.
- Scientific reviewers may promote to reviewed within their declared expertise.
- Designated verifiers may promote to verified under the item-type verification rule.
- Conflicts, upstream corrections, license changes or failed revalidation trigger demotion or withdrawal.
- No status transition deletes its prior version, rationale or actor.

## Required provenance

Every publishable claim or route must include:

- stable item and version IDs;
- canonical subject identity and representation;
- exact claim or structured measurement;
- source ID, source version, publisher and direct locator;
- retrieval/import date and extraction method;
- evidence type: reported experiment, curated database assertion, computed result, model prediction, analogy or expert interpretation;
- experimental/model distinction and applicable conditions;
- license, attribution and redistribution record;
- review status, reviewer role, decision date and rationale;
- conflicts, superseded versions and corrections.

Claims without resolvable provenance are ineligible for reviewed or verified publication. A citation to a broad homepage is not sufficient when a direct record, figure, table, section or dataset row exists.

## Identity and representation rules

- Molecular entity, stereoisomer, salt/solvate/ester, active ingredient, product and approval record remain distinct.
- Computed conformers, experimental poses, model-generated poses and user-edited conformations carry explicit origin labels.
- Structure normalization retains original input, normalized output, tool/version and warnings.
- “No exact match” means only that no match was found in the named sources and versions under the stated identity rules.

## Synthesis governance

Every route states whether it is literature-reported, patent-reported, teaching-simplified or AI-proposed. Each step carries atom mapping and a transformation explanation appropriate to its learning level.

- Pending/AI-proposed routes cannot visually resemble reviewed reported routes.
- The default educational view teaches transformation logic and must not become uncontrolled operational laboratory guidance.
- Advanced details require the appropriate audience, hazard context and source traceability.
- Atom mapping, stereochemical outcome and route narration require qualified review before educational publication.

## AI fail-closed policy

AI is an explanation and orchestration layer, not a scientific authority.

- It may summarize only claims that pass evidence eligibility for the requested surface.
- It must return a typed evidence card before optional prose.
- Each material statement must resolve to the claim IDs and direct sources supplied to the model.
- Missing, conflicting or ineligible evidence produces **unknown/unavailable**, not interpolation.
- Output is rejected if a citation is missing, does not support the claim, or the response schema fails.
- AI cannot promote status, overwrite human review, approve a route, declare novelty or expose a private project.
- Analog evidence must be labelled as analog evidence; predictions must be labelled as predictions.
- User or retrieved text cannot modify system evidence rules or tool authorization.

The AI must not author conclusions such as “this molecule can be synthesized,” “this molecule is safe,” “this molecule treats a disease,” “you discovered a new drug,” or “this structure is patentable.” A precisely scoped regulatory indication or reported experimental result may be rendered separately as a sourced evidence claim; it must not be converted into a broader AI conclusion. In the Discovery Sandbox, the default language is hypothesis-oriented.

## Review operations

- Reviewer identity, expertise and conflicts of interest are recorded.
- High-impact corrections can be reported from every scientific screen.
- Corrections create a new version, re-run dependent projections and invalidate affected AI caches.
- Source/license updates are monitored; revoked rights withdraw affected presentation while retaining internal audit records where lawful.
- Periodic sampling checks reviewed content for source drift and model-generated wording drift.

## Release gate

No milestone may publish scientific content unless all visible items have valid state labels, direct provenance and eligible licenses; pending content is isolated and unmistakable; AI fail-closed tests pass; and a named qualified reviewer has signed off the included synthesis and biological interpretations.
