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

interface BetaBlockerSeed {
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
  readonly receptorProfile: BetaReceptorProfile;
  readonly scaffoldFamily: string;
  readonly profileSummary: string;
  readonly forms: readonly FormSeed[];
  readonly tags: readonly string[];
}

type BetaReceptorProfile =
  | "nonselective-beta"
  | "beta1-selective"
  | "mixed-alpha1-beta"
  | "beta1-selective-vasodilatory"
  | "other"
  | "unknown";

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
const educationalDraftSource: SourceId =
  "source:dev-molecules-educational-draft-001";

const receptorProfileLabels: Readonly<Record<BetaReceptorProfile, string>> = {
  "nonselective-beta": "Nonselective beta profile",
  "beta1-selective": "Beta1-selective profile",
  "mixed-alpha1-beta": "Mixed alpha1/beta profile",
  "beta1-selective-vasodilatory": "Beta1-selective, vasodilatory profile",
  other: "Other beta-receptor profile",
  unknown: "Unreviewed receptor profile",
};

const classificationValue = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const seeds: readonly BetaBlockerSeed[] = [
  {
    slug: "propranolol",
    preferredName: "Propranolol",
    synonyms: ["dl-Propranolol", "rac-Propranolol"],
    cid: 4946,
    formula: "C16H21NO2",
    molecularWeight: 259.34,
    canonicalSmiles: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O",
    isomericSmiles: null,
    inchiKey: "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The parent record represents racemic propranolol; enantiomer-specific activity is outside this draft's reviewed scope.",
    stereoVerification: sourceSupported(
      "PubChem identifies the normalized parent and racemic naming; expert review is still required for teaching claims.",
    ),
    receptorProfile: "nonselective-beta",
    scaffoldFamily: "aryloxypropanolamine / naphthoxypropanolamine",
    profileSummary:
      "Educational example of a nonselective beta-adrenoceptor antagonist scaffold.",
    forms: [
      {
        slug: "free-base",
        displayName: "Propranolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "hydrochloride",
        displayName: "Propranolol hydrochloride",
        kind: "salt",
        modifier: "hydrochloride",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "nonselective", "naphthalene", "aryloxypropanolamine"],
  },
  {
    slug: "metoprolol",
    preferredName: "Metoprolol",
    synonyms: ["rac-Metoprolol"],
    cid: 4171,
    formula: "C15H25NO3",
    molecularWeight: 267.36,
    canonicalSmiles: "CC(C)NCC(COC1=CC=C(C=C1)CCOC)O",
    isomericSmiles: null,
    inchiKey: "IUBSYMUCCVWXPE-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The non-stereospecific parent record is used for the introductory catalog.",
    stereoVerification: pending(
      "Confirm marketed stereochemical presentation against an exact regulatory label before publication.",
    ),
    receptorProfile: "beta1-selective",
    scaffoldFamily: "para-substituted aryloxypropanolamine",
    profileSummary:
      "Educational example of the beta1-selective aryloxypropanolamine group.",
    forms: [
      {
        slug: "free-base",
        displayName: "Metoprolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "tartrate",
        displayName: "Metoprolol tartrate",
        kind: "salt",
        modifier: "tartrate",
        commonProductContext: true,
      },
      {
        slug: "succinate",
        displayName: "Metoprolol succinate",
        kind: "salt",
        modifier: "succinate",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "beta1-selective", "aryloxypropanolamine"],
  },
  {
    slug: "atenolol",
    preferredName: "Atenolol",
    synonyms: ["ICI-66082"],
    cid: 2249,
    formula: "C14H22N2O3",
    molecularWeight: 266.34,
    canonicalSmiles: "CC(C)NCC(COC1=CC=C(C=C1)CC(=O)N)O",
    isomericSmiles: null,
    inchiKey: "METKIMKYRPQLGS-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The introductory record does not assign a single configuration at the side-chain stereocenter.",
    stereoVerification: pending(
      "Exact stereochemical presentation requires expert and label review.",
    ),
    receptorProfile: "beta1-selective",
    scaffoldFamily: "para-acetamide aryloxypropanolamine",
    profileSummary:
      "Educational comparison point for polar para-substitution within beta1-selective beta blockers.",
    forms: [
      {
        slug: "free-base",
        displayName: "Atenolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "beta1-selective", "amide", "aryloxypropanolamine"],
  },
  {
    slug: "bisoprolol",
    preferredName: "Bisoprolol",
    synonyms: ["Bisoprololum"],
    cid: 2405,
    formula: "C18H31NO4",
    molecularWeight: 325.4,
    canonicalSmiles: "CC(C)NCC(COC1=CC=C(C=C1)COCCOC(C)C)O",
    isomericSmiles: null,
    inchiKey: "VHYCDWMUTMEGQY-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The PubChem parent used here is non-stereospecific; this draft treats it as a mixture for teaching identity boundaries.",
    stereoVerification: pending(
      "Confirm the exact pharmaceutical presentation before scientific review sign-off.",
    ),
    receptorProfile: "beta1-selective",
    scaffoldFamily: "para-substituted aryloxypropanolamine",
    profileSummary:
      "Educational beta1-selective comparison with an extended ether-rich para substituent.",
    forms: [
      {
        slug: "free-base",
        displayName: "Bisoprolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "fumarate",
        displayName: "Bisoprolol fumarate",
        kind: "salt",
        modifier: "fumarate",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "beta1-selective", "aryloxypropanolamine", "ether"],
  },
  {
    slug: "carvedilol",
    preferredName: "Carvedilol",
    synonyms: ["BM 14.190"],
    cid: 2585,
    formula: "C24H26N2O4",
    molecularWeight: 406.5,
    canonicalSmiles:
      "COC1=CC=CC=C1OCCNCC(COC2=CC=CC3=C2C4=CC=CC=C4N3)O",
    isomericSmiles: null,
    inchiKey: "OGHNVEJMJSYVRP-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The normalized parent is presented as a racemate; enantiomer-dependent receptor claims need explicit sourcing.",
    stereoVerification: sourceSupported(
      "PubChem's compound summary describes carvedilol as a racemic mixture.",
    ),
    receptorProfile: "mixed-alpha1-beta",
    scaffoldFamily: "carbazole-containing aryloxypropanolamine",
    profileSummary:
      "Educational example separating a mixed alpha1/beta profile from beta-only groupings.",
    forms: [
      {
        slug: "free-base",
        displayName: "Carvedilol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: true,
      },
      {
        slug: "phosphate",
        displayName: "Carvedilol phosphate",
        kind: "salt",
        modifier: "phosphate",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "alpha1-blocking", "carbazole", "mixed-profile"],
  },
  {
    slug: "labetalol",
    preferredName: "Labetalol",
    synonyms: ["AH-5158"],
    cid: 3869,
    formula: "C19H24N2O3",
    molecularWeight: 328.4,
    canonicalSmiles: "CC(CCC1=CC=CC=C1)NCC(C2=CC(=C(C=C2)O)C(=O)N)O",
    isomericSmiles: null,
    inchiKey: "SGUAFYQXFOLMHL-UHFFFAOYSA-N",
    stereoPresentation: "stereoisomer-mixture",
    stereoCenters: [
      { atomLabel: "benzylic amino side-chain center", configuration: "mixture" },
      { atomLabel: "secondary alcohol center", configuration: "mixture" },
    ],
    stereoSummary:
      "The parent record is non-stereospecific; the product-level stereoisomer composition is intentionally left pending.",
    stereoVerification: pending(
      "A medicinal chemist must review the stereoisomer mixture and terminology.",
    ),
    receptorProfile: "mixed-alpha1-beta",
    scaffoldFamily: "salicylamide amino alcohol",
    profileSummary:
      "Educational mixed alpha1/beta comparison that does not share the classic aryloxypropanolamine core.",
    forms: [
      {
        slug: "free-base",
        displayName: "Labetalol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "hydrochloride",
        displayName: "Labetalol hydrochloride",
        kind: "salt",
        modifier: "hydrochloride",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "alpha1-blocking", "salicylamide", "mixed-profile"],
  },
  {
    slug: "timolol",
    preferredName: "Timolol",
    synonyms: ["L-Timolol"],
    cid: 33624,
    formula: "C13H24N4O3S",
    molecularWeight: 316.42,
    canonicalSmiles: "CC(C)(C)NCC(COC1=NSN=C1N2CCOCC2)O",
    isomericSmiles: "CC(C)(C)NC[C@@H](COC1=NSN=C1N2CCOCC2)O",
    inchiKey: "BLJRIMJGRPQVNF-JTQLQIEISA-N",
    stereoPresentation: "single-stereoisomer",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "S" }],
    stereoSummary:
      "The PubChem structure encodes a defined side-chain stereocenter.",
    stereoVerification: sourceSupported(
      "Configuration is carried by the PubChem isomeric SMILES; nomenclature still needs editorial review.",
    ),
    receptorProfile: "nonselective-beta",
    scaffoldFamily: "thiadiazole oxypropanolamine",
    profileSummary:
      "Educational nonselective beta-blocker example with a heterocyclic scaffold.",
    forms: [
      {
        slug: "free-base",
        displayName: "Timolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "maleate",
        displayName: "Timolol maleate",
        kind: "salt",
        modifier: "maleate",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "nonselective", "thiadiazole", "single-stereoisomer"],
  },
  {
    slug: "nadolol",
    preferredName: "Nadolol",
    synonyms: ["SQ-11725"],
    cid: 39147,
    formula: "C17H27NO4",
    molecularWeight: 309.4,
    canonicalSmiles: "CC(C)(C)NCC(COC1=CC=CC2=C1CC(C(C2)O)O)O",
    isomericSmiles: "CC(C)(C)NCC(COC1=CC=CC2=C1C[C@@H]([C@@H](C2)O)O)O",
    inchiKey: "VWPOSFSPZNDTMJ-UCWKZMIHSA-N",
    stereoPresentation: "stereoisomer-mixture",
    stereoCenters: [
      { atomLabel: "tetralin ring stereocenters", configuration: "mixture" },
      { atomLabel: "propan-2-ol side chain", configuration: "undefined" },
    ],
    stereoSummary:
      "PubChem encodes ring stereochemistry, while the pharmaceutical mixture boundary needs expert review.",
    stereoVerification: pending(
      "Do not teach exact stereoisomer composition until an exact product/source review is complete.",
    ),
    receptorProfile: "nonselective-beta",
    scaffoldFamily: "polyhydroxylated aryloxypropanolamine",
    profileSummary:
      "Educational nonselective comparator with a polyhydroxylated fused-ring region.",
    forms: [
      {
        slug: "free-base",
        displayName: "Nadolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "nonselective", "polyol", "stereoisomer-mixture"],
  },
  {
    slug: "nebivolol",
    preferredName: "Nebivolol",
    synonyms: ["Nebivololum"],
    cid: 71301,
    formula: "C22H25F2NO4",
    molecularWeight: 405.4,
    canonicalSmiles:
      "C1CC2=C(C=CC(=C2)F)OC1C(CNCC(C3CCC4=C(O3)C=CC(=C4)F)O)O",
    isomericSmiles: null,
    inchiKey: "KOHIRBRYDXPAMZ-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "multiple chroman/side-chain centers", configuration: "mixture" }],
    stereoSummary:
      "The non-stereospecific parent record is used; the exact marketed stereochemical pair is not encoded here.",
    stereoVerification: pending(
      "Exact stereoisomer composition and enantiomer-specific claims require expert review.",
    ),
    receptorProfile: "beta1-selective-vasodilatory",
    scaffoldFamily: "bis-fluorochroman amino diol",
    profileSummary:
      "Educational beta1-selective comparator whose vasodilatory teaching claim remains review-gated.",
    forms: [
      {
        slug: "free-base",
        displayName: "Nebivolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "hydrochloride",
        displayName: "Nebivolol hydrochloride",
        kind: "salt",
        modifier: "hydrochloride",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "beta1-selective", "fluorinated", "vasodilatory-claim-pending"],
  },
  {
    slug: "acebutolol",
    preferredName: "Acebutolol",
    synonyms: ["M&B 17803A"],
    cid: 1978,
    formula: "C18H28N2O4",
    molecularWeight: 336.4,
    canonicalSmiles: "CCCC(=O)NC1=CC(=C(C=C1)OCC(CNC(C)C)O)C(=O)C",
    isomericSmiles: null,
    inchiKey: "GOEMGAFJFRBGGG-UHFFFAOYSA-N",
    stereoPresentation: "racemate",
    stereoCenters: [{ atomLabel: "propan-2-ol C2", configuration: "mixture" }],
    stereoSummary:
      "The introductory parent record is non-stereospecific and treated as a racemate.",
    stereoVerification: pending(
      "Exact stereochemical and product-form wording requires label review.",
    ),
    receptorProfile: "beta1-selective",
    scaffoldFamily: "acetamide-substituted aryloxypropanolamine",
    profileSummary:
      "Educational beta1-selective comparator with amide and ketone functionality.",
    forms: [
      {
        slug: "free-base",
        displayName: "Acebutolol (active moiety)",
        kind: "free-base",
        modifier: null,
        commonProductContext: false,
      },
      {
        slug: "hydrochloride",
        displayName: "Acebutolol hydrochloride",
        kind: "salt",
        modifier: "hydrochloride",
        commonProductContext: true,
      },
    ],
    tags: ["beta-blocker", "beta1-selective", "amide", "aryloxypropanolamine"],
  },
] as const;

const toRecord = (seed: BetaBlockerSeed): MoleculeRecord => {
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
        note: "Normalized identity fields checked against PubChem PUG REST on 2026-08-21.",
        reviewedAt: "2026-08-21",
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
        relation: form.kind === "free-base" ? "active-moiety" : "pharmaceutical-form",
        isCommonProductContext: form.commonProductContext,
        verification: regulatoryProduct
          ? sourceSupported(
              `Linked to exact Drugs@FDA ${regulatoryProduct.applicationNumber} product ${regulatoryProduct.productNumber}; approval remains product/form scoped.`,
            )
          : form.kind === "free-base"
            ? sourceSupported(
                "Identity-level active moiety; product presentation is a separate record.",
              )
            : pending(
                "Common form is an educational draft until an exact product source is pinned.",
              ),
        sourceIds: regulatoryProduct
          ? [pubChemSourceId, regulatoryProduct.sourceId]
          : form.kind === "free-base"
            ? [pubChemSourceId]
            : [dailyMedSourceId],
      };
    }),
    classifications: [
      {
        id: `classification:${seed.slug}:therapeutic-area:cardiovascular`,
        axis: "therapeutic-area",
        value: "cardiovascular",
        label: "Cardiovascular",
        isPrimary: true,
        summary:
          "Educational catalog grouping only; it is not a product-level indication statement.",
        verification: pending(
          "Therapeutic-area grouping requires editorial review against an exact pharmacology source.",
        ),
        sourceIds: [educationalDraftSource],
      },
      {
        id: `classification:${seed.slug}:pharmacologic-class:beta-blocker`,
        axis: "pharmacologic-class",
        value: "beta-adrenergic-blocker",
        label: "Beta-adrenergic blocker",
        isPrimary: true,
        summary:
          "Prototype pharmacologic-class grouping for education, separate from clinical claims.",
        verification: pending(
          "Classification must be reviewed against a named pharmacology source before publication.",
        ),
        sourceIds: [educationalDraftSource],
      },
      {
        id: `classification:${seed.slug}:target-profile:${seed.receptorProfile}`,
        axis: "target-profile",
        value: seed.receptorProfile,
        label: receptorProfileLabels[seed.receptorProfile],
        isPrimary: true,
        summary: seed.profileSummary,
        verification: pending(
          "Receptor profile is a navigation aid awaiting named pharmacology review.",
        ),
        sourceIds: [educationalDraftSource],
      },
      {
        id: `classification:${seed.slug}:structural-family:${classificationValue(seed.scaffoldFamily)}`,
        axis: "structural-family",
        value: classificationValue(seed.scaffoldFamily),
        label: seed.scaffoldFamily,
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
      summary: seed.profileSummary,
      learningContext:
        "Compare receptor-profile and scaffold differences while keeping identity, form, and evidence status separate.",
      verification: pending(
        "Educational framing requires named pharmacology review before publication.",
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
          note: "Computed PubChem conformer; it must never be labeled as an experimental bound pose.",
          reviewedAt: "2026-08-21",
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
          reviewedAt: "2026-08-21",
          reviewedBy: "Dev Molecules PubChem identity check",
        },
        sourceIds: [pubChemSourceId],
        limitations: [
          "The normalized parent is not the same record as every salt, solvate, stereoisomer or commercial product.",
        ],
      },
      {
        id: `claim:${seed.slug}:class`,
        subjectId: moleculeId,
        category: "classification",
        statement: seed.profileSummary,
        intent: "educational",
        evidenceLevel: "educational-simplification",
        verification: pending(
          "Review against an exact pharmacology source before elevating beyond educational status.",
        ),
        sourceIds: [educationalDraftSource],
        limitations: [
          "Receptor selectivity is context- and concentration-dependent; this label is a teaching lens, not clinical advice.",
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

export const betaBlockers: readonly MoleculeRecord[] = seeds.map(toRecord);

export const betaBlockerById = new Map(
  betaBlockers.map((molecule) => [molecule.id, molecule]),
);
