import type { SourceId, SourceReference } from "../domain";

const RETRIEVED_AT = "2026-08-22";

/**
 * Primary documents supporting the three seed synthesis stories. The routes
 * cite exact examples, while the product deliberately omits operational
 * quantities, conditions and work-up instructions.
 */
export const synthesisSourceRegistry = [
  {
    id: "source:patent-us3337628a",
    provider: "United States Patent and Trademark Office",
    kind: "patent",
    title: "3-Naphthyloxy-2-hydroxypropylamines",
    externalId: "US 3,337,628 A",
    url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3337628",
    retrievedAt: RETRIEVED_AT,
    scope:
      "Primary patent document. Example 4 reports conversion of a naphthoxy epoxide and isopropylamine to the propranolol free-base connectivity; this record does not reproduce laboratory conditions.",
    license: {
      label: "Public patent document; verify downstream reuse requirements",
      url: "https://www.uspto.gov/terms-use-uspto-websites",
      reuseStatus: "unknown",
    },
    verification: {
      status: "source-supported",
      note: "Patent number, title, Example 4 and named product were checked against the primary patent text.",
      reviewedBy: "Dev Molecules primary-source audit",
      reviewedAt: RETRIEVED_AT,
    },
  },
  {
    id: "source:patent-us3663607a",
    provider: "United States Patent and Trademark Office",
    kind: "patent",
    title: "1-Carbamoylalkyl phenoxy-3-amino-2-propanols",
    externalId: "US 3,663,607 A",
    url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3663607",
    retrievedAt: RETRIEVED_AT,
    scope:
      "Primary patent document. Example 1 and its immediately following precursor paragraph report the glycidyl-ether intermediate and atenolol connectivity; operational details are excluded here.",
    license: {
      label: "Public patent document; verify downstream reuse requirements",
      url: "https://www.uspto.gov/terms-use-uspto-websites",
      reuseStatus: "unknown",
    },
    verification: {
      status: "source-supported",
      note: "Patent number, title, Example 1, precursor paragraph and named product were checked against the primary patent text.",
      reviewedBy: "Dev Molecules primary-source audit",
      reviewedAt: RETRIEVED_AT,
    },
  },
  {
    id: "source:patent-us4503067a",
    provider: "United States Patent and Trademark Office",
    kind: "patent",
    title:
      "Carbazolyl-(4)-oxypropanolamine compounds and therapeutic compositions",
    externalId: "US 4,503,067 A",
    url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4503067",
    retrievedAt: RETRIEVED_AT,
    scope:
      "Primary patent document. Example 2 reports formation of the carvedilol parent connectivity from the carbazole epoxide and aminoethyl aryl ether; operational details are excluded here.",
    license: {
      label: "Public patent document; verify downstream reuse requirements",
      url: "https://www.uspto.gov/terms-use-uspto-websites",
      reuseStatus: "unknown",
    },
    verification: {
      status: "source-supported",
      note: "Patent number, title, Example 2, starting materials and named product were checked against the primary patent text.",
      reviewedBy: "Dev Molecules primary-source audit",
      reviewedAt: RETRIEVED_AT,
    },
  },
] satisfies readonly SourceReference[];

export const synthesisSourceById: ReadonlyMap<SourceId, SourceReference> =
  new Map(synthesisSourceRegistry.map((source) => [source.id, source]));
