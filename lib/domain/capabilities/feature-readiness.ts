export type FeatureDeliveryStatus =
  | "shipped"
  | "partial"
  | "planned"
  | "intentionally-out-of-scope";

export interface AutomatedTestEvidence {
  readonly path: string;
  readonly passing: boolean;
}

export interface ScreenshotEvidence {
  readonly path: string;
  readonly committed: boolean;
  readonly current: boolean;
}

export interface FeatureImplementationEvidence {
  readonly architectureContractPath: string | null;
  readonly realUserFlow: boolean;
  readonly realSourceOrStructureData: boolean;
  readonly automatedTest: AutomatedTestEvidence | null;
  readonly screenshot: ScreenshotEvidence | null;
}

export interface FeatureReadinessInput {
  readonly featureId: string;
  readonly scopeDecision: "in-scope" | "intentionally-out-of-scope";
  readonly outOfScopeReason: string | null;
  readonly evidence: FeatureImplementationEvidence;
}

export interface FeatureReadinessResult {
  readonly featureId: string;
  readonly status: FeatureDeliveryStatus;
  readonly failedShippingGates: readonly string[];
}

/**
 * One architecture interface is evidence of progress, but never evidence that a
 * feature shipped. Shipped requires the complete user/data/test/screenshot set.
 */
export const evaluateFeatureReadiness = (
  input: FeatureReadinessInput,
): FeatureReadinessResult => {
  if (input.scopeDecision === "intentionally-out-of-scope") {
    return {
      featureId: input.featureId,
      status: "intentionally-out-of-scope",
      failedShippingGates: input.outOfScopeReason?.trim()
        ? []
        : ["An out-of-scope decision requires a reason."],
    };
  }

  const failedShippingGates: string[] = [];
  if (!input.evidence.realUserFlow) failedShippingGates.push("real user flow");
  if (!input.evidence.realSourceOrStructureData) {
    failedShippingGates.push("real source or structure data");
  }
  if (!input.evidence.automatedTest?.passing) failedShippingGates.push("passing automated test");
  if (!input.evidence.screenshot?.committed || !input.evidence.screenshot.current) {
    failedShippingGates.push("current committed screenshot");
  }
  if (failedShippingGates.length === 0) {
    return { featureId: input.featureId, status: "shipped", failedShippingGates };
  }

  const hasAnyImplementationEvidence = Boolean(
    input.evidence.architectureContractPath ||
      input.evidence.realUserFlow ||
      input.evidence.realSourceOrStructureData ||
      input.evidence.automatedTest ||
      input.evidence.screenshot,
  );
  return {
    featureId: input.featureId,
    status: hasAnyImplementationEvidence ? "partial" : "planned",
    failedShippingGates,
  };
};

export type FeatureExposure = "hidden" | "secondary" | "primary-navigation";

export interface FeatureRouteRegistration {
  readonly featureId: string;
  readonly enabled: boolean;
  readonly exposure: FeatureExposure;
  readonly route: string | null;
  readonly placeholder: boolean;
  readonly fallbackRoute: string | null;
  readonly honestAvailabilityLabel: string | null;
  readonly readiness: FeatureReadinessResult;
}

export interface FeatureRouteAssessment {
  readonly eligible: boolean;
  readonly violations: readonly string[];
}

/** Prevents unfinished or empty routes from becoming primary navigation. */
export const assessFeatureRouteRegistration = (
  registration: FeatureRouteRegistration,
): FeatureRouteAssessment => {
  const violations: string[] = [];
  if (
    registration.exposure === "primary-navigation" &&
    registration.readiness.status !== "shipped"
  ) {
    violations.push("Only shipped features may appear in primary navigation.");
  }
  if (registration.placeholder && registration.exposure === "primary-navigation") {
    violations.push("Placeholder routes cannot be primary navigation pages.");
  }
  if (
    registration.placeholder &&
    (!registration.fallbackRoute?.trim() || !registration.honestAvailabilityLabel?.trim())
  ) {
    violations.push("Placeholders require a fallback route and honest availability label.");
  }
  if (registration.enabled && registration.readiness.status === "planned") {
    violations.push("A planned-only feature flag cannot be enabled.");
  }
  return { eligible: violations.length === 0, violations };
};
