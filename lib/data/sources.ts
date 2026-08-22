import type { SourceId, SourceReference } from "../domain";
import {
  regulatoryProductSeeds,
  regulatorySourceId,
} from "./regulatory-approvals";
import { synthesisSourceRegistry } from "./synthesis-sources";

const RETRIEVED_AT = "2026-08-21";

const pubChemSource = (
  name: string,
  cid: number,
): SourceReference => ({
  id: `source:pubchem-${cid}`,
  provider: "PubChem",
  kind: "curated-database",
  title: `${name} — PubChem Compound Summary`,
  externalId: `PubChem CID ${cid}`,
  url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  retrievedAt: RETRIEVED_AT,
  scope:
    "Normalized compound identity and PubChem-computed structure descriptors. " +
    "A computed conformer is not an experimental bound pose.",
  license: {
    label: "PubChem terms; depositor annotations may carry source-specific terms",
    url: "https://pubchem.ncbi.nlm.nih.gov/docs/copyright",
    reuseStatus: "unknown",
  },
  verification: {
    status: "verified",
    note: "CID, formula, molecular weight, SMILES and InChIKey checked via PUG REST.",
    reviewedAt: RETRIEVED_AT,
    reviewedBy: "Dev Molecules PubChem identity check",
  },
});

const dailyMedSearchSource = (slug: string, name: string): SourceReference => ({
  id: `source:dailymed-${slug}`,
  provider: "DailyMed",
  kind: "regulatory-label",
  title: `${name} — DailyMed label search`,
  externalId: `DailyMed search: ${name}`,
  url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(name)}`,
  retrievedAt: RETRIEVED_AT,
  scope:
    "Discovery link for US product labels and pharmaceutical-form review. " +
    "It is not yet pinned to an exact label set ID.",
  license: {
    label: "US National Library of Medicine terms",
    url: "https://www.nlm.nih.gov/web_policies.html",
    reuseStatus: "unknown",
  },
  verification: {
    status: "pending-review",
    note: "An expert/editor must select and record exact label set IDs before publication.",
  },
});

const drugsFdaProductSource = (
  seed: (typeof regulatoryProductSeeds)[number],
): SourceReference => ({
  id: regulatorySourceId(seed.applicationNumber, seed.productNumber),
  provider: "US FDA Drugs@FDA",
  kind: "regulatory-label",
  title: `${seed.brandName} — ${seed.applicationNumber} product ${seed.productNumber}`,
  externalId: `${seed.applicationNumber} / product ${seed.productNumber} / ORIG-1-AP`,
  url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${seed.applicationNumber.slice(-6)}`,
  retrievedAt: RETRIEVED_AT,
  scope:
    `Exact Drugs@FDA application/product anchor for ${seed.activeIngredientName}. ` +
    "Approval is scoped to the linked pharmaceutical form and product; it is not assigned directly to the normalized PubChem parent.",
  license: {
    label: "Official US FDA data; openFDA terms",
    url: "https://open.fda.gov/license/",
    reuseStatus: "unknown",
  },
  verification: {
    status: "verified",
    note: `Exact product ${seed.productNumber} and ORIG/1/AP action checked in the Drugs@FDA snapshot updated 2026-08-20.`,
    reviewedBy: "Dev Molecules Drugs@FDA exact product audit",
    reviewedAt: RETRIEVED_AT,
  },
});

const catalogCompounds = [
  ["propranolol", "Propranolol", 4946],
  ["metoprolol", "Metoprolol", 4171],
  ["atenolol", "Atenolol", 2249],
  ["bisoprolol", "Bisoprolol", 2405],
  ["carvedilol", "Carvedilol", 2585],
  ["labetalol", "Labetalol", 3869],
  ["timolol", "Timolol", 33624],
  ["nadolol", "Nadolol", 39147],
  ["nebivolol", "Nebivolol", 71301],
  ["acebutolol", "Acebutolol", 1978],
  ["aspirin", "Aspirin", 2244],
  ["ibuprofen", "Ibuprofen", 3672],
  ["naproxen", "Naproxen", 156391],
  ["diclofenac", "Diclofenac", 3033],
  ["celecoxib", "Celecoxib", 2662],
] as const;

export const sourceRegistry: readonly SourceReference[] = [
  ...catalogCompounds.flatMap(([slug, name, cid]) => [
    pubChemSource(name, cid),
    dailyMedSearchSource(slug, name),
  ]),
  ...regulatoryProductSeeds.map(drugsFdaProductSource),
  ...synthesisSourceRegistry,
  {
    id: "source:dev-molecules-educational-draft-001",
    provider: "Dev Molecules editorial queue",
    kind: "internal-review",
    title: "Catalog classification and educational profile drafts",
    externalId: "DM-EDU-DRAFT-001",
    url: null,
    retrievedAt: RETRIEVED_AT,
    scope:
      "Cross-family navigation classifications and non-operational educational outlines awaiting named chemistry and pharmacology review.",
    license: {
      label: "Internal draft — do not publish as a scientific source",
      url: null,
      reuseStatus: "restricted",
    },
    verification: {
      status: "pending-review",
      note: "This record is a workflow marker, not external evidence.",
    },
  },
] satisfies readonly SourceReference[];

export const sourceById: ReadonlyMap<SourceId, SourceReference> = new Map(
  sourceRegistry.map((source) => [source.id, source]),
);
