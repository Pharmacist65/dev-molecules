import type { SynthesisStory } from "../domain";

const draftSource = "source:dev-molecules-educational-draft-001" as const;

const safetyNote =
  "This story omits quantities, conditions and operational laboratory instructions. " +
  "It teaches structural change only and is not a synthesis protocol.";

export const synthesisStories: readonly SynthesisStory[] = [
  {
    id: "synthesis:propranolol-educational-scaffold",
    moleculeId: "molecule:propranolol",
    title: "Propranolol scaffold: aryl ether to amino alcohol",
    routeType: "educational-simplification",
    intent: "educational",
    summary:
      "A two-stage structural narrative showing formation of a naphthoxy three-carbon linker and installation of the amino-alcohol side chain.",
    steps: [
      {
        id: "synthesis-step:propranolol-01",
        order: 1,
        title: "Create the naphthoxy linker",
        inputLabels: ["naphthol-derived aromatic oxygen", "three-carbon epoxide-like linker"],
        outputLabel: "naphthoxy linker intermediate",
        transformationFamily: "aryl ether formation",
        changeSummary:
          "The naphthalene oxygen becomes connected to a three-carbon linker while the aromatic core is retained.",
        learningRationale:
          "Track the aryloxypropanolamine backbone before introducing the amine substituent.",
        commonMisconception:
          "The computed intermediate drawing is not evidence that this exact route or condition was experimentally used.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: {
          status: "pending-review",
          note: "High-level transformation requires synthetic chemistry review and a route-specific citation.",
        },
        sourceIds: [draftSource],
      },
      {
        id: "synthesis-step:propranolol-02",
        order: 2,
        title: "Introduce the isopropylamino side chain",
        inputLabels: ["naphthoxy linker intermediate", "isopropylamine fragment"],
        outputLabel: "propranolol connectivity",
        transformationFamily: "nucleophilic epoxide opening (educational abstraction)",
        changeSummary:
          "The amine fragment is connected to the linker and the secondary alcohol motif is revealed.",
        learningRationale:
          "Connect the shared amino-alcohol motif to beta-blocker scaffold recognition.",
        commonMisconception:
          "Connectivity alone does not establish stereochemical composition, yield, purity or pharmaceutical form.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: {
          status: "pending-review",
          note: "No operational details; route-specific literature review is outstanding.",
        },
        sourceIds: [draftSource],
      },
    ],
    sourceIds: [draftSource, "source:pubchem-4946"],
    verification: {
      status: "pending-review",
      note: "Prototype-only narrative; do not label as the synthesis of propranolol.",
    },
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
  {
    id: "synthesis:atenolol-educational-scaffold",
    moleculeId: "molecule:atenolol",
    title: "Atenolol scaffold: para-substituted aryl ether assembly",
    routeType: "educational-simplification",
    intent: "educational",
    summary:
      "A structural story that separates the para acetamide-bearing aromatic region from the shared oxypropanolamine side chain.",
    steps: [
      {
        id: "synthesis-step:atenolol-01",
        order: 1,
        title: "Identify the para-substituted aromatic core",
        inputLabels: ["para-substituted phenolic scaffold", "three-carbon linker"],
        outputLabel: "aryl-oxy linker intermediate",
        transformationFamily: "aryl ether formation",
        changeSummary:
          "The aromatic oxygen is connected to the linker without changing the para acetamide-bearing region.",
        learningRationale:
          "Separate the conserved beta-blocker linker from the substituent used for family comparison.",
        commonMisconception:
          "A shared scaffold does not mean identical receptor selectivity or clinical behavior.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: { status: "pending-review", note: "Route source not yet curated." },
        sourceIds: [draftSource],
      },
      {
        id: "synthesis-step:atenolol-02",
        order: 2,
        title: "Complete the amino-alcohol motif",
        inputLabels: ["aryl-oxy linker intermediate", "isopropylamino fragment"],
        outputLabel: "atenolol connectivity",
        transformationFamily: "amino-alcohol side-chain formation",
        changeSummary:
          "The side chain is completed while the amide-containing aromatic substituent remains traceable.",
        learningRationale:
          "Practice following retained atoms and newly connected fragments across a simplified transformation.",
        commonMisconception:
          "A final 2D match does not prove pharmaceutical form or experimental preparation.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: { status: "pending-review", note: "Route source not yet curated." },
        sourceIds: [draftSource],
      },
    ],
    sourceIds: [draftSource, "source:pubchem-2249"],
    verification: {
      status: "pending-review",
      note: "Prototype-only narrative awaiting synthetic chemistry review.",
    },
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
  {
    id: "synthesis:carvedilol-educational-scaffold",
    moleculeId: "molecule:carvedilol",
    title: "Carvedilol scaffold: carbazole and amino-alcohol regions",
    routeType: "educational-simplification",
    intent: "educational",
    summary:
      "A non-operational decomposition of carvedilol into a carbazole-bearing ether region, an amino-alcohol linker and a methoxyphenoxyethyl region.",
    steps: [
      {
        id: "synthesis-step:carvedilol-01",
        order: 1,
        title: "Attach a linker to the carbazole-bearing oxygen",
        inputLabels: ["hydroxycarbazole region", "three-carbon linker"],
        outputLabel: "carbazole-oxy linker intermediate",
        transformationFamily: "aryl ether formation",
        changeSummary:
          "The carbazole region is retained while an oxygen-linked side chain is introduced.",
        learningRationale:
          "Show why carvedilol belongs in the same broad amino-alcohol comparison but has a distinct aromatic region.",
        commonMisconception:
          "Structural similarity does not imply the same receptor profile.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: { status: "pending-review", note: "Route source not yet curated." },
        sourceIds: [draftSource],
      },
      {
        id: "synthesis-step:carvedilol-02",
        order: 2,
        title: "Connect the second aromatic region through the amine",
        inputLabels: ["carbazole-oxy linker intermediate", "methoxyphenoxyethyl amino fragment"],
        outputLabel: "carvedilol connectivity",
        transformationFamily: "amino-alcohol side-chain assembly",
        changeSummary:
          "The amine connects the linker to the second aromatic region, completing the parent connectivity.",
        learningRationale:
          "Practice recognizing which regions are retained and which bond is newly formed.",
        commonMisconception:
          "The racemate, a single enantiomer and a phosphate form must not be merged into one identity record.",
        atomMappingStatus: "draft",
        evidenceLevel: "educational-simplification",
        verification: { status: "pending-review", note: "Route source not yet curated." },
        sourceIds: [draftSource],
      },
    ],
    sourceIds: [draftSource, "source:pubchem-2585"],
    verification: {
      status: "pending-review",
      note: "Prototype-only narrative awaiting synthetic chemistry review.",
    },
    safety: { operationalDetailsIncluded: false, note: safetyNote },
  },
] satisfies readonly SynthesisStory[];

