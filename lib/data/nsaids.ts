import type {
  ChemicalFormKind,
  MoleculeRecord,
  SourceId,
  StereoPresentation,
  VerificationRecord,
} from "../domain";
import { createPubChemStructureSet } from "./pubchem-structures";
import { getRegulatoryProductsForMolecule } from "./regulatory-approvals";

interface FormSeed {
  readonly slug: string;
  readonly displayName: string;
  readonly kind: ChemicalFormKind;
  readonly modifier: string | null;
  readonly commonProductContext: boolean;
}

interface NsaidSeed {
  readonly slug: string;
  readonly preferredName: string;
  readonly synonyms: readonly string[];
  readonly cid: number;
  readonly formula: string;
  readonly molecularWeight: number;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly inchiKey: string;
  readonly stereoPresentation: StereoPresentation;
  readonly stereoCenters: readonly {
    readonly atomLabel: string;
    readonly configuration: "R" | "S" | "mixture" | "undefined";
  }[];
  readonly stereoSummary: string;
  readonly stereoVerification: VerificationRecord;
  readonly targetValue: string;
  readonly targetLabel: string;
  readonly scaffoldValue: string;
  readonly scaffoldLabel: string;
  readonly educationalSummary: string;
  readonly forms: readonly FormSeed[];
  readonly tags: readonly string[];
}

const RETRIEVED_AT = "2026-08-21";
const educationalDraftSource: SourceId =
  "source:dev-molecules-educational-draft-001";

const pending = (note: string): VerificationRecord => ({
  status: "pending-review",
  note,
});

const sourceSupported = (note: string): VerificationRecord => ({
  status: "source-supported",
  note,
});

const identitySource = (cid: number): SourceId => `source:pubchem-${cid}`;
const labelSource = (slug: string): SourceId => `source:dailymed-${slug}`;

