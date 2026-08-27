import {
  SYNTHESIS_LICENSE_STATES,
  SYNTHESIS_REVIEW_STATES,
  SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  SYNTHESIS_ROUTE_TYPES,
  type CanonicalSynthesisRoute,
  type CanonicalSynthesisRouteId,
  type CanonicalSynthesisRouteType,
  type CanonicalSynthesisStepId,
  type SynthesisLicenseState,
  type SynthesisReviewState,
  type SynthesisRouteCompleteness,
  type SynthesisSourceEvidence,
  type SynthesisSourceKind,
} from "../../lib/domain/synthesis-route";
import {
  validateCanonicalSynthesisRoute,
} from "../../lib/domain/synthesis-validation";

/**
 * Historical aggregate retained for migration verification only. It is not a
 * product/schema ceiling and carries no route, source, material or locator data.
 */
export const LEGACY_SYNTHESIS_ROUTE_COUNT = 6;

const ACCEPTED_ROUTE_TYPE_COUNTS: Readonly<Record<CanonicalSynthesisRouteType, number>> = {
  patent_reported: 5,
  literature_reported: 0,
  teaching_reconstruction: 1,
  computational_proposed: 0,
};

const ACCEPTED_COMPLETENESS_COUNTS: Readonly<Record<SynthesisRouteCompleteness, number>> = {
  complete: 2,
  partial: 0,
  upstream_gap: 3,
  convergent_partial: 1,
  unknown: 0,
};

const ACCEPTED_REVIEW_STATE_COUNTS: Readonly<Record<SynthesisReviewState, number>> = {
  pending: 6,
  reviewed: 0,
  verified: 0,
  withdrawn: 0,
};

const ACCEPTED_LICENSE_STATE_COUNTS: Readonly<Record<SynthesisLicenseState, number>> = {
  permitted: 0,
  attribution_required: 0,
  link_only: 6,
  restricted: 0,
  mixed: 0,
  unknown: 0,
};

const SYNTHESIS_SOURCE_KINDS = [
  "patent",
  "journal",
  "aggregator",
  "open_reaction_dataset",
] as const satisfies readonly SynthesisSourceKind[];

const ACCEPTED_EVIDENCE_SOURCE_KIND_COUNTS: Readonly<Record<SynthesisSourceKind, number>> = {
  patent: 6,
  journal: 0,
  aggregator: 0,
  open_reaction_dataset: 0,
};

const ACCEPTED_EXCLUDED_SOURCE_CONTEXT_STEP_COUNT = 3;
const ACCEPTED_EXCLUDED_TARGET_FORM_STEP_COUNT = 1;

export type LegacyStepExclusionReason =
  | "source_context_not_promoted"
  | "target_form_identity_divergence"
  | "evidence_gap_not_promoted"
  | "outside_exact_target_path";

export type PrivateLegacyStepDisposition =
  | {
      readonly legacyStepRef: string;
      readonly disposition: "retained";
      readonly canonicalStepId: CanonicalSynthesisStepId;
      readonly exclusionReason: null;
    }
  | {
      readonly legacyStepRef: string;
      readonly disposition: "excluded";
      readonly canonicalStepId: null;
      readonly exclusionReason: LegacyStepExclusionReason;
    };

/**
 * Private, generic accounting for the legacy rows. The opaque refs may be
 * hashes. This proves that every legacy route and step was disposed without
 * requiring real molecule, source, material or locator data in public source.
 */
export interface PrivateLegacyRouteAuditEntry {
  readonly legacyRouteRef: string;
  readonly canonicalRouteId: CanonicalSynthesisRouteId;
  readonly legacyTargetIdentity: {
    readonly catalogEntityId: string;
    readonly pubChemCid: number;
    readonly inchiKey: string;
  };
  readonly legacyStepCount: number;
  readonly stepDispositions: readonly PrivateLegacyStepDisposition[];
}

