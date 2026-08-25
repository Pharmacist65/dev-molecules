# Molevren flagship dossier Phase A feasibility

**Assessment date:** 2026-08-25

**Scope:** scientific-content feasibility before product implementation
**Decision:** **GO — Propranolol, Celecoxib and Omeprazole all remain Phase A flagships; no fallback candidate is required.**

This document is a source-and-scope decision, not scientific certification, medical advice, a clinical comparison or permission to reproduce third-party material. A `GO` means that the required learning chain can be built from identified sources while unsupported fields fail closed. It does not make every candidate statement reviewed or publishable.

## Decision rules

- A product-specific label claim is carried only with its dosage form, route, population and conditions. Values from a salt, free parent, different formulation or different route are not merged.
- `direct` means the cited source expressly supports the claim. `derived` means the claim is a bounded structural or pedagogic interpretation of cited evidence and still needs a named reviewer.
- PubChem 3D records are computed conformers. They are never described as experimental structures, verified bioactive conformations or a complete racemate.
- An assay value is condition-bound. It is never promoted to a universal potency, selectivity or clinical ranking.
- A reported patent route is historical evidence, not a laboratory protocol, manufacturing instruction, freedom-to-operate opinion or proof of practical synthesizability.
- Missing values remain `null`/`hold`; they are not estimated. “Not found” does not mean absent, novel, safe, patentable or synthesizable.
- Source-backed English copy remains subject to scientific review. Turkish copy is a reviewed translation layer, not a second source of truth.

## Acceptance-chain summary

| Candidate and product anchor | Identity → chemistry | Family → target → mechanism | Route/form-specific journey and ADME | Metabolites and enzymes | Synthesis → nomenclature → comparison → learning | Phase A decision |
|---|---|---|---|---|---|---|
| **Propranolol** — racemic propranolol parent presented with oral propranolol hydrochloride tablet evidence | Adequate | Adequate; assay values optional/Reference-only | Adequate for the anchored oral tablet form; release type is not inferred and oral clearance remains missing | Adequate with conjugate/stereo holds | Adequate with expert review | **GO** |
| **Celecoxib** — celecoxib parent in oral CELEBREX capsule evidence | Adequate | Adequate; must not say “COX-2 only” | Adequate for a single 200 mg fasted capsule study; absolute bioavailability is missing | Adequate; glucuronide identity hold | Adequate with historical-comparator context | **GO** |
| **Omeprazole** — racemic free parent in delayed-release oral capsules (10/20/40 mg) | Adequate with stereochemical caveat | Adequate; acid activation is essential context | Adequate for delayed-release oral capsules; volume of distribution is missing | Adequate; activation-product structures hold | Adequate with nomenclature conflict exposed | **GO** |

The chain required by the Phase A brief is available for all three candidates. Aspirin, Metformin, Atorvastatin, Fluoxetine, Losartan, Warfarin and Tamoxifen therefore remain unassessed fallback candidates; none is substituted merely to avoid declared gaps.

## Propranolol

### Product and identity anchor

The dosage-form anchor is the current oral **propranolol hydrochloride tablet** label, DailyMed set `554c7446-8407-460e-b157-f860c5afbf12`, updated 2026-07-14. The label does not establish a release qualifier, so the record uses `TABLET` and does not infer immediate release. The molecular dossier distinguishes racemic free parent propranolol (PubChem CID 4946; ChEBI 8499; molecular weight 259.34) from propranolol hydrochloride (PubChem CID 62882; ChEBI 8500; molecular weight 295.80). Label-derived pharmacokinetics apply to the anchored oral hydrochloride tablet context, not to every propranolol form or route.

