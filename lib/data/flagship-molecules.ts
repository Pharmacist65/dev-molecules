import type { MoleculeRecord } from "@/lib/domain/molecule";

import { createPubChemStructureSet } from "./pubchem-structures";

const RETRIEVED_AT = "2026-08-25";
const moleculeId = "molecule:omeprazole" as const;
const sourceId = "source:pubchem-4594" as const;
const baseStructures = createPubChemStructureSet({
  moleculeId,
  pubChemCid: 4594,
  sourceId,
});

/**
 * Omeprazole remains outside the 15-record seed Atlas. This reviewed molecular
 * identity exists only to canonicalize the exact imported CID into the three
 * record flagship Dossier registry.
 */
export const omeprazoleFlagshipMolecule: MoleculeRecord = {
  id: moleculeId,
  identity: {
    preferredName: "Omeprazole",
    synonyms: ["Omeprazol", "rac-Omeprazole"],
    molecularFormula: "C17H19N3O3S",
    molecularWeight: 345.4,
    canonicalSmiles: "CC1=CN=C(C(=C1OC)C)CS(=O)C2=NC3=C(N2)C=C(C=C3)OC",
    isomericSmiles: null,
    inchiKey: "SUBDBMMJDZJVOS-UHFFFAOYSA-N",
    pubChemCid: 4594,
    verification: {
      status: "verified",
      note: "Exact imported PubChem CID 4594 identity checked for the Phase A Dossier registry.",
      reviewedAt: RETRIEVED_AT,
      reviewedBy: "Molevren Phase A identity audit",
    },
    sourceIds: [sourceId],
  },
  structures: {
    ...baseStructures,
    twoDimensional: {
      ...baseStructures.twoDimensional,
      publicPath: "/catalog/structures/pubchem/cid-4594-2d.sdf",
      retrievedAt: "2026-08-22",
    },
    threeDimensional: {
      ...baseStructures.threeDimensional,
      publicPath: "/catalog/structures/pubchem/cid-4594-3d.sdf",
      retrievedAt: "2026-08-22",
      verification: {
        ...baseStructures.threeDimensional.verification,
        reviewedAt: RETRIEVED_AT,
        reviewedBy: "Molevren Phase A asset audit",
        note: "PubChem-computed conformer for CID 4594; it is neither a verified racemate representation nor a bioactive pose.",
      },
    },
  },
  stereochemistry: {
    presentation: "racemate",
    centers: [{ atomLabel: "sulfoxide sulfur", configuration: "mixture" }],
    summary:
      "Omeprazole is represented as the R/S racemate at stereogenic sulfoxide sulfur; the computed 3D asset is not a complete racemate depiction.",
    verification: {
      status: "source-supported",
      note: "Racemate and sulfoxide-stereogenicity wording is source-supported and remains structure-mapping review scoped.",
    },
  },
  forms: [
    {
      id: "form:omeprazole:free-parent",
      parentMoleculeId: moleculeId,
      displayName: "Omeprazole (racemic free parent)",
      kind: "neutral",
      counterionOrModifier: null,
      relation: "active-moiety",
      isCommonProductContext: true,
      verification: {
        status: "source-supported",
        note: "Free-parent identity is kept separate from magnesium and sodium records.",
      },
      sourceIds: [sourceId, "source:chebi-7772"],
    },
    {
      id: "form:omeprazole:magnesium",
      parentMoleculeId: moleculeId,
      displayName: "Omeprazole magnesium",
      kind: "salt",
      counterionOrModifier: "magnesium",
      relation: "related-form",
      isCommonProductContext: false,
      verification: {
        status: "source-supported",
        note: "Separate PubChem form; its product or PK claims are not imported into the free-parent capsule profile.",
      },
      sourceIds: ["source:pubchem-130564"],
    },
    {
      id: "form:omeprazole:sodium",
      parentMoleculeId: moleculeId,
      displayName: "Omeprazole sodium",
      kind: "salt",
      counterionOrModifier: "sodium",
      relation: "related-form",
      isCommonProductContext: false,
      verification: {
        status: "source-supported",
        note: "Separate PubChem form; its product or PK claims are not imported into the free-parent capsule profile.",
      },
      sourceIds: ["source:pubchem-10959536"],
    },
  ],
  classifications: [],
  educationalProfile: {
    summary:
      "Flagship evidence record for reading an acid-activated proton-pump inhibitor without merging parent, form, formulation or source-specific nomenclature.",
    learningContext:
      "Keep the delayed-release product journey, sulfoxide stereochemistry and source-specific nomenclature conflict visible.",
    verification: {
      status: "pending-review",
      note: "Educational framing is not a scientific source and remains pharmacy-education review scoped.",
    },
    sourceIds: [],
  },
  regulatoryProducts: [],
  conformers: [
    {
      kind: "computed-conformer",
      sourceId,
      url: "https://pubchem.ncbi.nlm.nih.gov/compound/4594#section=3D-Conformer",
      verification: {
        status: "verified",
        note: "Computed PubChem conformer only; not an experimental structure or verified racemate depiction.",
        reviewedAt: RETRIEVED_AT,
        reviewedBy: "Molevren Phase A asset audit",
      },
    },
  ],
  claims: [
    {
      id: "claim:omeprazole:identity",
      subjectId: moleculeId,
      category: "identity",
      statement: "Omeprazole maps to normalized racemic free-parent PubChem CID 4594.",
      intent: "reference",
      evidenceLevel: "curated-database",
      verification: {
        status: "verified",
        reviewedAt: RETRIEVED_AT,
        reviewedBy: "Molevren Phase A identity audit",
      },
      sourceIds: [sourceId, "source:chebi-7772"],
      limitations: [
        "The free parent is not interchangeable with magnesium, sodium, every formulation or every commercial product.",
      ],
    },
  ],
  tags: ["proton-pump-inhibitor", "benzimidazole", "pyridine", "sulfoxide", "racemate"],
  notForClinicalUse: true,
};
