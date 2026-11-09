export const projectRoot = new URL("../../", import.meta.url);
export const snapshotUrl = new URL(
  "source-snapshots/drugcentral-fda-pubchem-eligible-v1.json",
  import.meta.url,
);
export const catalogOutputUrl = new URL("../../public/catalog/", import.meta.url);
export const catalogStructureOutputUrl = new URL(
  "../../public/catalog/structures/pubchem/",
  import.meta.url,
);

/**
 * The importer evaluates every row in the selected FDA-list snapshot. This is
 * a source-selection policy, not a hand-maintained drug-name allowlist.
 */
export const catalogSelectionPolicy = {
  jurisdictions: ["US"] as const,
  approvalRows: "all-source-rows" as const,
  requireCompleteDrugCentralStructure: true,
  requireExactPubChemInchiKey: true,
  requireVerifiedTwoDimensionalSdf: true,
  requireVerifiedThreeDimensionalSdf: true,
};

export const catalogSourceUrls = {
  drugCentralApproved: "https://drugcentral.org/static/FDA_Approved.csv",
  drugCentralStructures:
    "https://unmtid-dbs.net/download/DrugCentral/2021_09_01/structures.smiles.tsv",
  drugCentralLicense: "https://creativecommons.org/licenses/by-sa/4.0/",
  pubChemPugRest: "https://pubchem.ncbi.nlm.nih.gov/rest/pug",
  pubChemDocs: "https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest",
  openFdaDrugsFda: "https://api.fda.gov/drug/drugsfda.json",
} as const;