export interface LegacySynthesisMigrationReport {
  readonly schemaVersion: 1;
  readonly migrationVersion: string;
  readonly expectedLegacyRouteCount: number;
  readonly legacyRouteCount: number;
  readonly accountedRouteCount: number;
  readonly evidenceCount: number;
  readonly routeTypeCounts: Readonly<Record<CanonicalSynthesisRouteType, number>>;
  readonly routeCompletenessCounts: Readonly<Record<SynthesisRouteCompleteness, number>>;
  readonly reviewStateCounts: Readonly<Record<SynthesisReviewState, number>>;
  readonly licenseStateCounts: Readonly<Record<SynthesisLicenseState, number>>;
  readonly evidenceSourceKindCounts: Readonly<Record<SynthesisSourceKind, number>>;
  readonly patentFamilyCount: number;
  readonly excludedSourceContextStepCount: number;
  readonly excludedTargetFormStepCount: number;
  readonly invariants: {
    readonly allSixLegacyRoutesAccounted: boolean;
    readonly exactCidAndInchiKeyJoin: boolean;
    readonly operationalDetailsIncluded: boolean;
  };
}

export interface PrivateSynthesisMigrationInput {
  readonly schemaVersion: 1;
  readonly routes: readonly CanonicalSynthesisRoute[];
  readonly evidence: readonly SynthesisSourceEvidence[];
  readonly legacyAudit: readonly PrivateLegacyRouteAuditEntry[];
  /** Every reported count/invariant is checked against a fresh derivation. */
  readonly migrationReport: LegacySynthesisMigrationReport;
}

export interface MigrateLegacySynthesisRoutesOptions {
  /**
   * Canonical private-review payload supplied by an out-of-repository process.
   * Public source never bundles or reconstructs real pending route details.
   */
  readonly privateInput?: PrivateSynthesisMigrationInput;
}

export interface LegacySynthesisMigrationResult {
  readonly routes: readonly CanonicalSynthesisRoute[];
  readonly evidence: readonly SynthesisSourceEvidence[];
  readonly migrationReport: LegacySynthesisMigrationReport;
}

const unique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

const nonBlank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const countValues = <Key extends string>(
  keys: readonly Key[],
  values: readonly Key[],
): Readonly<Record<Key, number>> => {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>;
  values.forEach((value) => {
    counts[value] += 1;
  });
  return counts;
};

const countRecordsEqual = <Key extends string>(
  keys: readonly Key[],
  left: Readonly<Record<Key, number>>,
  right: unknown,
): boolean => {
  if (!right || typeof right !== "object" || Array.isArray(right)) return false;
  const candidate = right as Readonly<Record<string, unknown>>;
  const candidateKeys = Object.keys(candidate).sort((a, b) => a.localeCompare(b, "en"));
  const expectedKeys = [...keys].sort((a, b) => a.localeCompare(b, "en"));
  return candidateKeys.length === expectedKeys.length &&
    candidateKeys.every((key, index) => key === expectedKeys[index]) &&
    keys.every((key) => candidate[key] === left[key]);
};

const setsEqual = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean =>
  left.size === right.size && [...left].every((value) => right.has(value));

interface DerivedLegacyAudit {
  readonly allSixLegacyRoutesAccounted: boolean;
  readonly exactCidAndInchiKeyJoin: boolean;
  readonly excludedSourceContextStepCount: number;
  readonly excludedTargetFormStepCount: number;
}

