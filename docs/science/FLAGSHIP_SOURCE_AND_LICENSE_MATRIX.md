# Molevren flagship source and licence matrix

**Assessment date / access date for every URL below:** 2026-08-25

**Candidates:** Propranolol, Celecoxib, Omeprazole
**Outcome:** all three have a viable claim-level source route; **GO with declared holds; no fallback candidate is activated.**

This is an engineering reuse assessment, not legal advice and not a grant of rights. A scientifically authoritative source and a redistributable data source are different questions. Public implementation must preserve both the claim provenance and the licence/reuse decision.

## Reuse buckets

| Bucket | Meaning in this project |
|---|---|
| **Green** | Normalised facts may be stored and displayed with the required attribution, revision and source locator. Exclude expressly marked third-party material, trademarks and package art. |
| **Amber** | The source may support a claim, but reuse has conditions or contributor-level ambiguity. Prefer a short original paraphrase, exact locator and independent structure/diagram. Isolate ShareAlike data and preserve notices where applicable. |
| **Hold** | A source, identity mapping or licence is unresolved. Keep it out of the public data package until a reviewer records a decision. |
| **Red** | Do not use as the primary public-data source without a separate licence/permission. A bare cross-reference may be retained when permitted. |

## Repository-wide source policy

| Source | Scientific use | Licence / terms route | Reuse decision | Required implementation behaviour |
|---|---|---|---|---|
| **openFDA SPL label data** | Exact SPL-set retrieval, sections, product metadata and label measurements | [openFDA licence](https://open.fda.gov/license/) and [terms](https://open.fda.gov/terms/) | **Green**, public-domain/CC0 data except expressly marked third-party exceptions | Store bounded facts and exact label text only where necessary; record SPL set/version/effective date and API retrieval date. Do not copy trademarks, package art or excluded third-party material. Never use for clinical decisions. |
| **FDA Drugs@FDA / label PDFs** | Current approval-history and label revision anchor | [FDA website policies](https://www.fda.gov/about-fda/about-website/website-policies) | **Green for government facts; amber for the complete submitted label/artwork** | Paraphrase factual claims, cite application/supplement/revision and direct PDF. Do not assume embedded brand, patent, artwork or third-party material is public domain. |
| **DailyMed** | Authoritative SPL locator and human-readable section route | [DailyMed](https://dailymed.nlm.nih.gov/dailymed/) and [NLM copyright/web policies](https://www.nlm.nih.gov/web_policies.html) | **Amber** | Use as locator and for claim-level paraphrase; pair with exact set ID/effective date. Do not reproduce layout, photos, package labels or brand art. Check rights on third-party contributions. |
| **PubChem** | CID identity, standardised connectivity, PUG records and explicitly PubChem-computed descriptors/conformers | [NCBI policies](https://www.ncbi.nlm.nih.gov/home/about/policies/) and [PubChem downloads](https://pubchem.ncbi.nlm.nih.gov/docs/downloads) | **Amber**, multi-contributor aggregator | CID/connectivity and explicitly PubChem-computed fields are usable with exact provenance. Preserve `computed` versus `source`. Do not bulk-copy third-party annotations or imply every contributing submission has one blanket licence. |
| **ChEBI** | Curated chemical identity, ontology and parent/form relationship | [ChEBI about/licence](https://www.ebi.ac.uk/chebi/about) | **Green — CC BY 4.0** | Attribute ChEBI and retain ChEBI ID, retrieved date and modification note for normalised fields. Do not import broad role assertions without claim review. |
| **UniProt** | Human target identity, protein name and accession | [UniProt licence](https://www.uniprot.org/help/license/) | **Green — CC BY 4.0** | Attribute UniProt; retain accession and organism. Target identity does not by itself prove drug action. |
| **ChEMBL** | Molecule/target mapping and condition-bound assay records | [ChEMBL licensing FAQ](https://chembl.gitbook.io/chembl-interface-documentation/frequently-asked-questions/general-questions) | **Amber — CC BY-SA 3.0** | Preserve attribution and ShareAlike obligations in an isolated data package. Store exact activity, assay and document IDs, organism/system, measurement type/unit and retrieval hash. Never universalise an assay. Do not treat ChEMBL software-derived calculated properties as measured claims. |
| **DrugCentral** | Cross-reference, source-list and selected curated drug fields | [DrugCentral download](https://drugcentral.org/download) and [privacy/terms surface](https://drugcentral.org/privacy) | **Amber — CC BY-SA 4.0 for DrugCentral database content** | Preserve attribution, ShareAlike and modification notices. The public dump dated 2023-11-01 and 2026 live cards are different snapshots. Do not redistribute WOMBAT-PK embedded potency without separate rights. |
| **PubMed / publisher papers** | Bibliographic locator and direct support for mechanisms, metabolism and human studies | [NCBI policies](https://www.ncbi.nlm.nih.gov/home/about/policies/) plus each article's licence | **Amber by default** | PMID/DOI bibliographic facts may be stored. Paraphrase supported findings and cite. Do not copy an abstract, table, figure or scheme unless the article licence expressly allows it. |
| **PMC7500594** | Open article usable where its omeprazole content directly supports a claim | [PMC7500594](https://pmc.ncbi.nlm.nih.gov/articles/PMC7500594/) | **Green — article marked CC0** | Cite the article and keep claim scope; CC0 does not expand rights in separately credited third-party figures/material. |
| **Patent publications** | Candidate synthesis evidence and publication chronology | Private review registry; molecule-to-document mappings withheld here | **Amber / hold** | Patent publication is evidence, not a blanket open-content or patent licence. No route fact, source mapping, figure, procedure, or redraw is published until exact-locator, scientific-review, and reuse-rights gates pass; never infer freedom to operate, validity, or present patent status. |
| **WHO INN** | International nonproprietary name fact | Direct WHO list below | **Amber** | Cite list and entry; store the name fact. Do not substantially reproduce the PDF, typography or figures. |
| **GtoPdb** | Optional target/pharmacology corroboration | [IUPHAR/BPS Guide to Pharmacology licence](https://www.guidetopharmacology.org/about.jsp#license) | **Amber — database ODbL/content CC BY-SA as stated by the service** | Optional corroboration only; preserve attribution/share-alike and a snapshot. Not required for the Phase A `GO`. |
| **WHO ATC** | Possible therapeutic-class corroboration | [WHOCC copyright/legal notices](https://atcddd.fhi.no/copyright_disclaimer/) | **Hold** | Redistribution scope is unresolved for this public package. Do not import ATC descriptions/codes until rights review is recorded. |
| **DrugBank** | Optional external identifier | [DrugBank terms](https://go.drugbank.com/legal/terms_of_use) | **Red as a primary data source** | No DrugBank-derived public scientific fields without a suitable licence. Do not use it to fill gaps. |

ChEMBL's live interface reported release 37, updated 2026-05-01, at assessment time, while some download documentation can still identify release 36. Every ChEMBL import must therefore save `retrieved_at`, the raw JSON hash and the observed release; do not attach a release-36 DOI to release-37 data unless independently verified.

## Propranolol claim routes

**Anchored form/route:** racemic propranolol parent for molecular identity; oral propranolol hydrochloride tablet for label-derived journey/ADME. The exact label does not establish a release qualifier, so none is inferred.

| Claim group | Direct source route and record | Reuse | Public-data decision |
|---|---|---|---|
| Current oral HCl tablet label, mechanism, PK, metabolism | [DailyMed set 554c7446-8407-460e-b157-f860c5afbf12](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=554c7446-8407-460e-b157-f860c5afbf12); [openFDA exact-set JSON](https://api.fda.gov/drug/label.json?search=openfda.spl_set_id:%22554c7446-8407-460e-b157-f860c5afbf12%22&limit=1), label effective/update 2026-07-14 | openFDA green; DailyMed amber | Normalised, paraphrased form/route-specific fields; retain set/effective date. No brand/package assets. No release qualifier is inferred. |
| Parent identity/connectivity | [PubChem CID 4946](https://pubchem.ncbi.nlm.nih.gov/compound/4946); [ChEBI 8499](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:8499) | PubChem amber; ChEBI green | Store separately attributed identity fields. |
| Hydrochloride identity/form relation | [PubChem CID 62882](https://pubchem.ncbi.nlm.nih.gov/compound/62882); [ChEBI 8500](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:8500) | PubChem amber; ChEBI green | Separate entity; never overwrite parent formula/MW or attach parent 3D as the salt. |
| 2D / computed 3D | [PubChem CID 4946 PUG record](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/4946/record/JSON) | Amber | Cache provenance-qualified 2D/3D records; label 3D `computed`; validate CID/InChIKey. |
| ADRB1 target identity | [UniProt P08588](https://www.uniprot.org/uniprotkb/P08588/entry); [ChEMBL target CHEMBL213](https://www.ebi.ac.uk/chembl/api/data/target/CHEMBL213.json) | UniProt green; ChEMBL amber/share-alike | Store accession/target mapping with separate attributions. Drug action still routes to label/assay evidence. |
| ADRB2 target identity | [UniProt P07550](https://www.uniprot.org/uniprotkb/P07550/entry); [ChEMBL target CHEMBL210](https://www.ebi.ac.uk/chembl/api/data/target/CHEMBL210.json) | UniProt green; ChEMBL amber/share-alike | Same boundary as ADRB1. |
| ADRB1 condition-bound assay | [activity 18377916](https://www.ebi.ac.uk/chembl/api/data/activity/18377916.json); [assay CHEMBL4145116](https://www.ebi.ac.uk/chembl/api/data/assay/CHEMBL4145116.json) | Amber/share-alike | Optional Reference view only: Kᵢ 11.75 nM, pKᵢ 7.93, with human HEK293T membrane, radioligand displacement and 90-minute context. |
| ADRB2 condition-bound assay | [activity 18377937](https://www.ebi.ac.uk/chembl/api/data/activity/18377937.json); [assay CHEMBL4145115](https://www.ebi.ac.uk/chembl/api/data/assay/CHEMBL4145115.json) | Amber/share-alike | Optional Reference view only: Kᵢ 1.738 nM, pKᵢ 8.76 with full assay context; no universal selectivity claim. |
| DrugCentral cross-reference | [DrugCentral card 2303](https://drugcentral.org/drugcard/2303) | Amber/share-alike | Cross-check only; keep snapshot distinction and exclude WOMBAT-PK potency. |
| 4-hydroxypropranolol identity | [PubChem CID 91565](https://pubchem.ncbi.nlm.nih.gov/compound/91565) | Amber | Structure may be used after identity reviewer confirms mapping to the label claim. |
| 4-hydroxypropranolol activity | [Fitzgerald & O'Donnell 1971, PMID 4400184 / PMCID PMC1665931](https://pubmed.ncbi.nlm.nih.gov/4400184/) | Bibliographic facts green; article rights unknown | Present beta-adrenoceptor-blocking activity only as direct preclinical animal evidence; do not turn it into a human clinical-effect claim. |
| Naphthoxylactic-acid identity | [PubChem CID 115274](https://pubchem.ncbi.nlm.nih.gov/compound/115274) | Amber | Same; source-linked node only. |
| Propranolol-glucuronide identity | [PubChem CID 119515](https://pubchem.ncbi.nlm.nih.gov/compound/119515) | Amber | **Hold structure-level specificity** for conjugation-position/stereo review; text label may remain bounded. |
| Synthesis publication gate | Private review inventory only; no molecule-to-patent mapping is published in this matrix | Hold | Source, route, material and transformation details remain withheld until exact-locator, scientific-review and reuse-rights gates pass. |
| Metoprolol comparator | [PubChem CID 4171](https://pubchem.ncbi.nlm.nih.gov/compound/4171); [DailyMed set 52c822f2-4a71-4ab2-a470-58074622846a](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=52c822f2-4a71-4ab2-a470-58074622846a) | PubChem/DailyMed amber | Structure/action comparison only with separately anchored form/route; no clinical rank. |
| Atenolol comparator | [PubChem CID 2249](https://pubchem.ncbi.nlm.nih.gov/compound/2249); [DailyMed set db801706-1362-44c7-92ab-f584f96c7e1c](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=db801706-1362-44c7-92ab-f584f96c7e1c) | PubChem/DailyMed amber | Same boundary. |

**Propranolol holds:** no sourced healthy-adult oral clearance value; no inferred glucuronide position/stereo; no potency/selectivity statement without exact assay conditions; no comparator “better” claim.

## Celecoxib claim routes

**Anchored form/route:** neutral celecoxib parent; oral CELEBREX capsule. Current FDA label revision controls; the DailyMed/openFDA record below is stale secondary evidence.

| Claim group | Direct source route and record | Reuse | Public-data decision |
|---|---|---|---|
| Current label, mechanism, capsule PK/metabolism | [FDA label NDA 020998/S-058, revised 2024-11](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/020998s058lbl.pdf), PDF reference `5482829` | Green facts / amber complete document | Paraphrase condition-bound facts; retain application/supplement/revision; no embedded brand art. |
| Stale secondary SPL | [DailyMed set 8d52185d-421f-4e34-8db7-f7676db2a226](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8d52185d-421f-4e34-8db7-f7676db2a226); [openFDA exact-set JSON](https://api.fda.gov/drug/label.json?search=openfda.spl_set_id:%228d52185d-421f-4e34-8db7-f7676db2a226%22&limit=1), effective 2021-04-15 | DailyMed amber; openFDA green | Keep a visible `stale-secondary` state; never silently override the 2024 FDA label. |
| INN | [WHO Recommended INN List 42](https://cdn.who.int/media/docs/default-source/international-nonproprietary-names-%28inn%29/rl42.pdf) | Amber | Store and cite the name fact; do not redistribute the PDF. Preserve the list number and retrieval date if WHO later redirects the media path. |
| Identity/connectivity | [PubChem CID 2662](https://pubchem.ncbi.nlm.nih.gov/compound/2662); [ChEBI 41423](https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:41423) | PubChem amber; ChEBI green | Store separately attributed identity fields. |
| 2D / computed 3D | [PubChem CID 2662 PUG record](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2662/record/JSON) | Amber | Label conformer as computed; preserve CID/InChIKey validation. |
| PTGS2/COX-2 target identity | [UniProt P35354](https://www.uniprot.org/uniprotkb/P35354/entry); [ChEMBL target CHEMBL230](https://www.ebi.ac.uk/chembl/api/data/target/CHEMBL230.json) | UniProt green; ChEMBL amber/share-alike | Target identity plus separate label/activity support; never “COX-2 only”. |
| Condition-bound COX-2 assay | [activity 1192793](https://www.ebi.ac.uk/chembl/api/data/activity/1192793.json); [assay CHEMBL763093](https://www.ebi.ac.uk/chembl/api/data/assay/CHEMBL763093.json); [document CHEMBL1130002](https://www.ebi.ac.uk/chembl/api/data/document/CHEMBL1130002.json) | Amber/share-alike | Optional Reference-only recombinant human COX-2 IC50 40 nM / pChEMBL 7.40 with exact context. |
| Original discovery literature | [DOI 10.1021/jm960803q / PMID 9135032](https://pubmed.ncbi.nlm.nih.gov/9135032/) | Amber; publisher rights apply | Original paraphrase plus PMID/DOI; do not copy figures, tables, abstract or scheme. |
| Human mass-balance context | [PMID 10681375](https://pubmed.ncbi.nlm.nih.gov/10681375/) | Amber; article-specific rights | Bounded paraphrase and citation only; do not import tables/figures. |
| DrugCentral cross-reference | [DrugCentral card 568](https://drugcentral.org/drugcard/568) | Amber/share-alike | Cross-check only; snapshot/release noted; exclude restricted embedded potency. |
| Hydroxycelecoxib identity | [PubChem CID 9908776](https://pubchem.ncbi.nlm.nih.gov/compound/9908776) | Amber | Reviewer-confirmed metabolite node. |
| Carboxycelecoxib identity | [PubChem CID 10047220](https://pubchem.ncbi.nlm.nih.gov/compound/10047220) | Amber | Reviewer-confirmed metabolite node. |
| Glucuronide identity candidates | [PubChem CID 10415951](https://pubchem.ncbi.nlm.nih.gov/compound/10415951); [CID 169502284](https://pubchem.ncbi.nlm.nih.gov/compound/169502284) | Amber | **Hold both** until a reviewer resolves the conjugate identity. Exclude CID 131770042 as an incorrect mapping. |
| Synthesis publication gate | Private review inventory only; no molecule-to-patent mapping is published in this matrix | Hold | Source, route, material and transformation details remain withheld until exact-locator, scientific-review and reuse-rights gates pass. |
| Valdecoxib comparator | [PubChem CID 119607](https://pubchem.ncbi.nlm.nih.gov/compound/119607); [Drugs@FDA NDA 021341](https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=021341); [Federal Register withdrawal notice, FR Doc. 2013-18657](https://www.govinfo.gov/content/pkg/FR-2013-08-02/pdf/2013-18657.pdf) | PubChem amber; FDA/GovInfo facts green | Drugs@FDA supplies the application/discontinued-status context; the Federal Register notice directly supports formal approval withdrawal. No class rank. |
| Rofecoxib comparator | [PubChem CID 5090](https://pubchem.ncbi.nlm.nih.gov/compound/5090); [Drugs@FDA NDA 021042](https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=021042); [Federal Register withdrawal notice, FR Doc. 2022-19740](https://www.govinfo.gov/content/pkg/FR-2022-09-13/pdf/2022-19740.pdf) | PubChem amber; FDA/GovInfo facts green | Same boundary: formal approval withdrawal resolves only through the direct Federal Register notice. |

**Celecoxib holds:** absolute oral bioavailability stays `null`; glucuronide CID stays unresolved; stale DailyMed/openFDA claims cannot outrank the 2024 FDA label; assay values do not become clinical selectivity; withdrawn comparators cannot support superiority claims.

## Omeprazole claim routes

**Anchored form/route:** racemic free-parent molecular identity; delayed-release oral capsule 10/20/40 mg for journey/ADME. Magnesium and sodium records remain separate.

| Claim group | Direct source route and record | Reuse | Public-data decision |
|---|---|---|---|
| Product form, mechanism, delayed-release oral PK/metabolism | [DailyMed set 92201fb1-4570-42db-8da3-3b8c0e291d32](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=92201fb1-4570-42db-8da3-3b8c0e291d32), SPL `e786b865-dc62-4018-9cb1-7056b7ca2cde`, v50, effective 2023-04-21, ANDA 075410, UNII `KG60484QX9`; [openFDA exact-set JSON](https://api.fda.gov/drug/label.json?search=openfda.spl_set_id:%2292201fb1-4570-42db-8da3-3b8c0e291d32%22&limit=1), dataset observed updated 2026-08-22 | DailyMed amber; openFDA green | Retain product effective date separately from API dataset update. Paraphrase route/form claims; no package art. |
| Parent identity/connectivity | [PubChem CID 4594](https://pubchem.ncbi.nlm.nih.gov/compound/4594); [ChEBI 7772](https://www.ebi.ac.uk/chebi/CHEBI%3A7772) | PubChem amber; ChEBI green | Store formula/MW/InChIKey and racemate context with separate provenance. |
| Magnesium form | [PubChem CID 130564](https://pubchem.ncbi.nlm.nih.gov/compound/130564) | Amber | Separate form node only; no PK import into the free-parent delayed-release dossier. |
| Sodium form | [PubChem CID 10959536](https://pubchem.ncbi.nlm.nih.gov/compound/10959536) | Amber | Same boundary. |
| 2D / computed 3D | [PubChem CID 4594 PUG record](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/4594/record/JSON) | Amber | 2D usable with provenance; computed 3D is not a verified racemate/bioactive conformer. |
| ATP4A target identity | [UniProt P20648](https://www.uniprot.org/uniprotkb/P20648/entry) | Green/CC BY 4.0 | Human target identity; action/mechanism still routes to label/literature. |
| Acid activation / covalent pump mechanism | [PMID 9593713](https://pubmed.ncbi.nlm.nih.gov/9593713/) and anchored label | Amber for paper; label as above | Original bounded explanation with citation; no copied scheme, universal IC50 or unreviewed cysteine map. |
| CYP2C19 metabolism | [PMID 8894508](https://pubmed.ncbi.nlm.nih.gov/8894508/) and label | Amber for paper | Paraphrase source-qualified pathway; preserve study/context. |
| CYP2C19/CYP3A4 contribution | [PMID 10901708](https://pubmed.ncbi.nlm.nih.gov/10901708/) and label | Amber for paper | Same; no universal enzyme ranking detached from conditions. |
| Human mass balance/excretion | [PMID 2566473](https://pubmed.ncbi.nlm.nih.gov/2566473/) | Amber for article | Cite and paraphrase the radiolabel context; no table/figure copying. |
| 5′-hydroxyomeprazole identity | [PubChem CID 119560](https://pubchem.ncbi.nlm.nih.gov/compound/119560) | Amber | Structure node after identity review. |
| Omeprazole sulfone identity | [PubChem CID 145900](https://pubchem.ncbi.nlm.nih.gov/compound/145900) | Amber | Structure node after identity review. |
| Omeprazole sulfide identity | [PubChem CID 155794](https://pubchem.ncbi.nlm.nih.gov/compound/155794) | Amber | Structure node after identity review. |
| Activation-product candidates | [PubChem CID 5311467](https://pubchem.ncbi.nlm.nih.gov/compound/5311467); [CID 130512](https://pubchem.ncbi.nlm.nih.gov/compound/130512) | Amber | **Hold** structure identities/animation until mechanism and chemical-identity review. |
| Nomenclature/tautomer conflict | Label, [PubChem 4594](https://pubchem.ncbi.nlm.nih.gov/compound/4594), [ChEBI 7772](https://www.ebi.ac.uk/chebi/CHEBI%3A7772), [PMID 16261509](https://pubmed.ncbi.nlm.nih.gov/16261509/) | Mixed green/amber | Preserve `5-methoxy`, PubChem-computed `6-methoxy` and ChEBI `rac-5` as source-specific forms. No silent adjudication. |
| Open omeprazole literature context | [PMC7500594](https://pmc.ncbi.nlm.nih.gov/articles/PMC7500594/) | Green/CC0 for article-owned content | Use only directly relevant, cited claims; inspect third-party credits before any figure reuse. |
| Synthesis publication gate | Private review inventory only; no molecule-to-patent mapping is published in this matrix | Hold | Source, route, material and transformation details remain withheld until exact-locator, scientific-review and reuse-rights gates pass. |
| Esomeprazole comparator | [PubChem CID 9568614](https://pubchem.ncbi.nlm.nih.gov/compound/9568614) | Amber | Enantiomer/structure comparison after stereo review; no efficacy/safety rank. |
| Lansoprazole comparator | [PubChem CID 3883](https://pubchem.ncbi.nlm.nih.gov/compound/3883) | Amber | Scaffold/group comparison only unless a separate direct label supports another claim. |
| Pantoprazole comparator | [PubChem CID 4679](https://pubchem.ncbi.nlm.nih.gov/compound/4679) | Amber | Same boundary. |

**Omeprazole holds:** no label-supported volume of distribution; no activation-product structure/animation before expert review; unresolved carboxylic metabolite stays text-only; no 3D-racemate assertion; no source-conflict erasure in nomenclature; no specific cysteine map, potency estimate or cross-PPI ranking.

## Claim-to-view publication gate

| View | Permitted source-backed state | Additional constraint |
|---|---|---|
| **Student** | Reviewed explanatory claim with a resolvable source icon | No raw enums, unqualified assay numbers, operational synthesis steps or clinical recommendation language. |
| **Reference** | Reviewed measurements with route/form, dose, population, conditions, units and exact locator | ShareAlike/source notices remain available; missing values are explicit; computed/source fields are distinct. |
| **Reviewer** | Raw status, locator, revision, retrieval timestamp/hash, licence bucket and audit fields | Authenticated/authorised surface only; a Reviewer decision cannot erase the original source state. |

Every import record must retain at least `source_id`, `direct_url`, `record_or_revision`, `source_effective_date` where available, `retrieved_at=2026-08-25` for this assessment snapshot (or the actual later import time), `content_hash`, `claim_scope`, `route`, `form`, `locale`, `licence_bucket`, `review_state` and `reviewer_decision`. A redirect, live-card update or API dataset refresh must not silently mutate an already reviewed claim.

## Final implementation decision

- **Propranolol: GO**, with oral hydrochloride tablet context, clearance and conjugate/stereo holds; release type remains unassigned.
- **Celecoxib: GO**, with the 2024 FDA label as authority, absolute-bioavailability and glucuronide holds, and stale DailyMed evidence visibly secondary.
- **Omeprazole: GO**, with delayed-release capsule context, activation/nomenclature review gates and no volume-of-distribution estimate.
- **Fallback: not activated.** None of the three candidates fails the required chain. Declared gaps remain gaps instead of being filled from a weaker, restricted or differently scoped source.
