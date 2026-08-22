# Competitive Benchmark

Research date: 2026-08-23

This benchmark uses public, official product pages and repositories. It is a
capability and user-job comparison, not an independent validation of scientific
accuracy, performance, accessibility, or proprietary implementation. Dev
Molecules must not copy names, copy, screens, assets, or proprietary behavior.

Official references:

- [MolecuLens App Store listing](https://apps.apple.com/us/app/moleculens/id6757090293)
- [MolAtlas official GitHub repository](https://github.com/molecule-generator-collection/MolAtlas)
- [MolScope official PyPI project](https://pypi.org/project/molscope/)
- [MolVerse official site](https://molverse.tech/)

## MolecuLens

Classification: **direct user-experience and molecular-learning benchmark**.

| Field | Assessment |
| --- | --- |
| Product type | Native iPhone/iPad education app described as a “3D Molecule Explorer.” |
| Target users | Organic-chemistry students, biochemistry learners, educators, and science communicators. |
| Core user jobs | Find a molecule quickly, move between 2D and 3D, highlight meaningful structural regions, follow a guided explanation, answer a quiz, and create a shareable figure. |
| Search and input methods | The official listing names common-name, SMILES, formula, PubChem CID, coordination-notation, and drawing input. It claims access to 100M+ PubChem compounds; that is provider reach, not a local curated catalog. InChIKey and arbitrary file-import support are not established by the cited page. |
| 2D capabilities | Interactive 2D structures and Lens highlighting of functional groups, rings, and key regions are claimed. Atom-map continuity details are not published. |
| 3D capabilities | Interactive 3D, conformer generation when no 3D record exists, transition-metal support, and paid orbital overlays are claimed. The listing does not publish conformer-method provenance requirements. |
| Analysis capabilities | The listing refers to molecular analytics used to ground quizzes, but does not publish a descriptor schema, validation protocol, uncertainty model, or analysis API. |
| Educational capabilities | AI-guided molecular tours, molecular stories, and structure-grounded quizzes are central product jobs. |
| AI capabilities | AI narration, tour generation, quizzes, and diagram generation are claimed. Public claim/source-retention behavior is not specified on the listing. |
| Export capabilities | Shareable figures and high-quality molecular diagram generation are claimed. Exact PNG/SVG, transparency, resolution, citation-layer, and comparison-export guarantees are not stated on the cited page. |
| Mobile/touch quality | Native iPhone and iPad support is explicit. Apple’s listing says the developer has not declared supported accessibility features; that is not evidence that none exist. |
| Scientific limitations | The official listing does not expose method/tool/version, uncertainty, citation-retention, orbital-backend, or validation details sufficient for Dev Molecules’ evidence rules. Marketing claims are not treated as scientific verification. |
| What Dev Molecules should match | Immediate search-to-molecule flow; direct 2D/3D manipulation; obvious group selection; guided, structure-grounded learning; touch-first quality; useful figure output. |
| What Dev Molecules should deliberately not copy | Visual identity, subscription/product copy, unsourced AI behavior, and any orbital or conformer overlay without method-level provenance. |
| What Dev Molecules must exceed | Connected pharmaceutical meaning: drug/form identity, properties, class, target, ADME, metabolites, synthesis, nomenclature, comparisons, learning, and expert sources without losing molecule identity. AI must retain eligible claim and source IDs. |

Source basis: the [official App Store description](https://apps.apple.com/us/app/moleculens/id6757090293)
explicitly describes interactive 2D/3D viewing, Lens highlighting, PubChem-backed
search, drawing, AI tours/quizzes, and paid orbital overlays. Capabilities not
stated there remain unknown rather than inferred.

## MolAtlas

Classification: **molecular-property-space analytics benchmark**.

| Field | Assessment |
| --- | --- |
| Product type | MIT-licensed Python visualization framework and reproducible CLI/notebook workflow for molecular-property distributions. |
| Target users | Researchers and molecule designers comparing a candidate with large reference distributions. |
| Core user jobs | Compute per-property percentiles; locate a molecule on a two-property density map; compare distributions; generate analytical figures and JSON output. |
| Search and input methods | YAML/CLI numeric property input and configured reference databases, not a consumer molecule search product. The repository documents ZINC, PubChem, GDB, and combined reference choices. |
| 2D capabilities | “2D” means a two-property KDE/density map, not an interactive 2D chemical editor or structure viewer. |
| 3D capabilities | No interactive molecular 3D viewer is documented in the official repository overview. |
| Analysis capabilities | One-dimensional property distributions return per-property percentiles; two-dimensional KDE maps return density-percentile context. The documented property set includes molecular weight plus quantum, energetic, vibrational, optical, and charge-related fields. |
| Educational capabilities | Reproducible examples and a Colab workflow support learning the analysis, but it is not a guided pharmaceutical curriculum. |
| AI capabilities | No AI feature is documented in the official repository overview. |
| Export capabilities | The CLI saves radar-chart and KDE figures and can return JSON. Large KDE models are hosted separately on Zenodo. |
| Mobile/touch quality | Colab may be browser-accessible, but the repository does not establish native mobile/touch interaction quality. |
| Scientific limitations | The workflow analyzes supplied values against configured distributions; it does not itself establish that an input property is experimentally valid, clinically meaningful, or favorable. A percentile is context, not a quality/safety/efficacy score. |
| What Dev Molecules should match | Reproducible percentile calculation, selectable reference cohorts, two-property distribution maps, explicit density context, filters, legends, and analytical exports. |
| What Dev Molecules should deliberately not copy | Raw research-CLI interaction in Student UI, radar charts as decoration, or a “central percentile is better” implication. |
| What Dev Molecules must exceed | Pharmaceutical cohorts (all approved drugs, pharmacological family, ATC family, selected set), provenance-rich property observations, conditions and uncertainty, plus explanations tied to dossier, ADME, SAR, and learning context. |

Source basis: the [official MolAtlas repository](https://github.com/molecule-generator-collection/MolAtlas)
documents per-property percentiles, two-property KDE maps, JSON/figure output,
and separate reference-data artifacts. Dev Molecules uses those as analytical
principles, not as a claim that a radar chart alone provides parity.

## MolScope

Classification: **expert analysis/tooling and interoperability benchmark**.

| Field | Assessment |
| --- | --- |
| Product type | MIT-licensed Python library/CLI with optional adapters for molecular structure analysis, visualization, graph/ML export, and MCP access. |
| Target users | Students, computational scientists, structural biologists, and ML-for-molecules prototypers who work with structure files and reproducible analysis. |
| Core user jobs | Read structures, inspect atoms/residues, measure geometry, run QC, create descriptors/contact maps/graphs, inspect binding sites, triage docking outputs, and export interoperable artifacts. |
| Search and input methods | Reads XYZ, PDB, mmCIF/CIF, and SDF; can fetch RCSB records and build from SMILES. MOL/MOL2 are not claimed by the cited PyPI overview and therefore remain future Dev Molecules adapters, not inferred parity. |
| 2D capabilities | Contact maps, plots, and graph outputs are documented; it is not positioned as a polished student-first 2D chemical editor. |
| 3D capabilities | Structure plotting/viewing with optional py3Dmol, selections, geometry, proteins, ensembles, and coarse-grained views. |
| Analysis capabilities | Summary/bounding box, distances, angles, torsions, RMSD, descriptors, QC, contact maps, binding sites, secondary structure, molecular graphs, coarse graining, dataset tooling, and docking-result triage. |
| Educational capabilities | Explicitly designed in part for teaching and exploratory analysis, with tutorials and examples; it is tooling rather than a connected pharmaceutical lesson system. |
| AI capabilities | An optional MCP server exposes public analysis APIs as tools. Its documentation explicitly says this “adds no new science,” an important boundary for Dev Molecules adapters. |
| Export capabilities | PNG/GIF visualization, descriptor tables, graph outputs (including NetworkX/PyG/DGL), coarse-grained coordinates, and docking reports are documented. |
| Mobile/touch quality | Python/CLI and optional browser visualization; no native touch-first student application quality is established by the official project page. |
| Scientific limitations | The project explicitly says it is not a replacement for full simulation or full cheminformatics stacks, distinguishes lightweight features from method backends, and documents that coarse graining is not a validated force-field model. Docking triage is not efficacy or binding proof. |
| What Dev Molecules should match | Reproducible geometry, structure summaries and QC, descriptors, provenance-preserving file adapters, selected-substructure/graph export, contact/binding-site adapter boundaries, and graceful failure when optional backends are absent. |
| What Dev Molecules should deliberately not copy | Python runtime in the public browser, CLI complexity in Student UI, or labels suggesting lightweight analysis is molecular simulation. |
| What Dev Molecules must exceed | Progressive Student/Expert presentation, pharmaceutical relevance, typed source resolution, direct links into dossiers/families/lessons, and strict separation of docking rank from biological proof. |

Source basis: the [official MolScope PyPI page](https://pypi.org/project/molscope/)
documents formats, optional backends, analysis/export surface, validation notes,
MCP integration, and explicit scope limits.

## MolVerse

Classification: **structural-biology and target-context vision benchmark**, not
a direct web-app feature checklist.

| Field | Assessment |
| --- | --- |
| Product type | Structural-biology and molecular-characterization company/service vision, not a public molecule-explorer application. |
| Target users | Biochemists, cell biologists, pharmaceutical researchers, drug developers, life-science organizations, hospitals, and vaccinology teams. |
| Core user jobs | Obtain and interpret biomolecular/macromolecular structures, characterize complexes and interactions, and connect structural insights to discovery programs. |
| Search and input methods | No public end-user molecule-search workflow is established by the official site. |
| 2D capabilities | No public 2D chemical-editing workflow is established. |
| 3D capabilities | The site emphasizes 3D reconstruction, visualization, conformational heterogeneity, electron-density maps, native biomolecular architectures, and macromolecular complexes. These are service/technology claims, not Dev Molecules app features. |
| Analysis capabilities | Structural characterization and biological/pathway interpretation are emphasized. The public page does not provide an app API/schema that Dev Molecules can claim to match. |
| Educational capabilities | Scientific explanation is present, but no structured public learning product is established. |
| AI capabilities | The site describes machine-learning-supported drug discovery and responsible/unbiased AI goals; it does not establish a public guided-tour or quiz product. |
| Export capabilities | No end-user figure/data export contract is established on the cited public site. |
| Mobile/touch quality | No public mobile application benchmark is established. |
| Scientific limitations | Public marketing language does not by itself provide record-level methods, validation, provenance, uncertainty, or a reusable software interface. Dev Molecules must not claim cryo-EM, experimental structure determination, kinetics, thermodynamics, multi-omics, or screening capability. |
| What Dev Molecules should match | The conceptual shift from an isolated ligand to target, pocket, residues, interaction types, protein family, and pathway context when eligible experimental records exist. |
| What Dev Molecules should deliberately not copy | Company claims, experimental-service language, or any suggestion that a web viewer performs structure determination or experimental screening. |
| What Dev Molecules must exceed | Record-level PDB/source resolution; experimental-versus-predicted labeling; fail-closed ligand-pose eligibility; a replaceable viewer adapter; and a learner pathway connecting the complex back to drug chemistry, pharmacology, ADME, synthesis, and nomenclature. |

Source basis: the [official MolVerse site](https://molverse.tech/) describes
structural-biology, macromolecular reconstruction, characterization, and drug
discovery services. It is used only as a target-context vision reference.

## Product boundary adopted from the benchmark

Dev Molecules now treats two scopes as different products sharing identity
bridges:

1. **Curated Drug Atlas** — approved small-molecule active ingredients with
   pharmaceutical identity, form relationships, classifications, targets,
   ADME, metabolites, synthesis, nomenclature, review, and learning coverage
   only where the required evidence exists.
2. **Universal Molecule Lookup** — on-demand provider identity and structure
   lookup by supported query types. It uses an adapter and bounded cache; it
   does not download PubChem wholesale and cannot inherit drug approval,
   indication, ADME, pharmacology, or synthesis fields.

The benchmark outcome is not “copy all competitor features.” It is to preserve
fast molecular exploration while making every pharmaceutical connection,
scientific computation, experimental complex, and generated explanation
traceable and honestly unavailable when its eligibility gate fails.