Primary routes: [DailyMed set](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=554c7446-8407-460e-b157-f860c5afbf12), [PubChem parent](https://pubchem.ncbi.nlm.nih.gov/compound/4946), [PubChem hydrochloride](https://pubchem.ncbi.nlm.nih.gov/compound/62882), [ChEBI parent](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:8499), [ChEBI hydrochloride](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:8500).

### Field feasibility and publish boundary

| Field | Evidence and bounded content | Status | Required review / hold |
|---|---|---|---|
| Identity; parent/salt/form | Parent and hydrochloride have separately resolvable records; the oral HCl tablet is the label anchor and no release type is inferred | Direct | Pharmaceutical-form reviewer confirms no parent/salt value mixing |
| 2D / 3D | Standardised 2D record and PubChem-computed 3D conformer | Direct with computed qualifier | 3D cannot be labelled experimental or racemate-complete |
| Functional groups / scaffold | Naphthalene, aryl ether, secondary alcohol and secondary amine; aryloxypropanolamine scaffold | Structure-derived | Medicinal-chemistry reviewer |
| Stereochemistry | One stereogenic centre; marketed evidence anchor is an R/S racemate | Direct + derived | Configuration wording and structure mapping require review |
| Families | Therapeutic beta-blocker context; nonselective beta-adrenoceptor antagonist pharmacology; aryloxypropanolamine chemical family | Direct + derived | Keep therapeutic, pharmacological and chemical families in separate fields |
| Primary targets / action | ADRB1 (UniProt P08588, ChEMBL 213) and ADRB2 (P07550, ChEMBL 210); competitive antagonist | Direct | Target curator; do not imply these are the only molecular interactions |
| Mechanism | Competes at beta-adrenergic receptor sites; the label says the mechanism of the antihypertensive effect is not established | Direct | Preserve the label's uncertainty; no invented downstream certainty |
| Drug journey | Oral dose → absorption → first-pass metabolism → systemic circulation → beta-receptor engagement → hepatic metabolism → renal/fecal elimination narrative | Direct + educational synthesis | Clinical-pharmacology review; not treatment guidance |
| Route-specific ADME | Nearly complete absorption; first pass leaves about 25% systemic; `Tmax` 1–4 h; about 90% protein bound; apparent distribution about 4 L/kg; plasma half-life 3–6 h; protein-rich food raises bioavailability by about 50% | Direct, oral HCl-tablet context; release type unassigned | Conditions shown beside every value; healthy-adult oral clearance remains `null` |
| Metabolism / enzymes | Aromatic hydroxylation, N-dealkylation/side-chain oxidation and direct glucuronidation; CYP2D6, CYP1A2 and CYP2C19/P-gp contexts retained exactly as source-qualified | Direct | Enzyme/pathway reviewer; avoid turning minor or interaction context into a universal rank |
| Metabolites | 4-hydroxypropranolol (CID 91565), naphthoxylactic acid (CID 115274), propranolol glucuronide (CID 119515); PMID 4400184 directly supports preclinical beta-adrenoceptor-blocking activity for 4-hydroxypropranolol | Direct identity + label pathway + preclinical animal pharmacology | Naphthoxylactic-acid and glucuronide activity remain explicit unknowns; conjugate position and stereochemical identity remain on hold unless directly resolved |
| Synthesis | GB2238786A-reported sequence: 1-naphthol + epichlorohydrin → glycidyl ether/epoxide → isopropylamine ring opening → free base → HCl salt; EP0249610B1 may support a separately labelled chiral route | Patent-reported | Original redrawing and chemistry review; no quantities, operational protocol or manufacturing claim |
| Nomenclature | `propan-2-ol` parent; `3-(propan-2-ylamino)` and `1-(naphthalen-1-yloxy)` substituent logic; alcohol suffix | Source-backed interpretation | IUPAC-capable reviewer validates locants, ordering and stereo treatment |
| SAR / comparison | Metoprolol (CID 4171) and atenolol (CID 2249) can support scaffold/action comparison | Source-backed comparison | No unsupported “better”, efficacy or safety rank; route/form contexts remain visible |
| Learning | Identify groups/scaffold; distinguish parent/HCl; map antagonism; order epoxide-opening steps; build the systematic name | Derived from reviewed claims | Learning copy cannot become additional scientific claims |
| TR / EN | English source-backed draft feasible; Turkish guided and Reference copy feasible | Review required | EN scientific review, then TR scientific-language review; untranslated enum/source locators stay Reviewer-only |

Optional Reference-view activities are [ChEMBL activity 18377916](https://www.ebi.ac.uk/chembl/api/data/activity/18377916.json) / assay `CHEMBL4145116` (`Kᵢ` 11.75 nM; pKᵢ 7.93; ADRB1) and [activity 18377937](https://www.ebi.ac.uk/chembl/api/data/activity/18377937.json) / assay `CHEMBL4145115` (`Kᵢ` 1.738 nM; pKᵢ 8.76; ADRB2). They belong only in Reference view with human HEK293T membrane, 90-minute radioligand-displacement context and exact provenance. They must not drive an unqualified “more potent” or clinical-selectivity sentence.

### Explicit holds

- Healthy-adult oral clearance: **missing — do not estimate**.
- Glucuronide attachment position and complete metabolite stereochemistry: **hold for direct structure-level review**.
- Chiral patent route: **separate route only**; do not merge with the racemic reported route.
- Any comparator efficacy/safety ranking: **out of scope**.

## Celecoxib

### Product and identity anchor

The product anchor is the current FDA **CELEBREX oral capsule** label, NDA 020998/S-058, revised 2024-11. The older DailyMed set `8d52185d-421f-4e34-8db7-f7676db2a226` / openFDA effective date 2021-04-15 may remain only as a visibly stale secondary locator. Current claims must route to the FDA revision.

Celecoxib is PubChem CID 2662, ChEBI 41423, formula `C17H14F3N3O2S`, molecular weight 381.38/381.4, and WHO recommended INN `celecoxib`. Its systematic name is `4-[5-(4-methylphenyl)-3-(trifluoromethyl)-1H-pyrazol-1-yl]benzenesulfonamide`.

Primary routes: [FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/020998s058lbl.pdf), [DailyMed secondary locator](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8d52185d-421f-4e34-8db7-f7676db2a226), [PubChem](https://pubchem.ncbi.nlm.nih.gov/compound/2662), [ChEBI](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:41423), [WHO Recommended INN List 42](https://cdn.who.int/media/docs/default-source/international-nonproprietary-names-%28inn%29/rl42.pdf).

### Field feasibility and publish boundary

| Field | Evidence and bounded content | Status | Required review / hold |
|---|---|---|---|
| Identity / form | Neutral celecoxib parent in an oral capsule; no salt substitution in the anchored claims | Direct | Product/form reviewer |
| 2D / 3D | Standardised 2D record; PubChem-computed 3D conformer | Direct with computed qualifier | 3D cannot be labelled experimental |
| Functional groups / scaffold | Primary sulfonamide, N-aryl pyrazole, trifluoromethyl, phenyl and methyl groups; 1,5-diarylpyrazole / benzenesulfonamide scaffold; no stereocentre | Structure-derived | Medicinal-chemistry reviewer |
| Key descriptors | Label-reported pKa 11.1, logP 3.5 and practical insolubility at physiological pH | Direct label values | Keep “label-reported”; no recomputation or condition erasure |
| Families | NSAID therapeutic family; prostaglandin-synthesis inhibitor acting primarily through COX-2 pharmacology; diaryl-substituted pyrazole/benzenesulfonamide chemistry | Direct + derived | Do not collapse the three family dimensions |
| Primary target / action | PTGS2/COX-2 (UniProt P35354; ChEMBL 230), inhibitor | Direct | Must not say “COX-2 only”; interaction breadth and in-vivo selectivity need context |
| Mechanism | Primarily inhibits COX-2 and thereby prostaglandin synthesis in the supported label context | Direct | Avoid universal or clinical-superiority conclusions |
| Drug journey | Oral capsule → dissolution/absorption → systemic distribution → COX-2 engagement → oxidative metabolism → urinary/fecal excretion | Direct + educational synthesis | Clinical-pharmacology review |
| Route-specific ADME | Single 200 mg fasted oral capsule, healthy adults (`n=36`, age 19–52): Cmax 705 ng/mL, Tmax 2.8 h, effective half-life 11.2 h, Vss/F 429 L and CL/F 27.7 L/h, each with its source %CV; about 97% protein bound; high-fat meal delays Tmax 1–2 h and increases AUC 10–20% | Direct, condition-bound | Show dose, fed state, cohort and %CV; absolute bioavailability was not studied and stays `null` |
| Metabolism / enzymes | Primarily CYP2C9; alcohol → carboxylic acid → glucuronide pathway | Direct | Interaction/genotype language is not generalized beyond source context |
| Metabolites | Hydroxycelecoxib/alcohol (CID 9908776), carboxycelecoxib (CID 10047220); label says the three circulating primary metabolites are inactive as COX-1/COX-2 inhibitors | Direct identity + label | Glucuronide CID 10415951 versus 169502284 remains hold; CID 131770042 is excluded as a wrong mapping |
| Synthesis | US5466823A example: p-methylacetophenone + ethyl trifluoroacetate/NaOMe → trifluorinated 1,3-diketone; condensation with 4-sulfamoylphenylhydrazine HCl → pyrazole | Patent-reported | Independently redraw; chemistry review; no laboratory protocol or practical-yield claim |
| Nomenclature | Pyrazole parent numbering, N-aryl attachment, para-sulfonamide, 4-methylphenyl and CF3 locants | Source-backed interpretation | IUPAC-capable reviewer validates locants and linked highlighting |
| SAR / comparison | Valdecoxib (CID 119607; NDA 21-341) and rofecoxib (CID 5090; NDA 21-042) provide historical structural/action context | Direct PubChem identity + archived FDA mechanism labels + formal Federal Register withdrawal notices (FR Doc. 2013-18657 and 2022-19740) | Both labels support the same COX-2 action class; formal withdrawal/history remains visible and no distinct action difference or “better” ranking is inferred |
| Learning | Mark diarylpyrazole/sulfonamide/CF3; distinguish NSAID, inhibitor family and scaffold; bind assay context; order diketone-to-pyrazole steps; nomenclature locants | Derived from reviewed claims | Learning answer keys require review |
| TR / EN | English source-backed draft feasible; Turkish copy feasible | Review required | EN scientific review then TR terminology review; stale-label status visible in both locales |

The optional Reference activity is [ChEMBL activity 1192793](https://www.ebi.ac.uk/chembl/api/data/activity/1192793.json), assay `CHEMBL763093`, document `CHEMBL1130002`: recombinant human COX-2 `IC50` 40 nM, pChEMBL 7.40. It is assay-specific and cannot be used as a universal in-vivo potency or superiority statement. The original discovery paper is [DOI 10.1021/jm960803q / PMID 9135032](https://pubmed.ncbi.nlm.nih.gov/9135032/).

### Explicit holds

- Absolute oral bioavailability: **not studied in the anchor label — leave `null`**.
- Celecoxib glucuronide structure: **hold** until one CID is directly resolved by a chemical reviewer; exclude CID 131770042.
- DailyMed/openFDA 2021 record: **stale secondary evidence**, never silently substituted for the 2024 FDA label.
- Valdecoxib/rofecoxib comparison: archived FDA labels support the same COX-2 target/action class; this is **historical context only**, with withdrawal status visible and no class ranking.

## Omeprazole

### Product and identity anchor

The product anchor is the **omeprazole delayed-release oral capsule** label (10, 20 and 40 mg), DailyMed set `92201fb1-4570-42db-8da3-3b8c0e291d32`, SPL `e786b865-dc62-4018-9cb1-7056b7ca2cde`, version 50, effective 2023-04-21, ANDA 075410, UNII `KG60484QX9`. The openFDA dataset update observed on 2026-08-22 is retrieval infrastructure metadata; it does not replace the product label's 2023-04-21 effective date.

The identity anchor is racemic free-parent omeprazole, PubChem CID 4594 and ChEBI 7772, formula `C17H19N3O3S`, molecular weight 345.4/345.42 and InChIKey `SUBDBMMJDZJVOS-UHFFFAOYSA-N`. Omeprazole magnesium (CID 130564) and sodium (CID 10959536) are separate forms. Their PK or dosage-form claims cannot be imported into the free-parent delayed-release capsule dossier.

Primary routes: [DailyMed set](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=92201fb1-4570-42db-8da3-3b8c0e291d32), [openFDA exact-set query](https://api.fda.gov/drug/label.json?search=openfda.spl_set_id:%2292201fb1-4570-42db-8da3-3b8c0e291d32%22&limit=1), [PubChem parent](https://pubchem.ncbi.nlm.nih.gov/compound/4594), [ChEBI parent](https://www.ebi.ac.uk/chebi/CHEBI%3A7772), [PubChem magnesium](https://pubchem.ncbi.nlm.nih.gov/compound/130564), [PubChem sodium](https://pubchem.ncbi.nlm.nih.gov/compound/10959536).

### Field feasibility and publish boundary

| Field | Evidence and bounded content | Status | Required review / hold |
|---|---|---|---|
| Identity; parent/salt/form | Racemic free parent is separate from magnesium and sodium forms; delayed-release capsule is the product anchor | Direct | Pharmaceutical-form reviewer; no cross-form PK reuse |
| 2D / 3D | Standardised 2D record; PubChem-computed 3D conformer | Direct with major caveat | A single computed conformer cannot be presented as a verified racemate or bioactive conformation |
| Functional groups / scaffold | Substituted pyridylmethylsulfinyl-benzimidazole; benzimidazole, pyridine, sulfoxide, methoxy/aryl ether | Structure-derived | Medicinal-chemistry reviewer |
| Stereochemistry | Sulfoxide sulfur is stereogenic; omeprazole is R/S racemate; esomeprazole is the S enantiomer comparator | Direct + derived | Structure mapping and stereodescriptors require review |
| Families | Proton pump inhibitor therapeutic/pharmacological context; acid-activated prodrug; benzimidazole/pyridine sulfoxide chemical family | Direct + derived | Keep EPC/therapeutic, mechanism and chemical family distinct |
| Primary target / action | Gastric H+/K+-ATPase catalytic alpha subunit ATP4A (UniProt P20648); acid-activated, covalent pump inhibitor | Direct | Mechanism reviewer; do not publish specific cysteine mapping without direct review |
| Mechanism | Enteric delivery precedes absorption; acidic parietal-cell compartment activates omeprazole through reactive sulfenic-acid/sulfenamide chemistry, enabling covalent pump inhibition | Direct + reviewed explanatory bridge | No unreviewed activation-product structures/animation; no universal IC50 |
| Drug journey | Enteric microtablets → gastric exit → intestinal absorption → circulation → acidic parietal-cell compartment → activation → pump inhibition → CYP metabolism → urinary/fecal elimination | Direct + educational synthesis | Clinical-pharmacology review; not dosing guidance |
| Route-specific ADME | Oral delayed-release capsule: Tmax 0.5–3.5 h, absolute bioavailability about 30–40%, plasma half-life about 0.5–1 h, clearance 500–600 mL/min, protein binding about 95%; repeat-dose time/dose dependence linked to CYP2C19 auto-inhibition | Direct, formulation-bound | Conditions remain attached; volume of distribution is absent and stays `null` |
| Metabolism / enzymes | CYP2C19 → 5′-hydroxyomeprazole; CYP3A4 → omeprazole sulfone; sulfide also resolved | Direct | Enzyme/pathway reviewer; genotype/interaction claims not expanded beyond sources |
| Metabolites / excretion | 5′-hydroxyomeprazole (CID 119560), sulfone (CID 145900), sulfide (CID 155794); label says these three have very little or no antisecretory activity; about 77% of a radiolabelled dose appears in urine as at least six metabolites, remainder in feces, with little/no unchanged parent | Direct | Do not rewrite this as “all metabolites are inactive”; unresolved carboxylic metabolite remains text-only |
| Activation products | Sulfenic acid/sulfenamide identities support mechanism context | Partial | Candidate structures CID 5311467 and CID 130512 require expert identity review; no public structure animation before approval |
| Synthesis | Reported sequence: substituted 2-mercaptobenzimidazole + chloromethylpyridine → sulfide → controlled oxidation to sulfoxide, supported by EP0005129A1 and omeprazole-specific US5386032A | Patent-reported | Original redrawing; chemistry review; no operating parameters or manufacturing claim |
| Nomenclature | Source forms differ: label `5-methoxy`, PubChem computed `6-methoxy`, ChEBI racemic `rac-5` context | Direct conflict, exposed | Store each exact source/status; do not silently select a winner; nomenclature reviewer required |
| SAR / comparison | Esomeprazole (CID 9568614), lansoprazole (CID 3883) and pantoprazole (CID 4679) support bounded structure/family comparison | Direct PubChem identity + direct DailyMed mechanism labels | Same gastric H+/K+-ATPase target/action class is shown; no distinct action difference, efficacy, safety or “better” ranking is inferred |
| Learning | Mark stereogenic sulfur; trace enteric journey/acid activation; distinguish sulfide and sulfoxide; order synthesis stages; investigate the source-dependent methoxy locant | Derived from reviewed claims | Answer keys disclose the nomenclature conflict and computed-3D limitation |
| TR / EN | English source-backed draft feasible; Turkish Student and Reference copy feasible | Review required | EN scientific/mechanism review, then TR domain-language review |

The mechanism literature anchor is [PMID 9593713](https://pubmed.ncbi.nlm.nih.gov/9593713/); enzyme anchors are [PMID 8894508](https://pubmed.ncbi.nlm.nih.gov/8894508/) and [PMID 10901708](https://pubmed.ncbi.nlm.nih.gov/10901708/); human mass-balance context is [PMID 2566473](https://pubmed.ncbi.nlm.nih.gov/2566473/); the nomenclature/tautomer context is [PMID 16261509](https://pubmed.ncbi.nlm.nih.gov/16261509/). The papers are evidence locators, not blanket permission to copy their text, tables or figures.

### Explicit holds

- Volume of distribution: **not present in the anchored label — leave `null`**.
- Activation-product structures and any sulfenamide animation: **hold for chemical identity/mechanism review**.
- Candidate carboxylic metabolite: **text-only** until direct identity evidence resolves its structure.
- PubChem computed 3D conformer: **never a verified racemate**.
- `5-methoxy` / `6-methoxy` / `rac-5` nomenclature forms: **preserve source-specific conflict**; do not call one source wrong without adjudication.
- Potency estimate, specific cysteine-residue map and cross-PPI “better” ranking: **out of scope**.

## Cross-candidate reviewer gate

Before any field becomes `reviewed` or `verified` in the public product, the reviewer record must contain: reviewer identity/role, claim ID, exact source locator, source revision or retrieval date, anchored route/form, decision, timestamp and any limitation. Anonymous Student/Reference users must not receive raw audit fields or Reviewer controls.

Minimum named review roles are:

1. medicinal/pharmaceutical chemistry: structures, functional groups, scaffolds, stereochemistry, metabolites, synthesis and nomenclature;
2. pharmacology/clinical pharmacokinetics: targets, action type, mechanism, journey, ADME values and assay-context boundaries;
3. scientific language: English source-faithful copy followed by Turkish terminology and meaning-equivalence review;
4. data/provenance: URL resolution, record/revision identifiers, retrieval timestamp, raw-response hash where imported, license bucket and stale-source warnings.

Until those gates are recorded, sourced fields may be displayed only with their actual `source-backed / review required` state. Pending, predicted or educational material must not be styled as verified science.
