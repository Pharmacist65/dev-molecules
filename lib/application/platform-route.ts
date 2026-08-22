export type PlatformSection =
  | "home"
  | "atlas"
  | "drug"
  | "family"
  | "academy"
  | "lab"
  | "instructor"
  | "reviewer";

export type AtlasView = "browse" | "spatial";
export type AcademyArea =
  | "home"
  | "module"
  | "nomenclature"
  | "pharmacology"
  | "synthesis";

export interface PlatformRoute {
  readonly section: PlatformSection;
  readonly atlasView?: AtlasView;
  readonly academyArea?: AcademyArea;
  readonly slug?: string;
  readonly familyId?: string;
  readonly lessonId?: string;
  readonly routeId?: string;
  /**
   * A replacement is used only for retired top-level names and empty/unknown
   * hashes. Molecular deep links remain untouched so the existing spatial
   * controller can continue to resolve them without a second router.
   */
  readonly canonicalHash?: string;
  readonly legacySpatialHash?: boolean;
}
export const DEFAULT_PLATFORM_ROUTE: PlatformRoute = {
  section: "home",
  canonicalHash: "#home",
};

const SAFE_SEGMENT_LIMIT = 512;

function decodeSegment(value: string | undefined): string | undefined {
  if (!value || value.length > SAFE_SEGMENT_LIMIT) return undefined;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded && decoded.length <= SAFE_SEGMENT_LIMIT ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function withoutQuery(hash: string) {
  const queryIndex = hash.indexOf("?");
  return queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
}

/**
 * Pure, fail-closed hash parser for GitHub Pages. It never infers a scientific
 * entity from a malformed URL and keeps the established Explore deep links as
 * adapters rather than silently changing their meaning.
 */
export function parsePlatformHash(rawHash: string): PlatformRoute {
  const normalized = withoutQuery(rawHash.trim()).replace(/^#\/?/, "");
  const [head = "", second, third, fourth] = normalized.split("/");

  if (!head || head === "home") {
    return head ? { section: "home" } : DEFAULT_PLATFORM_ROUTE;
  }

  if (head === "atlas") {
    return {
      section: "atlas",
      atlasView: second === "spatial" ? "spatial" : "browse",
    };
  }

  if (head === "drug") {
    const slug = decodeSegment(second);
    return slug
      ? { section: "drug", slug }
      : { section: "atlas", atlasView: "browse", canonicalHash: "#atlas" };
  }

  if (head === "family") {
    const familyId = decodeSegment(second);
    return familyId
      ? { section: "family", familyId }
      : { section: "atlas", atlasView: "browse", canonicalHash: "#atlas" };
  }

  if (head === "academy") {
    if (second === "module") {
      const lessonId = decodeSegment(third);
      return lessonId
        ? { section: "academy", academyArea: "module", lessonId }
        : { section: "academy", academyArea: "home", canonicalHash: "#academy" };
    }
    if (second === "nomenclature" || second === "pharmacology") {
      return {
        section: "academy",
        academyArea: second,
        lessonId: decodeSegment(third),
      };
    }
    if (second === "synthesis") {
      return {
        section: "academy",
        academyArea: "synthesis",
        slug: decodeSegment(third),
        routeId: decodeSegment(fourth),
      };
    }
    return { section: "academy", academyArea: "home" };
  }

  if (head === "lab") return { section: "lab" };
  if (head === "instructor") return { section: "instructor" };
  if (head === "reviewer") return { section: "reviewer" };

  const legacyTopLevel: Readonly<Record<string, PlatformRoute>> = {
    explore: {
      section: "atlas",
      atlasView: "spatial",
      canonicalHash: "#atlas/spatial",
    },
    learn: {
      section: "academy",
      academyArea: "home",
      canonicalHash: "#academy",
    },
    build: { section: "lab", canonicalHash: "#lab" },
    teach: { section: "instructor", canonicalHash: "#instructor" },
    discover: { section: "reviewer", canonicalHash: "#reviewer" },
  };
  if (legacyTopLevel[head]) return legacyTopLevel[head];

  if (
    head === "universe" ||
    head === "molecule" ||
    head === "cluster" ||
    head === "compare"
  ) {
    return {
      section: "atlas",
      atlasView: "spatial",
      legacySpatialHash: true,
    };
  }

  return DEFAULT_PLATFORM_ROUTE;
}

export function getPrimaryNavigationSection(route: PlatformRoute): PlatformSection {
  if (route.section === "drug" || route.section === "family") return "atlas";
  return route.section;
}

export function getDrugHash(slug: string): string {
  const normalized = slug.trim();
  if (!normalized || normalized.length > SAFE_SEGMENT_LIMIT) return "#atlas";
  return `#drug/${encodeURIComponent(normalized)}`;
}