const deriveLegacyAudit = (
  routes: readonly CanonicalSynthesisRoute[],
  entries: readonly PrivateLegacyRouteAuditEntry[],
): DerivedLegacyAudit => {
  const routeById = new Map(routes.map((route) => [route.id, route] as const));
  const routeIds = new Set(routeById.keys());
  const legacyRefs = entries.map((entry) => entry.legacyRouteRef);
  const auditedRouteIds = entries.map((entry) => entry.canonicalRouteId);
  let stepAccountingValid = true;
  let exactCidAndInchiKeyJoin = true;
  let excludedSourceContextStepCount = 0;
  let excludedTargetFormStepCount = 0;

  for (const entry of entries) {
    const route = routeById.get(entry.canonicalRouteId);
    const dispositions = Array.isArray(entry.stepDispositions)
      ? entry.stepDispositions
      : [];
    const legacyStepRefs = dispositions.map((item) => item.legacyStepRef);
    const retained = dispositions.filter((item) => item.disposition === "retained");
    const excluded = dispositions.filter((item) => item.disposition === "excluded");
    const retainedCanonicalStepIds = retained.map((item) => item.canonicalStepId);
    const routeStepIds = new Set(route?.steps.map((step) => step.id) ?? []);

    if (
      !route ||
      !nonBlank(entry.legacyRouteRef) ||
      !Number.isSafeInteger(entry.legacyStepCount) ||
      entry.legacyStepCount < 1 ||
      entry.legacyStepCount !== dispositions.length ||
      !unique(legacyStepRefs) ||
      legacyStepRefs.some((ref) => !nonBlank(ref)) ||
      !unique(retainedCanonicalStepIds) ||
      !setsEqual(new Set(retainedCanonicalStepIds), routeStepIds) ||
      retained.some((item) => item.exclusionReason !== null) ||
      excluded.some((item) => item.canonicalStepId !== null) ||
      dispositions.some((item) =>
        item.disposition !== "retained" && item.disposition !== "excluded"
      )
    ) {
      stepAccountingValid = false;
    }

    for (const item of excluded) {
      if (item.exclusionReason === "source_context_not_promoted") {
        excludedSourceContextStepCount += 1;
      } else if (item.exclusionReason === "target_form_identity_divergence") {
        excludedTargetFormStepCount += 1;
      } else if (
        item.exclusionReason !== "evidence_gap_not_promoted" &&
        item.exclusionReason !== "outside_exact_target_path"
      ) {
        stepAccountingValid = false;
      }
    }

    const target = route?.materials.find((material) =>
      material.id === route.targetMaterialId
    );
    if (
      !route ||
      !target ||
      !nonBlank(entry.legacyTargetIdentity.catalogEntityId) ||
      entry.legacyTargetIdentity.catalogEntityId !== route.identityScope.catalogEntityId ||
      entry.legacyTargetIdentity.pubChemCid !== route.identityScope.pubChemCid ||
      entry.legacyTargetIdentity.inchiKey !== route.identityScope.inchiKey ||
      target.identityResolution !== "exact_inchi_key" ||
      target.inchiKey !== entry.legacyTargetIdentity.inchiKey ||
      route.coverageId !== `synthesis-coverage:${entry.legacyTargetIdentity.catalogEntityId}`
    ) {
      exactCidAndInchiKeyJoin = false;
    }
  }

  return {
    allSixLegacyRoutesAccounted:
      entries.length === LEGACY_SYNTHESIS_ROUTE_COUNT &&
      routes.length === LEGACY_SYNTHESIS_ROUTE_COUNT &&
      unique(legacyRefs) &&
      unique(auditedRouteIds) &&
      setsEqual(new Set(auditedRouteIds), routeIds) &&
      stepAccountingValid,
    exactCidAndInchiKeyJoin,
    excludedSourceContextStepCount,
    excludedTargetFormStepCount,
  };
};