const seeds: readonly NsaidSeed[] = [
  {
    slug: "aspirin",
    preferredName: "Aspirin",
    synonyms: ["Acetylsalicylic acid"],
    cid: 2244,
    formula: "C9H8O4",
    molecularWeight: 180.16,
    canonicalSmiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
    isomericSmiles: null,
    inchiKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
    stereoPresentation: "achiral",
    stereoCenters: [],
    stereoSummary: "The normalized parent record does not encode a stereogenic center.",
    stereoVerification: sourceSupported(
      "PubChem connectivity and SDF records contain no assigned stereocenter.",
    ),
    targetValue: "irreversible-cyclooxygenase-modifier",
    targetLabel: "Irreversible cyclooxygenase modifier",
    scaffoldValue: "salicylate-acetate-ester",
    scaffoldLabel: "Salicylate acetate ester",
    educationalSummary:
      "Educational comparison point for a compact salicylate-derived anti-inflammatory structure.",
    forms: [
      {
        slug: "free-acid",
        displayName: "Aspirin (acetylsalicylic acid)",
        kind: "free-acid",
        modifier: null,
        commonProductContext: true,
      },
    ],
    tags: ["nsaid", "salicylate", "carboxylic-acid", "ester"],
  },
  {
    slug: "ibuprofen",
    preferredName: "Ibuprofen",
    synonyms: ["(±)-Ibuprofen"],
    cid: 3672,
    formula: "C13H18O2",
    molecularWeight: 206.28,
    canonicalSmiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
    isomericSmiles: null,
    inchiKey: "HEFNNWSXXWATRW-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [
      { atomLabel: "2-arylpropionic acid alpha carbon", configuration: "mixture" },
    ],
    stereoSummary:
      "The normalized parent is non-stereospecific and represents racemic ibuprofen.",
    stereoVerification: sourceSupported(
      "PubChem identifies this CID as the non-stereospecific (±) parent; product-level wording remains review-gated.",
    ),
    targetValue: "nonselective-cyclooxygenase-inhibitor",
    targetLabel: "Nonselective cyclooxygenase profile",
    scaffoldValue: "arylpropionic-acid",
    scaffoldLabel: "Arylpropionic acid",
    educationalSummary:
      "Educational arylpropionic-acid comparator with a racemic identity boundary.",
    forms: [
      {
        slug: "free-acid",
        displayName: "Ibuprofen (free acid)",
        kind: "free-acid",
        modifier: null,
        commonProductContext: true,
      },
    ],
    tags: ["nsaid", "arylpropionic-acid", "racemate", "carboxylic-acid"],
  },
  {
    slug: "naproxen",
    preferredName: "Naproxen",
    synonyms: ["(S)-Naproxen"],
    cid: 156391,
    formula: "C14H14O3",
    molecularWeight: 230.26,
    canonicalSmiles: "CC(C1=CC2=C(C=C1)C=C(C=C2)OC)C(=O)O",
    isomericSmiles: "C[C@@H](C1=CC2=C(C=C1)C=C(C=C2)OC)C(=O)O",
    inchiKey: "CMWTZPSULFXXJA-VIFPVBQESA-N",
    stereoPresentation: "single-stereoisomer",
    stereoCenters: [
      { atomLabel: "2-arylpropionic acid alpha carbon", configuration: "S" },
    ],
    stereoSummary: "The PubChem parent encodes the S-configured alpha carbon.",
    stereoVerification: sourceSupported(
      "Configuration is carried by the PubChem isomeric SMILES; nomenclature remains subject to editorial review.",
    ),
    targetValue: "nonselective-cyclooxygenase-inhibitor",
    targetLabel: "Nonselective cyclooxygenase profile",
    scaffoldValue: "naphthalene-propionic-acid",
    scaffoldLabel: "Naphthalene propionic acid",
    educationalSummary:
      "Single-stereoisomer arylpropionic-acid comparator with a fused aromatic system.",
    forms: [
      {
        slug: "free-acid",
        displayName: "Naproxen (free acid)",
        kind: "free-acid",
        modifier: null,
        commonProductContext: true,
      },
      {
        slug: "sodium",
        displayName: "Naproxen sodium",
        kind: "salt",
        modifier: "sodium",
        commonProductContext: true,
      },
    ],
    tags: ["nsaid", "arylpropionic-acid", "single-stereoisomer", "naphthalene"],
  },
  {
    slug: "diclofenac",
    preferredName: "Diclofenac",
    synonyms: ["Diclofenac free acid"],
    cid: 3033,
    formula: "C14H11Cl2NO2",
    molecularWeight: 296.1,
    canonicalSmiles: "C1=CC=C(C(=C1)CC(=O)O)NC2=C(C=CC=C2Cl)Cl",
    isomericSmiles: null,
    inchiKey: "DCOPUUMXTXDBNB-UHFFFAOYSA-N",
    stereoPresentation: "achiral",
    stereoCenters: [],
    stereoSummary: "The normalized parent record does not encode a stereogenic center.",
    stereoVerification: sourceSupported(
      "PubChem connectivity and SDF records contain no assigned stereocenter.",
    ),
    targetValue: "nonselective-cyclooxygenase-inhibitor",
    targetLabel: "Nonselective cyclooxygenase profile",
    scaffoldValue: "diarylamine-acetic-acid",
    scaffoldLabel: "Diarylamine acetic acid",
    educationalSummary:
      "Chlorinated diarylamine comparator that separates scaffold grouping from mechanism grouping.",
    forms: [
      {
        slug: "free-acid",
        displayName: "Diclofenac (free acid)",
        kind: "free-acid",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "sodium",
        displayName: "Diclofenac sodium",
        kind: "salt",
        modifier: "sodium",
        commonProductContext: true,
      },
      {
        slug: "potassium",
        displayName: "Diclofenac potassium",
        kind: "salt",
        modifier: "potassium",
        commonProductContext: true,
      },
    ],
    tags: ["nsaid", "diarylamine", "carboxylic-acid", "chlorinated"],
  },
  {
    slug: "celecoxib",
    preferredName: "Celecoxib",
    synonyms: ["SC-58635"],
    cid: 2662,
    formula: "C17H14F3N3O2S",
    molecularWeight: 381.4,
    canonicalSmiles:
      "CC1=CC=C(C=C1)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F",
    isomericSmiles: null,
    inchiKey: "RZEKVGVHFLEQIL-UHFFFAOYSA-N",
    stereoPresentation: "achiral",
    stereoCenters: [],
    stereoSummary: "The normalized parent record does not encode a stereogenic center.",
    stereoVerification: sourceSupported(
      "PubChem connectivity and SDF records contain no assigned stereocenter.",
    ),
    targetValue: "cox-2-selective-inhibitor",
    targetLabel: "COX-2-selective profile",
    scaffoldValue: "diaryl-pyrazole-sulfonamide",
    scaffoldLabel: "Diaryl pyrazole sulfonamide",
    educationalSummary:
      "Heteroaromatic sulfonamide comparator for separating target profile from structural family.",
    forms: [
      {
        slug: "neutral",
        displayName: "Celecoxib (active moiety)",
        kind: "neutral",
        modifier: null,
        commonProductContext: true,
      },
    ],
    tags: ["nsaid", "cox-2-profile-pending", "pyrazole", "sulfonamide"],
  },
] as const;

