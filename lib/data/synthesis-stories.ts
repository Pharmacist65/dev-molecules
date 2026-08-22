import type { SourceId, SynthesisStory } from "../domain";

const RETRIEVED_AT = "2026-08-22";

const safetyNote =
  "This educational story omits quantities, apparatus, conditions, work-up and operational laboratory instructions. It is a structural reading of a cited source, not a synthesis protocol.";

const sourceSupported = (note: string) => ({
  status: "source-supported" as const,
  note,
  reviewedBy: "Dev Molecules primary-source audit",
  reviewedAt: RETRIEVED_AT,
});

const pendingExpertReview = (scope: string) => ({
  status: "source-audited-pending-expert-review" as const,
  scope,
  auditedBy: "Dev Molecules primary-source audit",
  auditedAt: RETRIEVED_AT,
});

const patentSource = {
  propranolol: "source:patent-us3337628a",
  atenolol: "source:patent-us3663607a",
  carvedilol: "source:patent-us4503067a",
} as const satisfies Record<string, SourceId>;

export const synthesisStories: readonly SynthesisStory[] = [
  {
    id: "synthesis:propranolol-educational-scaffold",
    version: "2.1.0",
    moleculeId: "molecule:propranolol",
    title: "Propranolol: source-reported epoxide opening",
    routeType: "patent-reported",
    intent: "educational",
    summary:
      "A source-anchored reading of the bond changes that connect a naphthoxy epoxide and isopropylamine to propranolol connectivity.",
    routeExplanation:
      "The cited example starts at a preformed naphthoxy epoxide. The teaching layer follows retention of the naphthoxy ether, formation of the carbon–nitrogen bond and opening of the three-membered oxygen-containing ring. It does not extend the source backward into an uncited preparation of that epoxide.",
    primarySourceAnchors: [
      {
        sourceId: patentSource.propranolol,
        url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3337628",
        locatorKind: "patent-example",
        locator:
          "Example 4: naphthoxy epoxide/isopropylamine paragraph and the immediately following named-product paragraph.",
        supportScope:
          "Supports the reported input pair and the propranolol free-base connectivity; no operational conditions are carried into the teaching story.",
      },
    ],
    startingMaterials: [
      {
        id: "material:propranolol:naphthoxy-epoxide",
        label: "1,2-epoxy-3-(1-naphthoxy)propane",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "C1C(O1)COC2=CC=CC3=CC=CC=C32",
          sourceId: patentSource.propranolol,
        },
      },
      {
        id: "material:propranolol:isopropylamine",
        label: "isopropylamine",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "CC(C)N",
          sourceId: patentSource.propranolol,
        },
      },
    ],
    intermediates: [],
    finalProduct: {
      id: "material:propranolol:free-base",
      label: "propranolol (free-base connectivity)",
      role: "final-product",
      structure: {
        format: "smiles",
        value: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O",
        sourceId: "source:pubchem-4946",
      },
    },
    reactionClasses: [
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistry: {
      sourcePresentation: "not-assigned",
      teachingScope:
        "The cited example does not assign an absolute configuration; this story therefore makes no enantiomer-specific route claim.",
    },
    limitations: [
      "The cited example begins with a preformed epoxide, so its upstream preparation is outside this story.",
      "The atom correspondence is a draft teaching annotation, not a published atom map.",
      "Connectivity does not establish pharmaceutical form, purity, scale or clinical performance.",
    ],
    review: pendingExpertReview(
      "Primary-source identity and locator audited; named synthetic-chemistry review of atom mapping remains required.",
    ),
    steps: [
      {
        id: "synthesis-step:propranolol-01",
        order: 1,
        title: "Set the evidence boundary",
        inputMaterialIds: [
          "material:propranolol:naphthoxy-epoxide",
          "material:propranolol:isopropylamine",
        ],
        outputMaterialId: null,
        inputLabels: [
          "preformed naphthoxy epoxide",
          "isopropylamine",
        ],
        outputLabel: "source-anchored input pair",
        transformationFamily: "source orientation",
        changeSummary:
          "No covalent change is claimed in this frame: the cited example begins with the epoxide already present.",
        learningRationale:
          "A literature story should begin where its cited evidence begins instead of inventing an uncited upstream step.",
        commonMisconception:
          "A familiar precursor does not make its preparation part of the cited route.",
        atomMappingStatus: "not-applicable",
        atomMapping: {
          status: "not-applicable",
          convention: "named-atom-correspondence-v1",
          atoms: [],
          note: "Orientation frame only; mapping starts in the bond-change step.",
        },
        bondChanges: [],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "The starting pair is named in US 3,337,628 A, Example 4.",
        ),
        sourceIds: [patentSource.propranolol],
      },
      {
        id: "synthesis-step:propranolol-02",
        order: 2,
        title: "Open the epoxide with the amine fragment",
        inputMaterialIds: [
          "material:propranolol:naphthoxy-epoxide",
          "material:propranolol:isopropylamine",
        ],
        outputMaterialId: "material:propranolol:free-base",
        inputLabels: [
          "1,2-epoxy-3-(1-naphthoxy)propane",
          "isopropylamine",
        ],
        outputLabel: "propranolol free-base connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond is formed at the epoxide side chain while one ring carbon–oxygen bond is opened, retaining the oxygen as the alcohol oxygen.",
        learningRationale:
          "Follow the three atoms that explain the amino-alcohol motif: the attacked carbon, epoxide oxygen and amine nitrogen.",
        commonMisconception:
          "A correct connectivity map does not assign an enantiomer or reproduce the experimental procedure.",
        atomMappingStatus: "draft",
        atomMapping: {
          status: "draft",
          convention: "named-atom-correspondence-v1",
          atoms: [
            {
              mapId: "map:propranolol:terminal-carbon",
              inputMaterialId: "material:propranolol:naphthoxy-epoxide",
              inputAtomLabel: "terminal epoxide carbon",
              productAtomLabel: "amine-bearing side-chain carbon",
              outcome: "retained",
            },
            {
              mapId: "map:propranolol:epoxide-oxygen",
              inputMaterialId: "material:propranolol:naphthoxy-epoxide",
              inputAtomLabel: "epoxide oxygen",
              productAtomLabel: "alcohol oxygen",
              outcome: "retained",
            },
            {
              mapId: "map:propranolol:amine-nitrogen",
              inputMaterialId: "material:propranolol:isopropylamine",
              inputAtomLabel: "amine nitrogen",
              productAtomLabel: "secondary-amine nitrogen",
              outcome: "retained",
            },
          ],
          note:
            "Named-atom correspondence inferred for teaching and pending expert review; the patent does not publish an atom map.",
        },
        bondChanges: [
          {
            kind: "formed",
            atomMapIds: [
              "map:propranolol:terminal-carbon",
              "map:propranolol:amine-nitrogen",
            ],
            description: "New side-chain carbon–nitrogen bond.",
          },
          {
            kind: "broken",
            atomMapIds: [
              "map:propranolol:terminal-carbon",
              "map:propranolol:epoxide-oxygen",
            ],
            description: "Epoxide ring carbon–oxygen bond opened.",
          },
        ],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "The input pair and named propranolol product are reported in US 3,337,628 A, Example 4; the teaching atom map remains draft.",
        ),
        sourceIds: [patentSource.propranolol],
      },
    ],
    sourceIds: [patentSource.propranolol, "source:pubchem-4946"],
    verification: sourceSupported(
      "The route boundary and named product are supported by US 3,337,628 A, Example 4; expert review of the educational mapping is pending.",
    ),
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
  {
    id: "synthesis:atenolol-educational-scaffold",
    version: "2.1.0",
    moleculeId: "molecule:atenolol",
    title: "Atenolol: para-amide glycidyl ether route",
    routeType: "patent-reported",
    intent: "educational",
    summary:
      "A two-transformation story linking the para-amide phenolic precursor to a glycidyl ether, then to atenolol connectivity.",
    routeExplanation:
      "The cited example identifies both the glycidyl-ether precursor preparation and its conversion with isopropylamine. The teaching view tracks the retained para-amide aromatic region and the two bond changes that reveal the amino-alcohol side chain.",
    primarySourceAnchors: [
      {
        sourceId: patentSource.atenolol,
        url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3663607",
        locatorKind: "patent-example",
        locator:
          "Example 1: named-product paragraph plus the immediately following paragraph beginning the preparation of the epoxypropane starting material.",
        supportScope:
          "Supports the named precursor, glycidyl-ether intermediate, isopropylamine input and atenolol connectivity; no procedure is reproduced.",
      },
    ],
    startingMaterials: [
      {
        id: "material:atenolol:hydroxyphenylacetamide",
        label: "4-hydroxyphenylacetamide",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "C1=CC(=CC=C1CC(=O)N)O",
          sourceId: patentSource.atenolol,
        },
      },
      {
        id: "material:atenolol:epichlorohydrin",
        label: "epichlorohydrin",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "C1C(O1)CCl",
          sourceId: patentSource.atenolol,
        },
      },
      {
        id: "material:atenolol:isopropylamine",
        label: "isopropylamine",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "CC(C)N",
          sourceId: patentSource.atenolol,
        },
      },
    ],
    intermediates: [
      {
        id: "material:atenolol:glycidyl-ether",
        label: "1-p-carbamoylmethylphenoxy-2,3-epoxypropane",
        role: "intermediate",
        structure: {
          format: "smiles",
          value: "C1C(O1)COC2=CC=C(C=C2)CC(=O)N",
          sourceId: patentSource.atenolol,
        },
      },
    ],
    finalProduct: {
      id: "material:atenolol:parent",
      label: "atenolol (parent connectivity)",
      role: "final-product",
      structure: {
        format: "smiles",
        value: "CC(C)NCC(COC1=CC=C(C=C1)CC(=O)N)O",
        sourceId: "source:pubchem-2249",
      },
    },
    reactionClasses: [
      "phenolic O-alkylation / glycidyl-ether formation",
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistry: {
      sourcePresentation: "not-assigned",
      teachingScope:
        "Example 1 does not assign an absolute configuration; the route is taught as connectivity without an enantiomer-specific claim.",
    },
    limitations: [
      "The story paraphrases only transformations and omits all experimental execution details.",
      "The named-atom correspondence is an editorial teaching map pending synthetic-chemistry review.",
      "The route does not establish a marketed pharmaceutical form or comparative performance.",
    ],
    review: pendingExpertReview(
      "Patent locator and compound identities audited; transformation wording and atom mapping await named expert review.",
    ),
    steps: [
      {
        id: "synthesis-step:atenolol-01",
        order: 1,
        title: "Form the para-amide glycidyl ether",
        inputMaterialIds: [
          "material:atenolol:hydroxyphenylacetamide",
          "material:atenolol:epichlorohydrin",
        ],
        outputMaterialId: "material:atenolol:glycidyl-ether",
        inputLabels: ["4-hydroxyphenylacetamide", "epichlorohydrin"],
        outputLabel: "para-amide glycidyl ether intermediate",
        transformationFamily: "phenolic O-alkylation",
        changeSummary:
          "The phenolic oxygen becomes bonded to the glycidyl methylene while the para-amide side chain remains unchanged.",
        learningRationale:
          "Separate the aromatic substitution pattern from the later amino-alcohol-forming event.",
        commonMisconception:
          "The amide group is a retained substituent here; it is not formed during this mapped transformation.",
        atomMappingStatus: "draft",
        atomMapping: {
          status: "draft",
          convention: "named-atom-correspondence-v1",
          atoms: [
            {
              mapId: "map:atenolol:phenolic-oxygen",
              inputMaterialId: "material:atenolol:hydroxyphenylacetamide",
              inputAtomLabel: "phenolic oxygen",
              productAtomLabel: "aryl-ether oxygen",
              outcome: "retained",
            },
            {
              mapId: "map:atenolol:glycidyl-methylene",
              inputMaterialId: "material:atenolol:epichlorohydrin",
              inputAtomLabel: "chloromethyl carbon",
              productAtomLabel: "aryl-ether-linked methylene carbon",
              outcome: "retained",
            },
            {
              mapId: "map:atenolol:chlorine",
              inputMaterialId: "material:atenolol:epichlorohydrin",
              inputAtomLabel: "chlorine",
              productAtomLabel: "not retained in the mapped intermediate",
              outcome: "departed",
            },
          ],
          note:
            "Named-atom correspondence inferred from source structures for teaching; the patent does not publish an atom map.",
        },
        bondChanges: [
          {
            kind: "formed",
            atomMapIds: [
              "map:atenolol:phenolic-oxygen",
              "map:atenolol:glycidyl-methylene",
            ],
            description: "New aryl-oxygen–glycidyl-methylene bond.",
          },
          {
            kind: "broken",
            atomMapIds: [
              "map:atenolol:glycidyl-methylene",
              "map:atenolol:chlorine",
            ],
            description: "The carbon–chlorine bond is absent from the mapped intermediate.",
          },
        ],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "The precursor paragraph following US 3,663,607 A, Example 1 names the inputs and glycidyl-ether intermediate; atom mapping remains draft.",
        ),
        sourceIds: [patentSource.atenolol],
      },
      {
        id: "synthesis-step:atenolol-02",
        order: 2,
        title: "Open the epoxide to reveal the amino alcohol",
        inputMaterialIds: [
          "material:atenolol:glycidyl-ether",
          "material:atenolol:isopropylamine",
        ],
        outputMaterialId: "material:atenolol:parent",
        inputLabels: ["para-amide glycidyl ether", "isopropylamine"],
        outputLabel: "atenolol parent connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond is formed at the glycidyl side chain and one epoxide carbon–oxygen bond is opened, retaining the oxygen as the alcohol oxygen.",
        learningRationale:
          "Track how the same amino-alcohol motif can be installed while a different aromatic substituent is retained.",
        commonMisconception:
          "A shared reaction class does not imply identical selectivity, disposition or clinical use across molecules.",
        atomMappingStatus: "draft",
        atomMapping: {
          status: "draft",
          convention: "named-atom-correspondence-v1",
          atoms: [
            {
              mapId: "map:atenolol:terminal-epoxide-carbon",
              inputMaterialId: "material:atenolol:glycidyl-ether",
              inputAtomLabel: "terminal epoxide carbon",
              productAtomLabel: "amine-bearing side-chain carbon",
              outcome: "retained",
            },
            {
              mapId: "map:atenolol:epoxide-oxygen",
              inputMaterialId: "material:atenolol:glycidyl-ether",
              inputAtomLabel: "epoxide oxygen",
              productAtomLabel: "alcohol oxygen",
              outcome: "retained",
            },
            {
              mapId: "map:atenolol:amine-nitrogen",
              inputMaterialId: "material:atenolol:isopropylamine",
              inputAtomLabel: "amine nitrogen",
              productAtomLabel: "secondary-amine nitrogen",
              outcome: "retained",
            },
          ],
          note:
            "Named-atom correspondence inferred for teaching and pending expert review.",
        },
        bondChanges: [
          {
            kind: "formed",
            atomMapIds: [
              "map:atenolol:terminal-epoxide-carbon",
              "map:atenolol:amine-nitrogen",
            ],
            description: "New side-chain carbon–nitrogen bond.",
          },
          {
            kind: "broken",
            atomMapIds: [
              "map:atenolol:terminal-epoxide-carbon",
              "map:atenolol:epoxide-oxygen",
            ],
            description: "Epoxide ring carbon–oxygen bond opened.",
          },
        ],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "US 3,663,607 A, Example 1 reports the glycidyl ether, isopropylamine and named atenolol connectivity; atom mapping remains draft.",
        ),
        sourceIds: [patentSource.atenolol],
      },
    ],
    sourceIds: [patentSource.atenolol, "source:pubchem-2249"],
    verification: sourceSupported(
      "The two route transformations are anchored to US 3,663,607 A, Example 1 and its precursor paragraph; expert review is pending.",
    ),
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
  {
    id: "synthesis:carvedilol-educational-scaffold",
    version: "2.1.0",
    moleculeId: "molecule:carvedilol",
    title: "Carvedilol: carbazole epoxide convergence",
    routeType: "patent-reported",
    intent: "educational",
    summary:
      "A source-anchored convergence of a carbazole-bearing epoxide and a methoxyphenoxyethyl amine fragment into carvedilol connectivity.",
    routeExplanation:
      "The cited example begins with two preformed fragments. The teaching layer makes that boundary explicit, then tracks the carbon–nitrogen bond formation and epoxide-ring opening that join the carbazole and methoxyphenoxy regions through the amino-alcohol linker.",
    primarySourceAnchors: [
      {
        sourceId: patentSource.carvedilol,
        url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4503067",
        locatorKind: "patent-example",
        locator:
          "Example 2, titled for the methoxyphenoxyethylamino product: starting-material paragraph and named-product paragraph.",
        supportScope:
          "Supports the two reported fragments and carvedilol parent connectivity; it does not support an upstream route for either fragment in this story.",
      },
    ],
    startingMaterials: [
      {
        id: "material:carvedilol:carbazole-epoxide",
        label: "4-(2,3-epoxypropoxy)-9H-carbazole",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "C1C(O1)COC2=CC=CC3=C2C4=CC=CC=C4N3",
          sourceId: patentSource.carvedilol,
        },
      },
      {
        id: "material:carvedilol:aminoethyl-aryl-ether",
        label: "2-(2-methoxyphenoxy)ethylamine",
        role: "starting-material",
        structure: {
          format: "smiles",
          value: "COC1=CC=CC=C1OCCN",
          sourceId: patentSource.carvedilol,
        },
      },
    ],
    intermediates: [],
    finalProduct: {
      id: "material:carvedilol:parent",
      label: "carvedilol (parent connectivity)",
      role: "final-product",
      structure: {
        format: "smiles",
        value: "COC1=CC=CC=C1OCCNCC(COC2=CC=CC3=C2C4=CC=CC=C4N3)O",
        sourceId: "source:pubchem-2585",
      },
    },
    reactionClasses: [
      "convergent fragment coupling",
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistry: {
      sourcePresentation: "not-assigned",
      teachingScope:
        "Example 2 does not assign an absolute configuration; the story presents parent connectivity without attributing a single enantiomer.",
    },
    limitations: [
      "The cited example starts from two preformed fragments; their upstream preparations are outside this story.",
      "The atom map is an editorial teaching annotation and is not published in the patent.",
      "No conclusion about phosphate forms, impurity control, scale or clinical activity follows from this route view.",
    ],
    review: pendingExpertReview(
      "Patent locator and fragment identities audited; atom mapping and pedagogical wording await named expert review.",
    ),
    steps: [
      {
        id: "synthesis-step:carvedilol-01",
        order: 1,
        title: "Set the convergent-fragment boundary",
        inputMaterialIds: [
          "material:carvedilol:carbazole-epoxide",
          "material:carvedilol:aminoethyl-aryl-ether",
        ],
        outputMaterialId: null,
        inputLabels: [
          "carbazole-bearing epoxide",
          "methoxyphenoxyethyl amine",
        ],
        outputLabel: "source-anchored fragment pair",
        transformationFamily: "source orientation",
        changeSummary:
          "No covalent change is claimed in this frame: the cited example begins with both complex fragments already prepared.",
        learningRationale:
          "Recognize the two retained molecular regions before following the single linkage event that joins them.",
        commonMisconception:
          "Showing two named fragments does not establish how either fragment was prepared.",
        atomMappingStatus: "not-applicable",
        atomMapping: {
          status: "not-applicable",
          convention: "named-atom-correspondence-v1",
          atoms: [],
          note: "Orientation frame only; mapping starts in the bond-change step.",
        },
        bondChanges: [],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "The two starting fragments are named in US 4,503,067 A, Example 2.",
        ),
        sourceIds: [patentSource.carvedilol],
      },
      {
        id: "synthesis-step:carvedilol-02",
        order: 2,
        title: "Join the fragments through epoxide opening",
        inputMaterialIds: [
          "material:carvedilol:carbazole-epoxide",
          "material:carvedilol:aminoethyl-aryl-ether",
        ],
        outputMaterialId: "material:carvedilol:parent",
        inputLabels: [
          "4-(2,3-epoxypropoxy)-9H-carbazole",
          "2-(2-methoxyphenoxy)ethylamine",
        ],
        outputLabel: "carvedilol parent connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond joins the amine-bearing aryl ether to the carbazole side chain while one epoxide carbon–oxygen bond is opened.",
        learningRationale:
          "Track a convergent coupling without losing sight of which large fragments are retained unchanged.",
        commonMisconception:
          "A parent-structure match does not identify a salt, polymorph, enantiomer or manufacturing route.",
        atomMappingStatus: "draft",
        atomMapping: {
          status: "draft",
          convention: "named-atom-correspondence-v1",
          atoms: [
            {
              mapId: "map:carvedilol:terminal-epoxide-carbon",
              inputMaterialId: "material:carvedilol:carbazole-epoxide",
              inputAtomLabel: "terminal epoxide carbon",
              productAtomLabel: "amine-bearing linker carbon",
              outcome: "retained",
            },
            {
              mapId: "map:carvedilol:epoxide-oxygen",
              inputMaterialId: "material:carvedilol:carbazole-epoxide",
              inputAtomLabel: "epoxide oxygen",
              productAtomLabel: "alcohol oxygen",
              outcome: "retained",
            },
            {
              mapId: "map:carvedilol:amine-nitrogen",
              inputMaterialId:
                "material:carvedilol:aminoethyl-aryl-ether",
              inputAtomLabel: "primary-amine nitrogen",
              productAtomLabel: "secondary-amine nitrogen",
              outcome: "retained",
            },
          ],
          note:
            "Named-atom correspondence inferred for teaching and pending expert review.",
        },
        bondChanges: [
          {
            kind: "formed",
            atomMapIds: [
              "map:carvedilol:terminal-epoxide-carbon",
              "map:carvedilol:amine-nitrogen",
            ],
            description: "New linker carbon–nitrogen bond joins the two fragments.",
          },
          {
            kind: "broken",
            atomMapIds: [
              "map:carvedilol:terminal-epoxide-carbon",
              "map:carvedilol:epoxide-oxygen",
            ],
            description: "Epoxide ring carbon–oxygen bond opened.",
          },
        ],
        evidenceLevel: "literature-reported",
        verification: sourceSupported(
          "US 4,503,067 A, Example 2 reports the named starting fragments and product connectivity; atom mapping remains draft.",
        ),
        sourceIds: [patentSource.carvedilol],
      },
    ],
    sourceIds: [patentSource.carvedilol, "source:pubchem-2585"],
    verification: sourceSupported(
      "The fragment pair and named product are anchored to US 4,503,067 A, Example 2; expert review of the teaching map is pending.",
    ),
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
] satisfies readonly SynthesisStory[];
