import { synthesisAtlasRoutes } from "../../lib/data/synthesis-atlas";
import type {
  SynthesisAtlasMaterial,
  SynthesisAtlasRoute,
  SynthesisAtlasSourceAnchor,
  SynthesisAtlasTransformation,
} from "../../lib/domain/synthesis-atlas";
import type {
  CanonicalSynthesisBondChange,
  CanonicalSynthesisMaterial,
  CanonicalSynthesisRoute,
  CanonicalSynthesisRouteType,
  CanonicalSynthesisStep,
  SynthesisIdentityScope,
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "../../lib/domain/synthesis-route";
import {
  loadSynthesisDiscoverySubjects,
  type SynthesisDiscoverySubject,
} from "./catalog-input.mjs";

/** Release-scoped migration invariant; it is not a product or schema ceiling. */
export const LEGACY_SYNTHESIS_ROUTE_COUNT = 6;

const MIGRATION_RETRIEVED_AT = "2026-08-27T00:00:00.000Z";

const TARGET_IDENTITIES = {
  "molecule:propranolol": {
    preferredName: "Propranolol",
    pubChemCid: 4946,
    inchiKey: "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
  },
  "molecule:atenolol": {
    preferredName: "Atenolol",
    pubChemCid: 2249,
    inchiKey: "METKIMKYRPQLGS-UHFFFAOYSA-N",
  },
  "molecule:carvedilol": {
    preferredName: "Carvedilol",
    pubChemCid: 2585,
    inchiKey: "OGHNVEJMJSYVRP-UHFFFAOYSA-N",
  },
} as const;

type LegacyMoleculeId = keyof typeof TARGET_IDENTITIES;

const SOURCE_METADATA = {
  "source:patent-us3337628a": {
    documentId: "US3337628A",
    patentFamilyId: "patent-family:US3337628",
    publicationYear: 1967,
    locatorKind: "patent_example",
    scheme: null,
    example: "Examples 1 and 4",
    supportScope: "complete_route",
  },
  "source:patent-us3663607a": {
    documentId: "US3663607A",
    patentFamilyId: "patent-family:US3663607",
    publicationYear: 1972,
    locatorKind: "patent_example",
    scheme: null,
    example: "Example 1",
    supportScope: "complete_route",
  },
  "source:patent-ru2423346c2": {
    documentId: "RU2423346C2",
    patentFamilyId: "patent-family:RU2423346",
    publicationYear: 2011,
    locatorKind: "patent_scheme",
    scheme: "Scheme V",
    example: "Examples 12–14 and 23",
    supportScope: "complete_route",
  },
  "source:patent-us4503067a": {
    documentId: "US4503067A",
    patentFamilyId: "patent-family:US4503067",
    publicationYear: 1985,
    locatorKind: "patent_example",
    scheme: null,
    example: "Example 2",
    supportScope: "complete_route",
  },
  "source:patent-us4273711a": {
    documentId: "US4273711A",
    patentFamilyId: "patent-family:US4273711",
    publicationYear: 1981,
    locatorKind: "patent_example",
    scheme: null,
    example: "Example",
    supportScope: "route_segment",
  },
  "source:patent-wo2005113502a1": {
    documentId: "WO2005113502A1",
    patentFamilyId: "patent-family:WO2005113502",
    publicationYear: 2005,
    locatorKind: "patent_scheme",
    scheme: "Reaction scheme",
    example: "Example, Steps 1–4",
    supportScope: "route_segment",
  },
} as const;

type KnownSourceId = keyof typeof SOURCE_METADATA;

export type LegacyRouteExclusionReason =
  | "source_context_not_promoted"
  | "evidence_gap_not_promoted"
  | "outside_exact_target_path"
  | "target_form_identity_divergence";

export interface LegacyRouteMigrationExclusion {
  readonly legacyStepId: string;
  readonly reason: LegacyRouteExclusionReason;
  readonly limitation: string;
}

export interface LegacyRouteMigrationEntry {
  readonly legacyRouteId: string;
  readonly canonicalRouteId: string;
  readonly routeType: CanonicalSynthesisRouteType;
  readonly joinedCatalogEntityId: string;
  readonly joinedPubChemCid: number;
  readonly joinedInchiKey: string;
  readonly retainedLegacyStepIds: readonly string[];
  readonly exclusions: readonly LegacyRouteMigrationExclusion[];
  readonly outcome: "migrated";
}

export interface LegacySynthesisMigrationReport {
  readonly schemaVersion: 1;
  readonly migrationVersion: "legacy-synthesis-atlas-to-canonical-1.0.0";
  readonly expectedLegacyRouteCount: 6;
  readonly legacyRouteCount: number;
  readonly accountedRouteCount: number;
  readonly evidenceCount: number;
  readonly routeTypeCounts: Readonly<Record<CanonicalSynthesisRouteType, number>>;
  readonly excludedSourceContextStepCount: number;
  readonly excludedTargetFormStepCount: number;
  readonly entries: readonly LegacyRouteMigrationEntry[];
  readonly invariants: {
    readonly allSixLegacyRoutesAccounted: boolean;
    readonly exactCidAndInchiKeyJoin: boolean;
    readonly operationalDetailsIncluded: false;
  };
}

export interface LegacySynthesisMigrationResult {
  readonly routes: readonly CanonicalSynthesisRoute[];
  readonly evidence: readonly SynthesisSourceEvidence[];
  readonly migrationReport: LegacySynthesisMigrationReport;
}

export interface MigrateLegacySynthesisRoutesOptions {
  readonly legacyRoutes?: readonly SynthesisAtlasRoute[];
  readonly subjects?: readonly SynthesisDiscoverySubject[];
}

const evidenceIdFor = (sourceId: string): SynthesisSourceEvidenceId =>
  `synthesis-source-evidence:${sourceId.replace(/^source:/u, "")}`;

const canonicalMaterialIdFor = (
  legacyMaterialId: string,
): `synthesis-material:${string}` =>
  `synthesis-material:legacy-${legacyMaterialId.replace(/^synthesis-atlas-material:/u, "")}`;

const canonicalStepIdFor = (
  legacyStepId: string,
): `synthesis-route-step:${string}` =>
  `synthesis-route-step:legacy-${legacyStepId.replace(/^synthesis-atlas-step:/u, "")}`;

const canonicalRouteIdFor = (
  legacyRouteId: string,
): `synthesis-route:${string}` =>
  `synthesis-route:legacy-${legacyRouteId.replace(/^synthesis-atlas-route:/u, "")}`;

const exactSubjectFor = (
  moleculeId: string,
  subjects: readonly SynthesisDiscoverySubject[],
): SynthesisDiscoverySubject => {
  if (!(moleculeId in TARGET_IDENTITIES)) {
    throw new Error(`No exact canonical target join is declared for ${moleculeId}.`);
  }
  const expected = TARGET_IDENTITIES[moleculeId as LegacyMoleculeId];
  const cidMatches = subjects.filter(
    (subject) => subject.identity.pubChemCid === expected.pubChemCid,
  );
  const inchiKeyMatches = subjects.filter(
    (subject) => subject.identity.inchiKey === expected.inchiKey,
  );
  if (
    cidMatches.length !== 1 ||
    inchiKeyMatches.length !== 1 ||
    cidMatches[0] !== inchiKeyMatches[0]
  ) {
    throw new Error(
      `Exact CID/InChIKey synthesis identity join failed for ${moleculeId} ` +
        `(CID ${expected.pubChemCid}, InChIKey ${expected.inchiKey}).`,
    );
  }
  const subject = cidMatches[0];
  if (subject.preferredName !== expected.preferredName) {
    throw new Error(`Exact synthesis identity name mismatch for ${moleculeId}.`);
  }
  return subject;
};

const identityScopeFor = (
  subject: SynthesisDiscoverySubject,
): SynthesisIdentityScope => ({
  catalogEntityId: subject.catalogEntityId,
  preferredName: subject.preferredName,
  aliases: [...subject.aliases],
  casNumber: subject.sourceIdentity.casNumber,
  pubChemCid: subject.identity.pubChemCid,
  inchiKey: subject.identity.inchiKey,
  connectivityKey: subject.identity.connectivityKey,
  stereochemicalKey: subject.identity.stereochemicalAndProtonationKey,
  canonicalSmiles: subject.identity.canonicalSmiles,
  isomericSmiles: subject.identity.isomericSmiles,
  sourceFormSmiles: subject.formIdentity.sourceFormSmiles,
  parentEntity: {
    id: subject.parentResolution.catalogParentEntityId,
    relation: subject.parentResolution.catalogRelation,
    resolutionStatus: subject.parentResolution.catalogResolutionStatus,
    exactIdentity:
      subject.parentResolution.catalogRelation === "self"
        ? {
            catalogEntityId: subject.catalogEntityId,
            pubChemCid: subject.identity.pubChemCid,
            inchiKey: subject.identity.inchiKey,
          }
        : null,
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: subject.formIdentity.chemicalFormId,
    sourceKind: subject.formIdentity.kind,
    normalizedKind: "unresolved",
    componentCount: subject.formIdentity.componentCount,
    parentResolutionStatus:
      subject.parentResolution.chemicalFormParentResolutionStatus === "not-applicable"
        ? "not_applicable"
        : subject.parentResolution.chemicalFormParentResolutionStatus,
  },
  stereoisomer: {
    id: subject.stereochemistryIdentity.stereoisomerId,
    specified: subject.stereochemistryIdentity.specifiedInSourceInchi,
  },
});

const anchorMapFor = (
  routes: readonly SynthesisAtlasRoute[],
): ReadonlyMap<string, SynthesisAtlasSourceAnchor> => {
  const anchors = new Map<string, SynthesisAtlasSourceAnchor>();
  for (const route of routes) {
    for (const anchor of route.sourceAnchors) {
      const existing = anchors.get(anchor.sourceId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(anchor)) {
        throw new Error(`Conflicting legacy source anchors for ${anchor.sourceId}.`);
      }
      anchors.set(anchor.sourceId, anchor);
    }
  }
  return anchors;
};

const evidenceForAnchors = (
  anchors: ReadonlyMap<string, SynthesisAtlasSourceAnchor>,
): readonly SynthesisSourceEvidence[] =>
  [...anchors.entries()]
    .map(([sourceId, anchor]): SynthesisSourceEvidence => {
      if (!(sourceId in SOURCE_METADATA)) {
        throw new Error(`No canonical source metadata is declared for ${sourceId}.`);
      }
      const metadata = SOURCE_METADATA[sourceId as KnownSourceId];
      return {
        id: evidenceIdFor(sourceId),
        resolutionState: "resolved",
        sourceId: sourceId as `source:${string}`,
        sourceKind: "patent",
        documentId: metadata.documentId,
        patentFamilyId: metadata.patentFamilyId,
        title: anchor.title,
        url: anchor.url,
        publicationYear: metadata.publicationYear,
        retrievedAt: MIGRATION_RETRIEVED_AT,
        documentSha256: null,
        locator: {
          kind: metadata.locatorKind,
          value: anchor.locator.en,
          page: null,
          scheme: metadata.scheme,
          example: metadata.example,
        },
        supportScope: metadata.supportScope,
        licenseState: "link_only",
        reuseMode: "metadata_and_link_only",
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"));

const targetMaterialFor = (route: SynthesisAtlasRoute): SynthesisAtlasMaterial => {
  const candidates = route.materials.filter((material) => material.role === "active-parent");
  if (candidates.length !== 1) {
    throw new Error(`${route.id} must expose exactly one active-parent target.`);
  }
  return candidates[0];
};

interface RetainedPath {
  readonly retained: readonly SynthesisAtlasTransformation[];
  readonly exclusions: readonly LegacyRouteMigrationExclusion[];
}

const retainedDirectPathFor = (
  route: SynthesisAtlasRoute,
  targetMaterial: SynthesisAtlasMaterial,
): RetainedPath => {
  const producerByMaterial = new Map(
    route.transformations
      .filter((step) => step.outputMaterialId !== null)
      .map((step) => [step.outputMaterialId as string, step] as const),
  );
  const retainedIds = new Set<string>();
  const stoppedAtIds = new Set<string>();
  const visit = (materialId: string): void => {
    const producer = producerByMaterial.get(materialId);
    if (!producer) return;
    if (producer.evidenceState !== "direct-source") {
      stoppedAtIds.add(producer.id);
      return;
    }
    if (retainedIds.has(producer.id)) return;
    retainedIds.add(producer.id);
    producer.inputMaterialIds.forEach(visit);
  };
  visit(targetMaterial.id);

  const retained = route.transformations
    .filter((step) => retainedIds.has(step.id))
    .sort((left, right) => left.order - right.order);
  if (retained.length === 0) {
    throw new Error(`${route.id} has no direct-source path to its exact target.`);
  }

  const targetStep = route.transformations.find(
    (step) => step.outputMaterialId === targetMaterial.id,
  );
  const targetStepIndex = targetStep ? route.transformations.indexOf(targetStep) : -1;
  const exclusions = route.transformations
    .filter((step) => !retainedIds.has(step.id))
    .map((step): LegacyRouteMigrationExclusion => {
      const output = step.outputMaterialId
        ? route.materials.find((material) => material.id === step.outputMaterialId)
        : null;
      if (output?.role === "chemical-form" && step.order > (targetStep?.order ?? -1)) {
        return {
          legacyStepId: step.id,
          reason: "target_form_identity_divergence",
          limitation:
            "Excluded because the exact catalog target is the free-base identity; the downstream hydrochloride is a distinct chemical form and is not a covalent target transformation.",
        };
      }
      if (stoppedAtIds.has(step.id) || step.evidenceState === "source-context") {
        return {
          legacyStepId: step.id,
          reason: "source_context_not_promoted",
          limitation:
            "The legacy step is source-context only and was retained as an explicit upstream gap, not promoted to reported evidence.",
        };
      }
      if (step.evidenceState === "evidence-gap") {
        return {
          legacyStepId: step.id,
          reason: "evidence_gap_not_promoted",
          limitation:
            "The legacy evidence-gap step was not promoted to a canonical reported transformation.",
        };
      }
      return {
        legacyStepId: step.id,
        reason: "outside_exact_target_path",
        limitation:
          targetStepIndex >= 0 && route.transformations.indexOf(step) > targetStepIndex
            ? "The step is downstream of the exact catalog target and belongs to a different target/form scope."
            : "The step is disconnected from the direct-source path retained for the exact catalog target.",
      };
    });
  return { retained, exclusions };
};

const evidenceIdsForStep = (
  route: SynthesisAtlasRoute,
  step: SynthesisAtlasTransformation,
): readonly SynthesisSourceEvidenceId[] => {
  const exactLocatorSourceIds = route.sourceAnchors
    .filter(
      (anchor) =>
        step.sourceIds.includes(anchor.sourceId) &&
        anchor.locator.en === step.sourceLocator.en,
    )
    .map((anchor) => anchor.sourceId);
  const sourceIds = exactLocatorSourceIds.length > 0
    ? exactLocatorSourceIds
    : step.sourceIds;
  if (sourceIds.length === 0) {
    throw new Error(`${step.id} has no exact source anchor and locator.`);
  }
  return [...new Set(sourceIds.map(evidenceIdFor))];
};

const bondChangesFor = (
  step: SynthesisAtlasTransformation,
): readonly CanonicalSynthesisBondChange[] =>
  step.bondChanges.map((change): CanonicalSynthesisBondChange => {
    const kind = change.kind === "order-changed" ? "order_changed" : change.kind;
    return {
      kind,
      description: change.label.en,
      atoms: null,
      beforeOrder: null,
      afterOrder: null,
      mappingState: "not_mapped",
    };
  });

const canonicalMaterialsFor = (
  route: SynthesisAtlasRoute,
  subject: SynthesisDiscoverySubject,
  target: SynthesisAtlasMaterial,
  retainedSteps: readonly SynthesisAtlasTransformation[],
): readonly CanonicalSynthesisMaterial[] => {
  const usedIds = new Set<string>([
    target.id,
    ...retainedSteps.flatMap((step) => [
      ...step.inputMaterialIds,
      ...(step.outputMaterialId ? [step.outputMaterialId] : []),
    ]),
  ]);
  const producedIds = new Set(
    retainedSteps.flatMap((step) => step.outputMaterialId ? [step.outputMaterialId] : []),
  );
  return route.materials
    .filter((material) => usedIds.has(material.id))
    .map((material): CanonicalSynthesisMaterial => {
      const isTarget = material.id === target.id;
      const isBoundary = !producedIds.has(material.id);
      const role = isTarget
        ? "target_parent"
        : isBoundary && material.role === "reagent-fragment"
          ? "reagent_fragment"
          : isBoundary
            ? "starting_material"
            : "intermediate";
      return {
        id: canonicalMaterialIdFor(material.id),
        role,
        label: isTarget ? subject.preferredName : material.label.en,
        identityResolution: isTarget ? "exact_inchi_key" : "connectivity_only",
        canonicalSmiles: isTarget ? subject.identity.canonicalSmiles : material.smiles,
        isomericSmiles: isTarget ? subject.identity.isomericSmiles : null,
        inchiKey: isTarget ? subject.identity.inchiKey : null,
        sourceEvidenceIds: [
          ...new Set(
            material.sourceIds
              .filter((sourceId) => route.sourceAnchors.some((anchor) => anchor.sourceId === sourceId))
              .map(evidenceIdFor),
          ),
        ],
      };
    });
};

const routeTypeFor = (route: SynthesisAtlasRoute): CanonicalSynthesisRouteType =>
  route.id === "synthesis-atlas-route:carvedilol-reported"
    ? "teaching_reconstruction"
    : "patent_reported";

const extraRouteGapsFor = (
  route: SynthesisAtlasRoute,
): readonly {
  readonly positionAfterStepId: null;
  readonly kind: "upstream_precursor";
  readonly description: string;
}[] =>
  route.id === "synthesis-atlas-route:carvedilol-reported"
    ? [{
        positionAfterStepId: null,
        kind: "upstream_precursor",
        description:
          "The N-benzyl amine branch enters at the declared convergence boundary; its upstream literature preparation is not part of either migrated patent segment.",
      }]
    : [];

const publicationYearFor = (
  sourceIds: readonly SynthesisSourceEvidenceId[],
  evidenceById: ReadonlyMap<SynthesisSourceEvidenceId, SynthesisSourceEvidence>,
): number | null => {
  const years = sourceIds
    .map((id) => evidenceById.get(id)?.publicationYear ?? null)
    .filter((year): year is number => year !== null);
  return years.length > 0 ? Math.max(...years) : null;
};

const migrateOneRoute = (
  legacyRoute: SynthesisAtlasRoute,
  subject: SynthesisDiscoverySubject,
  evidenceById: ReadonlyMap<SynthesisSourceEvidenceId, SynthesisSourceEvidence>,
): { readonly route: CanonicalSynthesisRoute; readonly entry: LegacyRouteMigrationEntry } => {
  const target = targetMaterialFor(legacyRoute);
  const { retained, exclusions } = retainedDirectPathFor(legacyRoute, target);
  const routeType = routeTypeFor(legacyRoute);
  const canonicalSteps: readonly CanonicalSynthesisStep[] = retained.map(
    (step, index): CanonicalSynthesisStep => ({
      id: canonicalStepIdFor(step.id),
      order: index + 1,
      inputMaterialIds: step.inputMaterialIds.map(canonicalMaterialIdFor),
      outputMaterialIds: step.outputMaterialId
        ? [canonicalMaterialIdFor(step.outputMaterialId)]
        : [],
      title: step.title.en,
      reactionClass: {
        taxonomyId: null,
        label: step.reactionClass.en,
        normalizationState: "candidate",
      },
      evidenceMode: "direct_reported",
      sourceEvidenceIds: evidenceIdsForStep(legacyRoute, step),
      bondChanges: bondChangesFor(step),
      stateChanges: [],
      reviewState: "pending",
      limitations: [
        "Legacy bond annotations are retained as deterministic, not-mapped references; no reviewed atom mapping is asserted.",
        ...(index === retained.length - 1
          ? legacyRoute.limitations.map((limitation) => limitation.en)
          : []),
        ...exclusions
          .filter((exclusion) => exclusion.reason === "target_form_identity_divergence")
          .map((exclusion) => exclusion.limitation),
      ],
    }),
  );
  const sourceEvidenceIds = [
    ...new Set(canonicalSteps.flatMap((step) => step.sourceEvidenceIds)),
  ];
  const gaps = [
    ...exclusions
      .filter((exclusion) =>
        exclusion.reason === "source_context_not_promoted" ||
        exclusion.reason === "evidence_gap_not_promoted",
      )
      .map((exclusion) => ({
        positionAfterStepId: null,
        kind: "upstream_precursor" as const,
        description: exclusion.limitation,
      })),
    ...extraRouteGapsFor(legacyRoute),
  ];
  const canonicalRouteId = canonicalRouteIdFor(legacyRoute.id);
  const base = {
    schemaVersion: 1 as const,
    id: canonicalRouteId,
    coverageId: `synthesis-coverage:${subject.catalogEntityId}` as const,
    version: legacyRoute.version,
    identityScope: identityScopeFor(subject),
    applicability: "applicable" as const,
    routeCompleteness: gaps.length === 0
      ? "complete" as const
      : legacyRoute.id === "synthesis-atlas-route:carvedilol-reported"
        ? "convergent_partial" as const
        : "upstream_gap" as const,
    reviewState: "pending" as const,
    licenseState: "link_only" as const,
    routeFamilyId: `synthesis-route-family:${subject.identity.inchiKey.toLowerCase()}`,
    variantKind: legacyRoute.kind === "reported"
      ? legacyRoute.moleculeId === "molecule:atenolol"
        ? "improved_process" as const
        : "original_patent" as const
      : "alternative" as const,
    publicationYear: publicationYearFor(sourceEvidenceIds, evidenceById),
    title: legacyRoute.title.en,
    stereochemicalStrategy: legacyRoute.stereochemistryScope.en,
    startBoundary: gaps.length > 0
      ? `Direct-source migration boundary: ${canonicalMaterialsFor(
          legacyRoute,
          subject,
          target,
          retained,
        )
          .filter((material) =>
            material.role === "starting_material" || material.role === "reagent_fragment",
          )
          .map((material) => material.label)
          .join("; ")}`
      : legacyRoute.startBoundary.en,
    targetMaterialId: canonicalMaterialIdFor(target.id),
    materials: canonicalMaterialsFor(legacyRoute, subject, target, retained),
    steps: canonicalSteps,
    gaps,
    sourceEvidenceIds,
    reviewEvents: [],
    safety: { operationalDetailsIncluded: false as const },
  };
  const route: CanonicalSynthesisRoute = routeType === "teaching_reconstruction"
    ? {
        ...base,
        routeType,
        segments: sourceEvidenceIds.map((sourceEvidenceId) => {
          const stepIds = canonicalSteps
            .filter((step) => step.sourceEvidenceIds.includes(sourceEvidenceId))
            .map((step) => step.id);
          if (stepIds.length === 0) {
            throw new Error(`${legacyRoute.id} has an empty reconstruction segment.`);
          }
          return {
            stepIds: stepIds as [typeof stepIds[number], ...typeof stepIds],
            sourceEvidenceIds: [sourceEvidenceId],
          };
        }),
      }
    : {
        ...base,
        routeType: "patent_reported",
        reportedCompleteRouteSourceIds: sourceEvidenceIds as [
          SynthesisSourceEvidenceId,
          ...SynthesisSourceEvidenceId[],
        ],
      };
  return {
    route,
    entry: {
      legacyRouteId: legacyRoute.id,
      canonicalRouteId,
      routeType,
      joinedCatalogEntityId: subject.catalogEntityId,
      joinedPubChemCid: subject.identity.pubChemCid,
      joinedInchiKey: subject.identity.inchiKey,
      retainedLegacyStepIds: retained.map((step) => step.id),
      exclusions,
      outcome: "migrated",
    },
  };
};

export const migrateLegacySynthesisRoutes = async (
  options: MigrateLegacySynthesisRoutesOptions = {},
): Promise<LegacySynthesisMigrationResult> => {
  const legacyRoutes = options.legacyRoutes ?? synthesisAtlasRoutes;
  if (legacyRoutes.length !== LEGACY_SYNTHESIS_ROUTE_COUNT) {
    throw new Error(
      `Legacy synthesis migration expected ${LEGACY_SYNTHESIS_ROUTE_COUNT} routes; received ${legacyRoutes.length}.`,
    );
  }
  if (new Set(legacyRoutes.map((route) => route.id)).size !== legacyRoutes.length) {
    throw new Error("Legacy synthesis migration received duplicate route IDs.");
  }
  const subjects = options.subjects ?? await loadSynthesisDiscoverySubjects();
  const anchors = anchorMapFor(legacyRoutes);
  const evidence = evidenceForAnchors(anchors);
  const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
  const migrated = legacyRoutes.map((legacyRoute) =>
    migrateOneRoute(
      legacyRoute,
      exactSubjectFor(legacyRoute.moleculeId, subjects),
      evidenceById,
    )
  );
  const routes = migrated.map((item) => item.route);
  const entries = migrated.map((item) => item.entry);
  const accountedRouteCount = new Set(entries.map((entry) => entry.legacyRouteId)).size;
  const exactCidAndInchiKeyJoin = entries.every((entry) => {
    const expected = TARGET_IDENTITIES[
      legacyRoutes.find((route) => route.id === entry.legacyRouteId)?.moleculeId as LegacyMoleculeId
    ];
    return Boolean(
      expected &&
      entry.joinedPubChemCid === expected.pubChemCid &&
      entry.joinedInchiKey === expected.inchiKey,
    );
  });
  if (
    accountedRouteCount !== LEGACY_SYNTHESIS_ROUTE_COUNT ||
    !exactCidAndInchiKeyJoin
  ) {
    throw new Error("Legacy synthesis migration failed its 6/6 exact-identity invariant.");
  }
  const routeTypeCounts: Record<CanonicalSynthesisRouteType, number> = {
    patent_reported: 0,
    literature_reported: 0,
    teaching_reconstruction: 0,
    computational_proposed: 0,
  };
  routes.forEach((route) => {
    routeTypeCounts[route.routeType] += 1;
  });
  const exclusions = entries.flatMap((entry) => entry.exclusions);
  const migrationReport: LegacySynthesisMigrationReport = {
    schemaVersion: 1,
    migrationVersion: "legacy-synthesis-atlas-to-canonical-1.0.0",
    expectedLegacyRouteCount: LEGACY_SYNTHESIS_ROUTE_COUNT,
    legacyRouteCount: legacyRoutes.length,
    accountedRouteCount,
    evidenceCount: evidence.length,
    routeTypeCounts,
    excludedSourceContextStepCount: exclusions.filter(
      (exclusion) => exclusion.reason === "source_context_not_promoted",
    ).length,
    excludedTargetFormStepCount: exclusions.filter(
      (exclusion) => exclusion.reason === "target_form_identity_divergence",
    ).length,
    entries,
    invariants: {
      allSixLegacyRoutesAccounted: accountedRouteCount === LEGACY_SYNTHESIS_ROUTE_COUNT,
      exactCidAndInchiKeyJoin,
      operationalDetailsIncluded: false,
    },
  };
  return { routes, evidence, migrationReport };
};
