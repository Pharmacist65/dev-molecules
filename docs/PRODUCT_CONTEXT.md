# Dev Molecules — Product Context

## Product decision

Dev Molecules is a desktop-first interactive pharmaceutical molecular learning and research platform. Its north star is not a limited molecule demo: it is a connected environment where approved medicines can be explored, synthesis logic can be learned, structures can be built locally, scientific evidence can be evaluated, and instructors can run coursework.

The initial small data slice is an implementation and validation seed only. It is **not the final catalog, final curriculum, or final product scope**. The architecture and content model must support expansion from the seed to the full approved small-molecule universe and, later, separately modelled therapeutic modalities.

## North-star experience

Explore, Learn, Build, Teach, and Discover remain five product jobs, but they are no longer five equal primary tabs. The current information architecture is Home / Drug Atlas / Academy / Lab, with Instructor and Reviewer as secondary workspaces:

1. **Explore — Home and Drug Atlas:** find any indexed record in Browse, then optionally move into the bounded Spatial Atlas, a curated dossier, or a learning route.
2. **Learn — Academy:** move through an eight-module learning map, the interactive Nomenclature Academy, and a source-gated Synthesis Atlas.
3. **Build — Lab:** use the route-lazy Ketcher 2D editor, inspect exact static-catalog identity, and export a device-local project deliberately.
4. **Teach — Instructor Studio:** compose local lesson packages from real nomenclature and synthesis task IDs and, when a local progress snapshot exists, export a local summary.
5. **Discover — Lab evidence and future Research Sandbox:** inspect curated local evidence today. Private research generation remains unavailable until authentication, private persistence, quota, consent, and audit exist.

Reviewer Console is not one of those learner presentation modes. It is a separate scientific authorization domain and remains locked on the public host without an injected authentication- and audit-backed adapter.

The long-term content universe begins with approved small-molecule active ingredients. Peptides, oligonucleotides, proteins, antibodies, natural products and other modalities may be added later as separate identity universes; they must not be collapsed into the small-molecule model.

## Users and their primary jobs

- **Pharmacy student:** connect structure with drug class, mechanism, metabolism and therapeutic context.
- **Pharmaceutical or medicinal chemistry student:** understand scaffolds, stereochemistry, synthesis transformations and structure–activity reasoning.
- **Biochemistry student:** connect ligands with targets, structures, pathways and molecular interactions.
- **Instructor:** deliver trustworthy interactive material and assess conceptual learning without recreating every activity.
- **Researcher:** inspect analog and evidence context while keeping unpublished structures private by default.
- **Scientific reviewer:** approve, correct, demote and trace claims, routes and learning content.

## Product principles

- Scientific meaning takes priority over visual spectacle.
- Spatial proximity always states the selected lens; it is never presented as universal similarity.
- A computed conformer, experimental bound pose, model-generated pose and user-edited conformation are visibly distinct.
- A literature route, patent route, simplified teaching route and AI-proposed route are visibly distinct.
- A molecular entity, stereoisomer, salt/solvate/ester, active ingredient, commercial product and jurisdictional approval record are separate identities.
- Game scoring measures learning performance, not whether a molecule is a good medicine.
- “Not found” never means new, patentable, safe, effective or synthesizable.
- Every scientific claim exposes provenance, evidence class, review status and uncertainty.
- User-created molecules are private by default and are not used for model training without explicit opt-in.
- Student is the shared public science presentation; Expert currently changes only curated Drug Dossiers to open in Reference mode by default. Reviewer access is a separate authorization boundary, never an Expert alias.

## First vertical slice

The current slice proves the product loop with a source-versioned approved-list catalog and a bounded browser-resident working set. Its implementation includes:

- 15 curated regression fixtures plus an all-row evaluation of the selected 2,331-row DrugCentral FDA list: 1,858 complete same-ID source structures, 1,747 exact PubChem resolutions, 1,552 imported 2D/3D pairs, and 779 explicit unresolved rows;
- categorical therapeutic, target, and scaffold lenses plus a scoped structural-similarity lens, a bounded resident Explore window, and lazy structure-index search across all 1,552 imported records;
- a Home / Drug Atlas / Academy / Lab shell with Student presentation and a Dossier-only Expert default preference;
- Browse over the 1,552 imported structure records in the checked snapshot, an optional representative Spatial Atlas, and a deep-Dossier seed limited to the 15 curated records;
- Story and Reference dossier modes with independent coverage indicators; reviewed target interactions, quantitative ADME fields, and reviewed metabolite edges are currently unavailable;
- six source-gated Synthesis Atlas routes over three molecules, with 20 transformations and 12 mechanism records; only two reported routes meet the strict direct-source-reported presentation gate;
- an eight-module Academy map plus an eight-section, 22-exercise Nomenclature Academy over 20 parseable structures and 16 concrete response/widget types;
- five guided missions covering recognition, scaffold building, repair, synthesis ordering and evidence reading;
- an on-device Ketcher 3.17.2 editor with exact static-catalog matching and opt-in local JSON export, not a research-grade cloud sketching suite;
- curated local evidence cards with public model generation disabled;
- a device-local Instructor package composer and conditional local progress export, without learner accounts, delivery, LMS integration, or server analytics;
- a fail-closed Reviewer Console contract that has no public adapter.

The slice is successful only if users understand why molecules are related, can complete the learning loop, and can distinguish evidence from prediction. Current counts must never leak into product copy or schemas as permanent limits, and DrugCentral FDA-list membership must not be presented as an exact FDA application/product catalog.

## Explicit non-goals for the first slice

- claiming autonomous drug discovery;
- displaying every approved medicine before the identity model is stable;
- predicting efficacy, safety, patentability or real-world synthesizability;
- full docking, molecular dynamics or laboratory execution guidance;
- full institution administration, LMS integration or procurement workflows;
- biologics and small molecules in one identity layer;
- public sharing of unpublished user structures;
- replacing qualified scientific review with an LLM.

## Product success

North-star success is repeat use in real teaching and research workflows, not molecule count or visual novelty. Early evidence should include task completion, learning gain, reduced misconceptions, repeat sessions, instructor preparation time and willingness to run another course activity. Expansion follows validated use and scientific throughput, not the availability of more raw records.
