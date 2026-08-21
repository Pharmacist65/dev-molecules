import type {
  ChemicalFormId,
  MoleculeId,
  RegulatoryProductId,
  SourceId,
} from "@/lib/domain/ids";
import type { RegulatoryProductReference } from "@/lib/domain/molecule";

const RETRIEVED_AT = "2026-08-21";
const DATASET_LAST_UPDATED = "2026-08-20";

interface RegulatoryProductSeed {
  readonly slug: string;
  readonly applicationNumber: `${"NDA" | "ANDA"}${string}`;
  readonly productNumber: string;
  readonly brandName: string;
  readonly sponsorName: string;
  readonly activeIngredientName: string;
  readonly strength: string;
  readonly dosageForm: string;
  readonly route: string;
  readonly marketingStatus: "Prescription" | "Over-the-counter";
  readonly referenceDrug: "Yes" | "No";
  readonly referenceStandard: "Yes" | "No";
  readonly formId: ChemicalFormId;
  readonly actionDate: string;
  readonly canonicalSha256: string;
}

export const regulatoryProductSeeds: readonly RegulatoryProductSeed[] = [
  { slug: "propranolol", applicationNumber: "NDA018553", productNumber: "001", brandName: "INDERAL LA", sponsorName: "ANI PHARMS", activeIngredientName: "PROPRANOLOL HYDROCHLORIDE", strength: "160MG", dosageForm: "CAPSULE, EXTENDED RELEASE", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:propranolol:hydrochloride", actionDate: "1983-04-19", canonicalSha256: "764df31e9bf7129ed5159e5e423792d4cc5cd672b02774881a54f5a899603f97" },
  { slug: "metoprolol", applicationNumber: "NDA017963", productNumber: "001", brandName: "LOPRESSOR", sponsorName: "VALIDUS PHARMS", activeIngredientName: "METOPROLOL TARTRATE", strength: "50MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "No", formId: "form:metoprolol:tartrate", actionDate: "1978-08-07", canonicalSha256: "d9e2d555955ae551b223510790d86d771d6895a94d86b110579ea54d440cb08e" },
  { slug: "atenolol", applicationNumber: "NDA018240", productNumber: "002", brandName: "TENORMIN", sponsorName: "TWI PHARMS", activeIngredientName: "ATENOLOL", strength: "100MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:atenolol:free-base", actionDate: "1981-08-19", canonicalSha256: "2d97d271cbb414696bb7d0aeaea68b8e46cfdaf4d2b258a59a9cdf0fcd1800ea" },
  { slug: "bisoprolol", applicationNumber: "ANDA078635", productNumber: "002", brandName: "BISOPROLOL FUMARATE", sponsorName: "UNICHEM", activeIngredientName: "BISOPROLOL FUMARATE", strength: "10MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "No", referenceStandard: "Yes", formId: "form:bisoprolol:fumarate", actionDate: "2009-08-18", canonicalSha256: "ad278e56e75e6ebf7ac25148030bd6bffd4fb1cfb076e59ef032c563fbc3b9a5" },
  { slug: "carvedilol", applicationNumber: "NDA020297", productNumber: "002", brandName: "COREG", sponsorName: "WAYLIS THERAP", activeIngredientName: "CARVEDILOL", strength: "12.5MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:carvedilol:free-base", actionDate: "1995-09-14", canonicalSha256: "87a77baaa8e12996595400f3adfef3b6eed396ac06201176728322e34b10e36e" },
  { slug: "labetalol", applicationNumber: "NDA213330", productNumber: "006", brandName: "LABETALOL HYDROCHLORIDE", sponsorName: "HIKMA", activeIngredientName: "LABETALOL HYDROCHLORIDE", strength: "20MG/4ML (5MG/ML)", dosageForm: "SOLUTION", route: "INTRAVENOUS", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:labetalol:hydrochloride", actionDate: "2020-11-09", canonicalSha256: "f928df55ba06e82e7507c145723402521a48e250ef502db84d1583ce0ee88743" },
  { slug: "timolol", applicationNumber: "NDA019463", productNumber: "001", brandName: "TIMOPTIC IN OCUDOSE", sponsorName: "BAUSCH AND LOMB INC", activeIngredientName: "TIMOLOL MALEATE", strength: "EQ 0.25% BASE", dosageForm: "SOLUTION/DROPS", route: "OPHTHALMIC", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:timolol:maleate", actionDate: "1986-11-05", canonicalSha256: "477504840b44c49b827d24efa56efb805545f2d889cd8fa7cf71446fa8d38201" },
  { slug: "nadolol", applicationNumber: "ANDA203455", productNumber: "003", brandName: "NADOLOL", sponsorName: "INVAGEN PHARMS", activeIngredientName: "NADOLOL", strength: "80MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "No", referenceStandard: "Yes", formId: "form:nadolol:free-base", actionDate: "2015-12-18", canonicalSha256: "29b1bc2603ecd3bfc49f6d997300cf8719aeb8664880d4ec270e004a5ab1e9d8" },
  { slug: "nebivolol", applicationNumber: "NDA021742", productNumber: "005", brandName: "BYSTOLIC", sponsorName: "ALLERGAN", activeIngredientName: "NEBIVOLOL HYDROCHLORIDE", strength: "EQ 20MG BASE", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:nebivolol:hydrochloride", actionDate: "2007-12-17", canonicalSha256: "46c093cc154673875b6b3d997c1b7a7ae982640043ebe5338ab1fdbf99677781" },
  { slug: "acebutolol", applicationNumber: "ANDA075047", productNumber: "001", brandName: "ACEBUTOLOL HYDROCHLORIDE", sponsorName: "AMNEAL PHARM", activeIngredientName: "ACEBUTOLOL HYDROCHLORIDE", strength: "EQ 200MG BASE", dosageForm: "CAPSULE", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "No", referenceStandard: "Yes", formId: "form:acebutolol:hydrochloride", actionDate: "1999-12-30", canonicalSha256: "5ce3f786bbc9883d3035f21f6116268611b00817333402cb5ad44652f31f0855" },
  { slug: "aspirin", applicationNumber: "NDA203697", productNumber: "001", brandName: "VAZALORE", sponsorName: "PLX PHARMA", activeIngredientName: "ASPIRIN", strength: "325MG", dosageForm: "CAPSULE", route: "ORAL", marketingStatus: "Over-the-counter", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:aspirin:free-acid", actionDate: "2013-01-14", canonicalSha256: "4223740c75829caa842d0228681b17b678ec411ab3381b6544cc0df95e090a39" },
  { slug: "ibuprofen", applicationNumber: "NDA020516", productNumber: "001", brandName: "CHILDREN'S MOTRIN", sponsorName: "KENVUE BRANDS", activeIngredientName: "IBUPROFEN", strength: "100MG/5ML", dosageForm: "SUSPENSION", route: "ORAL", marketingStatus: "Over-the-counter", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:ibuprofen:free-acid", actionDate: "1995-06-16", canonicalSha256: "1d2e21e7a4d70a46c09e151737094a7abcd6f7eab60bbef5283a68a3639556d3" },
  { slug: "naproxen", applicationNumber: "NDA017581", productNumber: "004", brandName: "NAPROSYN", sponsorName: "ATNAHS PHARMA US", activeIngredientName: "NAPROXEN", strength: "500MG", dosageForm: "TABLET", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:naproxen:free-acid", actionDate: "1976-03-11", canonicalSha256: "cd172e0cbb9d7c3ff74bd135263e141a9a769b9d9b599c84d48a4f0898bd8fec" },
  { slug: "diclofenac", applicationNumber: "NDA022122", productNumber: "001", brandName: "VOLTAREN ARTHRITIS PAIN", sponsorName: "HALEON US HOLDINGS", activeIngredientName: "DICLOFENAC SODIUM", strength: "1%", dosageForm: "GEL", route: "TOPICAL", marketingStatus: "Over-the-counter", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:diclofenac:sodium", actionDate: "2007-10-17", canonicalSha256: "13c4fbcd527387ac9c18a33d54ecda32a4f94ec964f69f743e03bc900e2dc4ed" },
  { slug: "celecoxib", applicationNumber: "NDA020998", productNumber: "003", brandName: "CELEBREX", sponsorName: "UPJOHN", activeIngredientName: "CELECOXIB", strength: "400MG", dosageForm: "CAPSULE", route: "ORAL", marketingStatus: "Prescription", referenceDrug: "Yes", referenceStandard: "Yes", formId: "form:celecoxib:neutral", actionDate: "1998-12-31", canonicalSha256: "15defd1b41112acea38201eb24a6b8b5aa3f90a51d840037dc3d4149c20b47ff" },
] as const;

function apiQueryUrl(applicationNumber: string) {
  return `https://api.fda.gov/drug/drugsfda.json?search=application_number%3A%22${applicationNumber}%22&limit=1`;
}

function overviewUrl(applicationNumber: string) {
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${applicationNumber.slice(-6)}`;
}

/** Exact normalized payload hashed during the 2026-08-21 openFDA audit. */
export function canonicalRegulatorySnapshot(seed: RegulatoryProductSeed) {
  return {
    slug: seed.slug,
    datasetLastUpdated: DATASET_LAST_UPDATED,
    applicationNumber: seed.applicationNumber,
    sponsorName: seed.sponsorName,
    productNumber: seed.productNumber,
    brandName: seed.brandName,
    activeIngredients: [
      { name: seed.activeIngredientName, strength: seed.strength },
    ],
    dosageForm: seed.dosageForm,
    route: seed.route,
    marketingStatus: seed.marketingStatus,
    referenceDrug: seed.referenceDrug,
    referenceStandard: seed.referenceStandard,
    submissionType: "ORIG" as const,
    submissionNumber: "1" as const,
    submissionStatus: "AP" as const,
    submissionStatusDate: seed.actionDate.replaceAll("-", ""),
  };
}

export function regulatorySourceId(applicationNumber: string, productNumber: string): SourceId {
  return `source:drugsfda-${applicationNumber.toLowerCase()}-${productNumber}` as SourceId;
}

export const regulatoryProducts: readonly RegulatoryProductReference[] =
  regulatoryProductSeeds.map((seed) => {
    const moleculeId = `molecule:${seed.slug}` as MoleculeId;
    const sourceId = regulatorySourceId(seed.applicationNumber, seed.productNumber);
    return {
      id: `regulatory-product:${seed.slug}:${seed.applicationNumber.toLowerCase()}:${seed.productNumber}` as RegulatoryProductId,
      moleculeId,
      authority: "US FDA",
      jurisdiction: "US",
      applicationNumber: seed.applicationNumber,
      productNumber: seed.productNumber,
      brandName: seed.brandName,
      sponsorName: seed.sponsorName,
      activeIngredient: { name: seed.activeIngredientName, strength: seed.strength },
      dosageForm: seed.dosageForm,
      route: seed.route,
      marketingStatus: seed.marketingStatus,
      referenceDrug: seed.referenceDrug,
      referenceStandard: seed.referenceStandard,
      chemicalFormId: seed.formId,
      relationship: "approved-product-linked-via-chemical-form",
      approvalAction: {
        submissionType: "ORIG",
        submissionNumber: "1",
        submissionStatus: "AP",
        actionDate: seed.actionDate,
      },
      datasetLastUpdated: DATASET_LAST_UPDATED,
      retrievedAt: RETRIEVED_AT,
      canonicalSha256: seed.canonicalSha256,
      apiQueryUrl: apiQueryUrl(seed.applicationNumber),
      sourceId,
      sourceUrl: overviewUrl(seed.applicationNumber),
      verification: {
        status: "verified",
        note: "Exact Drugs@FDA application/product and ORIG/1/AP action cross-checked; approval is scoped to the linked pharmaceutical form and product.",
        reviewedBy: "Dev Molecules Drugs@FDA exact product audit",
        reviewedAt: RETRIEVED_AT,
      },
      limitations: [
        "This is a product/form approval anchor, not a claim that the normalized PubChem parent CID is itself the marketed form.",
        "The action date belongs to this application's ORIG/1/AP record and is not necessarily the active moiety's first-ever approval date.",
        "Marketing status is a dated Drugs@FDA snapshot and may change after retrieval.",
      ],
    };
  });

const groupedRegulatoryProducts = new Map<MoleculeId, RegulatoryProductReference[]>();
for (const product of regulatoryProducts) {
  const current = groupedRegulatoryProducts.get(product.moleculeId) ?? [];
  if (current.some((candidate) => candidate.id === product.id)) {
    throw new Error(`Duplicate regulatory product ID: ${product.id}`);
  }
  groupedRegulatoryProducts.set(product.moleculeId, [...current, product]);
}

export const regulatoryProductsByMoleculeId: ReadonlyMap<
  MoleculeId,
  readonly RegulatoryProductReference[]
> = groupedRegulatoryProducts;

export function getRegulatoryProductsForMolecule(
  moleculeId: MoleculeId,
): readonly RegulatoryProductReference[] {
  return regulatoryProductsByMoleculeId.get(moleculeId) ?? [];
}
