import type {
  CanonicalSynthesisRouteType,
  SynthesisLicenseState,
  SynthesisReviewState,
  SynthesisRouteCompleteness,
  SynthesisSourceKind,
} from "../../lib/domain/synthesis-route";

/**
 * Coverage-only public aggregate. No route, source, locator, material, step or
 * transformation record can be reconstructed from this object.
 */
export const PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE = {
  routeCount: 6,
  byType: {
    patent_reported: 5,
    literature_reported: 0,
    teaching_reconstruction: 1,
    computational_proposed: 0,
  } satisfies Readonly<Record<CanonicalSynthesisRouteType, number>>,
  byCompleteness: {
    complete: 2,
    partial: 0,
    upstream_gap: 3,
    convergent_partial: 1,
    unknown: 0,
  } satisfies Readonly<Record<SynthesisRouteCompleteness, number>>,
  byReviewState: {
    pending: 6,
    reviewed: 0,
    verified: 0,
    withdrawn: 0,
  } satisfies Readonly<Record<SynthesisReviewState, number>>,
  byLicenseState: {
    permitted: 0,
    attribution_required: 0,
    link_only: 6,
    restricted: 0,
    mixed: 0,
    unknown: 0,
  } satisfies Readonly<Record<SynthesisLicenseState, number>>,
  bySourceFamily: {
    patent: 6,
    journal: 0,
    aggregator: 0,
    open_reaction_dataset: 0,
  } satisfies Readonly<Record<SynthesisSourceKind, number>>,
  moleculeBestOutcome: {
    direct_complete_reported: 1,
    direct_partial_reported: 2,
    teaching_reconstruction_complete: 0,
    teaching_reconstruction_partial: 0,
    candidate_only: 1_165,
    access_blocked_only: 0,
    no_supporting_source_resolved: 384,
  },
  review: {
    pendingRouteIdentityCount: 3,
    multipleRouteIdentityCount: 3,
  },
  migration: {
    migrationVersion: "private-legacy-retirement-aggregate-1.0.0",
    expectedLegacyRouteCount: 6,
    legacyRouteCount: 6,
    accountedRouteCount: 6,
    evidenceCount: 6,
    excludedSourceContextStepCount: 3,
    excludedTargetFormStepCount: 1,
    invariants: {
      allSixLegacyRoutesAccounted: true,
      exactCidAndInchiKeyJoin: true,
      operationalDetailsIncluded: false,
    },
  },
} as const;

/**
 * This allowlist conveys exactly one public fact per identity: a direct-source
 * route candidate exists but is withheld pending review/rights clearance.
 */
export const PENDING_REPORTED_ROUTE_CONNECTIVITY_KEYS = new Set([
  "AQHHHDLHHXJYJD",
  "METKIMKYRPQLGS",
  "OGHNVEJMJSYVRP",
]);