const assertAcceptedAggregate = (
  report: LegacySynthesisMigrationReport,
): void => {
  const accepted =
    report.expectedLegacyRouteCount === LEGACY_SYNTHESIS_ROUTE_COUNT &&
    report.legacyRouteCount === LEGACY_SYNTHESIS_ROUTE_COUNT &&
    report.accountedRouteCount === LEGACY_SYNTHESIS_ROUTE_COUNT &&
    report.evidenceCount === LEGACY_SYNTHESIS_ROUTE_COUNT &&
    countRecordsEqual(SYNTHESIS_ROUTE_TYPES, ACCEPTED_ROUTE_TYPE_COUNTS, report.routeTypeCounts) &&
    countRecordsEqual(
      SYNTHESIS_ROUTE_COMPLETENESS_STATES,
      ACCEPTED_COMPLETENESS_COUNTS,
      report.routeCompletenessCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_REVIEW_STATES,
      ACCEPTED_REVIEW_STATE_COUNTS,
      report.reviewStateCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_LICENSE_STATES,
      ACCEPTED_LICENSE_STATE_COUNTS,
      report.licenseStateCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_SOURCE_KINDS,
      ACCEPTED_EVIDENCE_SOURCE_KIND_COUNTS,
      report.evidenceSourceKindCounts,
    ) &&
    report.patentFamilyCount === LEGACY_SYNTHESIS_ROUTE_COUNT &&
    report.excludedSourceContextStepCount === ACCEPTED_EXCLUDED_SOURCE_CONTEXT_STEP_COUNT &&
    report.excludedTargetFormStepCount === ACCEPTED_EXCLUDED_TARGET_FORM_STEP_COUNT &&
    report.invariants.allSixLegacyRoutesAccounted === true &&
    report.invariants.exactCidAndInchiKeyJoin === true &&
    report.invariants.operationalDetailsIncluded === false;
  if (!accepted) {
    throw new Error("Private synthesis migration does not match the accepted six-route aggregate.");
  }
};

const assertAttestationMatchesDerivation = (
  attestation: LegacySynthesisMigrationReport,
  derived: LegacySynthesisMigrationReport,
): void => {
  const matches =
    attestation.schemaVersion === derived.schemaVersion &&
    attestation.migrationVersion === derived.migrationVersion &&
    attestation.expectedLegacyRouteCount === derived.expectedLegacyRouteCount &&
    attestation.legacyRouteCount === derived.legacyRouteCount &&
    attestation.accountedRouteCount === derived.accountedRouteCount &&
    attestation.evidenceCount === derived.evidenceCount &&
    countRecordsEqual(SYNTHESIS_ROUTE_TYPES, derived.routeTypeCounts, attestation.routeTypeCounts) &&
    countRecordsEqual(
      SYNTHESIS_ROUTE_COMPLETENESS_STATES,
      derived.routeCompletenessCounts,
      attestation.routeCompletenessCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_REVIEW_STATES,
      derived.reviewStateCounts,
      attestation.reviewStateCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_LICENSE_STATES,
      derived.licenseStateCounts,
      attestation.licenseStateCounts,
    ) &&
    countRecordsEqual(
      SYNTHESIS_SOURCE_KINDS,
      derived.evidenceSourceKindCounts,
      attestation.evidenceSourceKindCounts,
    ) &&
    attestation.patentFamilyCount === derived.patentFamilyCount &&
    attestation.excludedSourceContextStepCount === derived.excludedSourceContextStepCount &&
    attestation.excludedTargetFormStepCount === derived.excludedTargetFormStepCount &&
    attestation.invariants.allSixLegacyRoutesAccounted ===
      derived.invariants.allSixLegacyRoutesAccounted &&
    attestation.invariants.exactCidAndInchiKeyJoin ===
      derived.invariants.exactCidAndInchiKeyJoin &&
    attestation.invariants.operationalDetailsIncluded ===
      derived.invariants.operationalDetailsIncluded;
  if (!matches) {
    throw new Error("Private synthesis migration attestation does not match the derived payload.");
  }
};

