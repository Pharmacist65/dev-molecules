import type { SourceId, SourceReference } from "../domain";

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

const compounds = [
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
] as const;

export const sourceRegistry: readonly SourceReference[] = [
  ...compounds.flatMap(([slug, name, cid]) => [
    pubChemSource(name, cid),
    dailyMedSearchSource(slug, name),
  ]),
  {
    id: "source:dev-molecules-educational-draft-001",
    provider: "Dev Molecules editorial queue",
    kind: "internal-review",
    title: "Beta-blocker educational synthesis drafts",
    externalId: "DM-EDU-DRAFT-001",
    url: null,
    retrievedAt: RETRIEVED_AT,
    scope:
      "Non-operational educational outlines awaiting named medicinal/synthetic chemistry review.",
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

