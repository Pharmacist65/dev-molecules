export type EnrichmentAdapterId =
  | "DrugCentralApprovedDrugAdapter"
  | "PubChemStructureAdapter"
  | "DrugCentralTargetAdapter"
  | "ChEMBLBioactivityAdapter"
  | "GuideToPharmacologyAdapter"
  | "DailyMedLabelAdapter"
  | "OpenFdaLabelAdapter"
  | "AtcClassificationAdapter"
  | "ClinPgxAdapter"
  | "BindingDbAdapter";

export type RedistributionDecision =
  | "bundle-with-attribution"
  | "build-time-derived-fields-only"
  | "link-only"
  | "blocked-pending-permission";

export interface EnrichmentSourcePolicy {
  readonly adapter: EnrichmentAdapterId;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly licenseName: string;
  readonly licenseUrl: string;
  readonly access: "download" | "api" | "api-key-transition" | "website";
  readonly redistribution: RedistributionDecision;
  readonly requiresAttribution: boolean;
  readonly requiresShareAlike: boolean;
  readonly enabledForPublicBuild: boolean;
  readonly versionPolicy: string;
  readonly limitation: string;
}

export const enrichmentSourcePolicies: readonly EnrichmentSourcePolicy[] = [
  {
    adapter: "DrugCentralApprovedDrugAdapter",
    sourceName: "DrugCentral",
    sourceUrl: "https://drugcentral.org/",
    licenseName: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    access: "download",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: true,
    enabledForPublicBuild: true,
    versionPolicy: "Pin the source URL, capture timestamp, last-modified value and digest.",
    limitation: "Registry membership is not a substitute for application, product or active-moiety linkage.",
  },
  {
    adapter: "PubChemStructureAdapter",
    sourceName: "PubChem",
    sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/",
    licenseName: "NCBI database policy; submitter rights may vary",
    licenseUrl: "https://www.ncbi.nlm.nih.gov/home/about/policies/",
    access: "api",
    redistribution: "build-time-derived-fields-only",
    requiresAttribution: true,
    requiresShareAlike: false,
    enabledForPublicBuild: true,
    versionPolicy: "Pin CID, InChIKey, request URL, capture timestamp and asset digest.",
    limitation: "NCBI cannot grant rights it does not hold in third-party submissions; redistribution remains reviewable.",
  },
  {
    adapter: "DrugCentralTargetAdapter",
    sourceName: "DrugCentral target data",
    sourceUrl: "https://drugcentral.org/",
    licenseName: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    access: "download",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: true,
    enabledForPublicBuild: false,
    versionPolicy: "Enable only with a dated target snapshot and deterministic identity join report.",
    limitation: "No target snapshot is checked in for the current release.",
  },
  {
    adapter: "ChEMBLBioactivityAdapter",
    sourceName: "ChEMBL",
    sourceUrl: "https://www.ebi.ac.uk/chembl/",
    licenseName: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    access: "download",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: true,
    enabledForPublicBuild: false,
    versionPolicy: "Pin a ChEMBL release and preserve assay, species, unit and document identifiers.",
    limitation: "Cross-assay values are not directly comparable without matched conditions.",
  },
  {
    adapter: "GuideToPharmacologyAdapter",
    sourceName: "IUPHAR/BPS Guide to PHARMACOLOGY",
    sourceUrl: "https://www.guidetopharmacology.org/download.jsp",
    licenseName: "ODbL database / CC BY-SA 4.0 contents",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/",
    access: "api-key-transition",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: true,
    enabledForPublicBuild: false,
    versionPolicy: "Use a numbered download release; do not depend on browser-time REST access.",
    limitation: "The API is transitioning to registered API-key access; no versioned snapshot is checked in.",
  },
  {
    adapter: "DailyMedLabelAdapter",
    sourceName: "DailyMed",
    sourceUrl: "https://dailymed.nlm.nih.gov/dailymed/about-dailymed.cfm",
    licenseName: "Label content may retain manufacturer copyright",
    licenseUrl: "https://dailymed.nlm.nih.gov/dailymed/about-dailymed.cfm",
    access: "download",
    redistribution: "link-only",
    requiresAttribution: true,
    requiresShareAlike: false,
    enabledForPublicBuild: false,
    versionPolicy: "Pin SPL set/version and section locator; retain short structured fields, not copied label prose.",
    limitation: "DailyMed notes that in-use labeling may differ from the latest FDA-approved labeling.",
  },
  {
    adapter: "OpenFdaLabelAdapter",
    sourceName: "openFDA Structured Product Labeling",
    sourceUrl: "https://open.fda.gov/data/spl/",
    licenseName: "Public Domain / CC0 1.0",
    licenseUrl: "https://open.fda.gov/license/",
    access: "download",
    redistribution: "build-time-derived-fields-only",
    requiresAttribution: false,
    requiresShareAlike: false,
    enabledForPublicBuild: false,
    versionPolicy: "Pin export date and SPL identifiers; parse only explicitly mapped sections.",
    limitation: "openFDA warns that records are not validated for clinical or production use.",
  },
  {
    adapter: "AtcClassificationAdapter",
    sourceName: "WHO Collaborating Centre ATC/DDD",
    sourceUrl: "https://atcddd.fhi.no/atc_ddd_index/",
    licenseName: "Copyright — attribution required; no commercial copying or modification",
    licenseUrl: "https://atcddd.fhi.no/filearchive/publications/2026_guidelines_for_atc_classification_and_ddd_assignment.pdf",
    access: "website",
    redistribution: "blocked-pending-permission",
    requiresAttribution: true,
    requiresShareAlike: false,
    enabledForPublicBuild: false,
    versionPolicy: "Do not package an ATC hierarchy until a compatible permission or licensed source is recorded.",
    limitation: "Public-repository redistribution and translated hierarchy generation require a separate rights decision.",
  },
  {
    adapter: "ClinPgxAdapter",
    sourceName: "ClinPGx",
    sourceUrl: "https://api.clinpgx.org/",
    licenseName: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    access: "api",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: true,
    enabledForPublicBuild: false,
    versionPolicy: "Pin a release/export and limit requests to the published service rate.",
    limitation: "Pharmacogenomic guidance is not direct diagnostic advice and needs its own reviewed presentation.",
  },
  {
    adapter: "BindingDbAdapter",
    sourceName: "BindingDB",
    sourceUrl: "https://www.bindingdb.org/",
    licenseName: "CC BY 4.0 for BindingDB-curated data",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    access: "download",
    redistribution: "bundle-with-attribution",
    requiresAttribution: true,
    requiresShareAlike: false,
    enabledForPublicBuild: false,
    versionPolicy: "Pin a download release and keep measurement, target, species and source-document context.",
    limitation: "Only BindingDB-curated fields covered by the stated license may be promoted.",
  },
] as const;

export const getEnrichmentSourcePolicy = (
  adapter: EnrichmentAdapterId,
): EnrichmentSourcePolicy => {
  const policy = enrichmentSourcePolicies.find((item) => item.adapter === adapter);
  if (!policy) throw new Error(`Missing enrichment source policy for ${adapter}.`);
  return policy;
};

export const canBundleEnrichmentSource = (adapter: EnrichmentAdapterId): boolean => {
  const policy = getEnrichmentSourcePolicy(adapter);
  return (
    policy.enabledForPublicBuild &&
    policy.redistribution !== "link-only" &&
    policy.redistribution !== "blocked-pending-permission"
  );
};