const isParentForm = (kind: ChemicalFormKind): boolean =>
  kind === "free-base" || kind === "free-acid" || kind === "neutral";

const toRecord = (seed: NsaidSeed): MoleculeRecord => {
  const moleculeId = `molecule:${seed.slug}` as const;
  const pubChemSourceId = identitySource(seed.cid);
  const dailyMedSourceId = labelSource(seed.slug);
  const regulatoryProducts = getRegulatoryProductsForMolecule(moleculeId);

  return {
    id: moleculeId,
    identity: {
      preferredName: seed.preferredName,
      synonyms: seed.synonyms,
      molecularFormula: seed.formula,
      molecularWeight: seed.molecularWeight,
      canonicalSmiles: seed.canonicalSmiles,
      isomericSmiles: seed.isomericSmiles,
      inchiKey: seed.inchiKey,
      pubChemCid: seed.cid,
      verification: {
        status: "verified",
        note:
          "Normalized identity fields checked against PubChem PUG REST on 2026-08-21.",
        reviewedAt: RETRIEVED_AT,
        reviewedBy: "Dev Molecules PubChem identity check",
      },
      sourceIds: [pubChemSourceId],
    },
    structures: createPubChemStructureSet({
      moleculeId,
      pubChemCid: seed.cid,
      sourceId: pubChemSourceId,
    }),
    stereochemistry: {
      presentation: seed.stereoPresentation,
      centers: seed.stereoCenters,
      summary: seed.stereoSummary,
      verification: seed.stereoVerification,
    },
    forms: seed.forms.map((form) => {
      const formId = `form:${seed.slug}:${form.slug}` as const;
      const regulatoryProduct = regulatoryProducts.find(
        (product) => product.chemicalFormId === formId,
      );
      return {
        id: formId,
        parentMoleculeId: moleculeId,
        displayName: form.displayName,
        kind: form.kind,
        counterionOrModifier: form.modifier,
        relation: isParentForm(form.kind) ? "active-moiety" : "pharmaceutical-form",
        isCommonProductContext: form.commonProductContext,
        verification: regulatoryProduct
          ? sourceSupported(
              `Linked to exact Drugs@FDA ${regulatoryProduct.applicationNumber} product ${regulatoryProduct.productNumber}; approval remains product/form scoped.`,
            )
          : isParentForm(form.kind)
            ? sourceSupported(
                "Identity-level parent record; product presentation is a separate evidence boundary.",
              )
            : pending(
                "Common form is an educational draft until an exact product source is pinned.",
              ),
        sourceIds: regulatoryProduct
          ? [pubChemSourceId, regulatoryProduct.sourceId]
          : isParentForm(form.kind)
            ? [pubChemSourceId]
            : [dailyMedSourceId],
      };
    }),
    classifications: [
      {
        id: `classification:${seed.slug}:therapeutic-area:pain-and-inflammation`,
        axis: "therapeutic-area",
        value: "pain-and-inflammation",
        label: "Pain & inflammation",
        isPrimary: true,
        summary:
          "Educational catalog grouping only; it is not a product-level indication statement.",
        verification: pending(
          "Therapeutic-area grouping requires editorial review against exact regulatory and pharmacology sources.",
        ),
        sourceIds: [educationalDraftSource, dailyMedSourceId],
      },
      {
        id: `classification:${seed.slug}:pharmacologic-class:nsaid`,
        axis: "pharmacologic-class",
        value: "nonsteroidal-anti-inflammatory",
        label: "Nonsteroidal anti-inflammatory",
        isPrimary: true,
        summary:
          "Prototype pharmacologic-class grouping for education, separate from clinical claims.",
        verification: pending(
          "Classification must be reviewed against a named pharmacology source before publication.",
        ),
        sourceIds: [educationalDraftSource],
      },
      {
        id: `classification:${seed.slug}:target-profile:${seed.targetValue}`,
        axis: "target-profile",
        value: seed.targetValue,
        label: seed.targetLabel,
        isPrimary: true,
        summary:
          "Teaching-level target profile; potency, dose, tissue, and product context are intentionally not inferred.",
        verification: pending(
          "Target-profile wording requires expert review against a named pharmacology source.",
        ),
        sourceIds: [educationalDraftSource],
      },
      {
        id: `classification:${seed.slug}:structural-family:${seed.scaffoldValue}`,
        axis: "structural-family",
        value: seed.scaffoldValue,
        label: seed.scaffoldLabel,
        isPrimary: true,
        summary:
          "Human-readable scaffold grouping for comparison; it is not a computed similarity result.",
        verification: pending(
          "Scaffold-family wording requires medicinal chemistry review.",
        ),
        sourceIds: [educationalDraftSource, pubChemSourceId],
      },
    ],
    educationalProfile: {
      summary: seed.educationalSummary,
      learningContext:
        "Compare scaffold, stereochemistry, and target-profile labels while keeping identity and product-form evidence separate.",
      verification: pending(
        "Educational framing requires named pharmacology and medicinal chemistry review before publication.",
      ),
      sourceIds: [educationalDraftSource],
    },
    regulatoryProducts,
    conformers: [
      {
        kind: "computed-conformer",
        sourceId: pubChemSourceId,
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${seed.cid}#section=3D-Conformer`,
        verification: {
          status: "verified",
          note:
            "Computed PubChem conformer; it must never be labeled as an experimental bound pose.",
          reviewedAt: RETRIEVED_AT,
          reviewedBy: "Dev Molecules asset integrity check",
        },
      },
    ],
    claims: [
      {
        id: `claim:${seed.slug}:identity`,
        subjectId: moleculeId,
        category: "identity",
        statement: `${seed.preferredName} maps to normalized PubChem CID ${seed.cid}.`,
        intent: "reference",
        evidenceLevel: "curated-database",
        verification: {
          status: "verified",
          reviewedAt: RETRIEVED_AT,
          reviewedBy: "Dev Molecules PubChem identity check",
        },
        sourceIds: [pubChemSourceId],
        limitations: [
          "The normalized parent is not the same record as every salt, formulation, stereoisomer, or commercial product.",
        ],
      },
      {
        id: `claim:${seed.slug}:class`,
        subjectId: moleculeId,
        category: "classification",
        statement: seed.educationalSummary,
        intent: "educational",
        evidenceLevel: "educational-simplification",
        verification: pending(
          "Review against exact pharmacology sources before publication.",
        ),
        sourceIds: [educationalDraftSource],
        limitations: [
          "The grouping is a teaching lens and must not be read as clinical guidance or a product-level indication.",
        ],
      },
      ...regulatoryProducts.map((product) => ({
        id: `claim:${seed.slug}:approval:${product.applicationNumber.toLowerCase()}:${product.productNumber}` as const,
        subjectId: product.chemicalFormId,
        category: "approval" as const,
        statement: `${product.brandName} (${product.applicationNumber}, product ${product.productNumber}) has a Drugs@FDA ORIG/1/AP record linked through ${product.chemicalFormId}.`,
        intent: "reference" as const,
        evidenceLevel: "regulatory" as const,
        verification: product.verification,
        sourceIds: [product.sourceId],
        limitations: product.limitations,
      })),
    ],
    tags: seed.tags,
    notForClinicalUse: true,
  };
};

export const nsaids: readonly MoleculeRecord[] = seeds.map(toRecord);

export const nsaidById = new Map(
  nsaids.map((molecule) => [molecule.id, molecule]),
);