export const migrateLegacySynthesisRoutes = async (
  options: MigrateLegacySynthesisRoutesOptions = {},
): Promise<LegacySynthesisMigrationResult> => {
  const input = options.privateInput;
  if (!input) {
    throw new Error(
      "Private synthesis migration input is required; real pending routes are not bundled in the public repository.",
    );
  }
  if (input.schemaVersion !== 1) {
    throw new Error("Unsupported private synthesis migration input schema.");
  }
  if (!input.migrationReport || input.migrationReport.schemaVersion !== 1) {
    throw new Error("Unsupported private synthesis migration report schema.");
  }
  if (!nonBlank(input.migrationReport.migrationVersion)) {
    throw new Error("Private synthesis migration version is required.");
  }
  if (!Array.isArray(input.routes) || !Array.isArray(input.evidence) ||
    !Array.isArray(input.legacyAudit)) {
    throw new Error("Private synthesis migration routes, evidence and legacy audit are required.");
  }

  const evidenceIds = input.evidence.map((item) => item.id);
  if (input.evidence.length !== LEGACY_SYNTHESIS_ROUTE_COUNT || !unique(evidenceIds)) {
    throw new Error("Private synthesis migration requires exactly six unique evidence records.");
  }
  const routeIds = input.routes.map((item) => item.id);
  if (input.routes.length !== LEGACY_SYNTHESIS_ROUTE_COUNT || !unique(routeIds)) {
    throw new Error("Private synthesis migration requires exactly six unique canonical routes.");
  }

  const evidenceIdSet = new Set(evidenceIds);
  const referencedEvidenceIds = new Set(input.routes.flatMap((route) => route.sourceEvidenceIds));
  if (!setsEqual(evidenceIdSet, referencedEvidenceIds)) {
    throw new Error("Private synthesis migration evidence must be fully and exclusively route-associated.");
  }
  const patentFamilies = input.evidence.map((item) => item.patentFamilyId);
  if (
    input.evidence.some((item) =>
      item.sourceKind !== "patent" ||
      item.licenseState !== "link_only" ||
      item.reuseMode !== "metadata_and_link_only" ||
      !nonBlank(item.patentFamilyId)
    ) ||
    !unique(patentFamilies as string[])
  ) {
    throw new Error(
      "Private synthesis migration requires six unique patent-family, link-only evidence records.",
    );
  }

  const legacyAudit = deriveLegacyAudit(input.routes, input.legacyAudit);
  const derivedReport: LegacySynthesisMigrationReport = {
    schemaVersion: 1,
    migrationVersion: input.migrationReport.migrationVersion,
    expectedLegacyRouteCount: LEGACY_SYNTHESIS_ROUTE_COUNT,
    legacyRouteCount: input.legacyAudit.length,
    accountedRouteCount: new Set(
      input.legacyAudit.map((entry) => entry.canonicalRouteId),
    ).size,
    evidenceCount: input.evidence.length,
    routeTypeCounts: countValues(
      SYNTHESIS_ROUTE_TYPES,
      input.routes.map((route) => route.routeType),
    ),
    routeCompletenessCounts: countValues(
      SYNTHESIS_ROUTE_COMPLETENESS_STATES,
      input.routes.map((route) => route.routeCompleteness),
    ),
    reviewStateCounts: countValues(
      SYNTHESIS_REVIEW_STATES,
      input.routes.map((route) => route.reviewState),
    ),
    licenseStateCounts: countValues(
      SYNTHESIS_LICENSE_STATES,
      input.routes.map((route) => route.licenseState),
    ),
    evidenceSourceKindCounts: countValues(
      SYNTHESIS_SOURCE_KINDS,
      input.evidence.map((item) => item.sourceKind),
    ),
    patentFamilyCount: new Set(patentFamilies).size,
    excludedSourceContextStepCount: legacyAudit.excludedSourceContextStepCount,
    excludedTargetFormStepCount: legacyAudit.excludedTargetFormStepCount,
    invariants: {
      allSixLegacyRoutesAccounted: legacyAudit.allSixLegacyRoutesAccounted,
      exactCidAndInchiKeyJoin: legacyAudit.exactCidAndInchiKeyJoin,
      operationalDetailsIncluded: input.routes.some(
        (route) => route.safety.operationalDetailsIncluded !== false,
      ),
    },
  };

  assertAttestationMatchesDerivation(input.migrationReport, derivedReport);
  assertAcceptedAggregate(derivedReport);

  const errors = input.routes.flatMap((route) =>
    validateCanonicalSynthesisRoute(route, input.evidence)
      .filter((issue) => issue.severity === "error"),
  );
  if (errors.length > 0) {
    throw new Error(
      `Private synthesis migration input failed canonical validation: ${JSON.stringify(errors.slice(0, 20))}`,
    );
  }
  return {
    routes: [...input.routes],
    evidence: [...input.evidence],
    migrationReport: derivedReport,
  };
};
