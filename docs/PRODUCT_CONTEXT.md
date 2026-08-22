# Dev Molecules — Product Context

## Product decision

Dev Molecules is a desktop-first interactive pharmaceutical molecular learning and research platform. Its north star is not a limited molecule demo: it is a connected environment where approved medicines can be explored, synthesis logic can be learned, structures can be built through guided and expert workflows, scientific evidence can be evaluated, and instructors can run coursework.

The initial small data slice is an implementation and validation seed only. It is **not the final catalog, final curriculum, or final product scope**. The architecture and content model must support expansion from the seed to the full approved small-molecule universe and, later, separately modelled therapeutic modalities.

## North-star experience

The complete platform preserves five distinct modes:

1. **Explore — Molecular Universe:** navigate medicines through therapeutic class, scaffold, target, mechanism, approval era, origin, metabolite and structural-similarity lenses.
2. **Learn — Synthesis Atlas and Nomenclature Academy:** move from a structure-backed route graph to transformation and mechanism reasoning, then practise an eight-section naming curriculum through deterministic, explanatory exercises.
3. **Build — Molecule Workbench:** use a guided fragment builder for learners and a precise 2D editor with live 3D preview for advanced users.
4. **Teach — Instructor Studio:** create courses, missions and assessments; assign work; review misconceptions and learner progress.
5. **Discover — Research Sandbox:** privately compare user designs with known identities, analogs, synthesis evidence and biological evidence. This mode remains experimental and visually separate from verified education content.

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
- Student Mode is the default learning hierarchy; Reviewer Mode keeps provenance and review controls secondary without changing scientific state.

## First vertical slice

The first slice proves the complete product loop with a source-versioned approved-list catalog and a bounded browser-resident working set. Its current implementation includes:

- 15 curated regression fixtures plus an all-row evaluation of the selected 2,331-row DrugCentral FDA list: 1,858 complete same-ID source structures, 1,747 exact PubChem resolutions, 1,552 imported 2D/3D pairs, and 779 explicit unresolved rows;
- categorical therapeutic, target, and scaffold lenses plus a scoped structural-similarity lens, a bounded resident Explore window, and lazy full-index search across all 1,552 imported records;
- a consistent student Molecule Passport with 2D and 3D views;
- six source-gated Synthesis Atlas routes over three molecules;
- an eight-section, 22-exercise Nomenclature Academy over 20 parseable structures and 16 concrete response/widget types;
- five guided missions covering recognition, scaffold building, repair, synthesis ordering and evidence reading;
- a guided builder, not yet a full research-grade sketching suite;
- structured example AI evidence cards before open-ended AI answers;
- a simple device-local learner progress summary; instructor export remains a planned capability.

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
