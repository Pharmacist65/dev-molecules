import type { CatalogBrowseNavigator } from "./catalog-browse";
import {
  loadCatalogBrowseWindow,
  normalizeCatalogBrowseQuery,
  type CatalogBrowseRecord,
  type CatalogBrowseWindow,
  type LoadCatalogBrowseWindowOptions,
} from "./catalog-browse";

export type DrugAtlasView = "browse" | "spatial";

export type AtlasCoverageStatus =
  | "available"
  | "partial"
  | "pending-review"
  | "missing";

/**
 * A coverage chip describes whether content exists. It is not scientific
 * evidence and must never be used to promote an unreviewed claim.
 */
export interface AtlasCoverageChip {
  readonly id: string;
  readonly label: string;
  readonly status: AtlasCoverageStatus;
}

export type AtlasCoverageResolver = (
  record: CatalogBrowseRecord,
) => readonly AtlasCoverageChip[];

export interface DrugAtlasRecord extends CatalogBrowseRecord {
  readonly coverage: readonly AtlasCoverageChip[];
}

export interface DrugAtlasWindow extends Omit<CatalogBrowseWindow, "records"> {
  readonly records: readonly DrugAtlasRecord[];
}

export interface LoadDrugAtlasWindowOptions
  extends LoadCatalogBrowseWindowOptions {
  readonly identityCoverageLabel: string;
  readonly resolveCoverage?: AtlasCoverageResolver;
}

export type AtlasFilterReviewStatus =
  | "verified"
  | "expert-reviewed"
  | "source-supported";

export interface AtlasFilterOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/**
 * Facets are opt-in because the current compact index does not contain every
 * scientific classification. A host may expose a facet only when its complete
 * catalog query path and source are both available.
 */
export interface AtlasFilterFacet {
  readonly id: string;
  readonly label: string;
  readonly sourceLabel: string;
  readonly sourceHref: string;
  readonly reviewStatus: AtlasFilterReviewStatus;
  readonly options: readonly AtlasFilterOption[];
}

export type AtlasFilterSelection = Readonly<Record<string, string>>;

export interface DrugAtlasBrowseState {
  readonly query: string;
  readonly offset: number;
  readonly filters: AtlasFilterSelection;
}

export const DEFAULT_DRUG_ATLAS_BROWSE_STATE: DrugAtlasBrowseState = {
  query: "",
  offset: 0,
  filters: {},
};

/**
 * Restores only presentation state. Unknown filters and malformed storage are
 * harmless because scientific facet adapters still validate every selection.
 */
export function normalizeDrugAtlasBrowseState(
  value: unknown,
): DrugAtlasBrowseState {
  if (!value || typeof value !== "object") return DEFAULT_DRUG_ATLAS_BROWSE_STATE;
  const candidate = value as {
    readonly query?: unknown;
    readonly offset?: unknown;
    readonly filters?: unknown;
  };
  const query = typeof candidate.query === "string" && candidate.query.length <= 512
    ? normalizeCatalogBrowseQuery(candidate.query)
    : "";
  const offset = Number.isSafeInteger(candidate.offset) && Number(candidate.offset) >= 0
    ? Number(candidate.offset)
    : 0;
  const filters: Record<string, string> = {};
  if (candidate.filters && typeof candidate.filters === "object") {
    for (const [rawKey, rawValue] of Object.entries(candidate.filters)) {
      const key = rawKey.trim();
      const filterValue = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!key || key.length > 80 || !filterValue || filterValue.length > 160) continue;
      filters[key] = filterValue;
    }
  }
  return { query, offset, filters };
}

export interface AtlasFilteredWindowRequest {
  readonly query: string;
  readonly offset: number;
  readonly pageSize: number;
  readonly filters: AtlasFilterSelection;
}

/**
 * Filter controls and their complete-index query path travel together. This
 * prevents a presentation-only facet from filtering just the visible page.
 */
export interface AtlasFilterAdapter {
  readonly facets: readonly AtlasFilterFacet[];
  readonly loadWindow: (
    request: AtlasFilteredWindowRequest,
  ) => Promise<DrugAtlasWindow>;
}

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeCoverage = (
  chips: readonly AtlasCoverageChip[],
): readonly AtlasCoverageChip[] => {
  const unique = new Map<string, AtlasCoverageChip>();
  for (const chip of chips) {
    const id = chip.id.trim();
    const label = chip.label.trim();
    if (
      !id ||
      !label ||
      unique.has(id) ||
      !["available", "partial", "pending-review", "missing"].includes(
        chip.status,
      )
    ) continue;
    unique.set(id, { ...chip, id, label });
  }
  return [...unique.values()];
};

/**
 * Keeps absent or unverifiable taxonomy out of the visible filter UI. Counts
 * refer to the complete index, never just the current rendered page.
 */
export function getAvailableAtlasFilterFacets(
  facets: readonly AtlasFilterFacet[] = [],
): readonly AtlasFilterFacet[] {
  return facets.flatMap((facet) => {
    const id = facet.id.trim();
    const label = facet.label.trim();
    const sourceLabel = facet.sourceLabel.trim();
    const options = facet.options
      .filter(
        (option) =>
          option.id.trim().length > 0 &&
          option.label.trim().length > 0 &&
          Number.isSafeInteger(option.count) &&
          option.count > 0,
      )
      .map((option) => ({
        ...option,
        id: option.id.trim(),
        label: option.label.trim(),
      }));
    if (
      !id ||
      !label ||
      !sourceLabel ||
      !isHttpUrl(facet.sourceHref) ||
      !["verified", "expert-reviewed", "source-supported"].includes(
        facet.reviewStatus,
      ) ||
      options.length === 0
    ) {
      return [];
    }
    return [{ ...facet, id, label, sourceLabel, options }];
  });
}

/**
 * Reads the same compact complete-index window as CatalogBrowseDrawer. Entity
 * shards and 2D/3D structure bytes remain untouched until the thumbnail or
 * selection boundary explicitly hydrates one record.
 */
export async function loadDrugAtlasWindow(
  navigator: CatalogBrowseNavigator,
  options: LoadDrugAtlasWindowOptions,
): Promise<DrugAtlasWindow> {
  const page = await loadCatalogBrowseWindow(navigator, options);
  return {
    ...page,
    records: page.records.map((record) => {
      let resolved: readonly AtlasCoverageChip[] = [];
      try {
        resolved = options.resolveCoverage?.(record) ?? [];
      } catch {
        // Optional coverage metadata must never hide a valid catalog record.
      }
      return {
        ...record,
        coverage: normalizeCoverage([
          {
            id: "catalog-identity",
            label: options.identityCoverageLabel,
            status: "available",
          },
          ...resolved,
        ]),
      };
    }),
  };
}
