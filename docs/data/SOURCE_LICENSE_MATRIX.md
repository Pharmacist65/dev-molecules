# Scientific source and license matrix

Reviewed: 2026-08-23. This matrix records the public-build decision, not only whether a source can be queried.

| Source | Intended use | License / official policy | Public-build decision | Current status |
| --- | --- | --- | --- | --- |
| DrugCentral | Approved-drug identities and future target snapshot | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Bundle versioned derived data with attribution and share-alike notice. | Identity snapshot enabled; target snapshot not present. |
| PubChem / NCBI | Exact identity, calculated properties, 2D/3D structures | [NCBI database policy](https://www.ncbi.nlm.nih.gov/home/about/policies/) | The public prototype bundles exact SDF source records with CID/request/digest provenance and a policy notice. This project-level distribution decision does not represent that NCBI cleared rights in third-party submissions. | Existing structure pipeline enabled; submitter-rights uncertainty remains an explicit limitation. |
| ChEMBL | Bioactivity and assay context | [ChEMBL CC BY-SA 3.0](https://www.ebi.ac.uk/chembl/) | A numbered release may be bundled with attribution/share-alike and full assay context. | Adapter policy only; no snapshot. |
| IUPHAR/BPS Guide to PHARMACOLOGY | Approved-drug targets and curated interactions | [ODbL database and CC BY-SA 4.0 contents](https://www.guidetopharmacology.org/download.jsp) | Use a numbered build-time download; preserve attribution/share-alike. Browser-time bulk access is prohibited. | Adapter policy only; API is moving to registered key access. |
| DailyMed | SPL source locators and label sections | [DailyMed overview and disclaimer](https://dailymed.nlm.nih.gov/dailymed/about-dailymed.cfm) | Link to exact SPL versions and retain structured locators; do not copy manufacturer label prose into the public bundle without field-level review. | Link-only policy. |
| openFDA SPL / Drugs@FDA | Product, route, application, and mapped label fields | [Public Domain / CC0, with exceptions](https://open.fda.gov/license/) | Build-time derived fields are allowed; keep export date, disclaimers, and application/SPL identifiers. | Parser foundation exists; enrichment snapshot not present. |
| WHO Collaborating Centre ATC/DDD | Therapeutic hierarchy | [2026 copyright statement](https://atcddd.fhi.no/filearchive/publications/2026_guidelines_for_atc_classification_and_ddd_assignment.pdf) | Do not package, translate, or modify the hierarchy in the public repository until compatible permission or a licensed source is recorded. | Blocked pending rights decision. |
| ClinPGx | Pharmacogenomic annotations | [CC BY-SA 4.0](https://api.clinpgx.org/) | Versioned build-time export with attribution/share-alike; never present as direct diagnostic advice. | Adapter policy only; no snapshot. |
| BindingDB | Binding measurements | [BindingDB-curated data CC BY 4.0](https://www.bindingdb.org/rwd/bind/gkae1075.pdf) | Bundle only covered curated fields with measurement and source context. | Adapter policy only; no snapshot. |

## Release rule

`available through an API` is not the same as `safe to redistribute in a static public application`. An adapter remains disabled until a dated snapshot, deterministic identity join, field-level license decision, provenance record, coverage report, and conflict report exist.

The current [machine-readable readiness report](../../public/catalog/reports/enrichment-readiness.json) enables only the DrugCentral identity/list and PubChem structure policies. PubChem's policy records the artifact's actual full-SDF distribution boundary rather than describing those files as derived fields. It records zero configured enrichment snapshots and zero classification, pharmacology, and ADME enrichment. These zeros are an intentional fail-closed release result, not missing documentation.
