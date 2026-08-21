import type { AIEvidenceCard } from "./ai-evidence";
import type {
  EvidenceClaim,
  SourceReference,
  VerificationRecord,
} from "./evidence";
import type {
  AIEvidenceCardId,
  LearningMissionId,
  MoleculeClassificationId,
  MoleculeId,
  SourceId,
  StructureAssetId,
  SynthesisStoryId,
} from "./ids";
import type { LearningMission } from "./learning";
import type {
  MoleculeClassification,
  MoleculeEducationalProfile,
  MoleculeRecord,
  RegulatoryProductReference,
} from "./molecule";
import type {
  MoleculeStructureSet,
  SdfStructureAsset,
  StructureDimension,
} from "./structure";
import type { SynthesisStory } from "./synthesis";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface DomainDataset {
  readonly sources: readonly SourceReference[];
  readonly molecules: readonly MoleculeRecord[];
  readonly synthesisStories: readonly SynthesisStory[];
  readonly missions: readonly LearningMission[];
  readonly aiEvidenceCards?: readonly AIEvidenceCard[];
}

const makeIssue = (
  severity: ValidationSeverity,
  code: string,
  path: string,
  message: string,
): ValidationIssue => ({ severity, code, path, message });

const isNonBlank = (value: string): boolean => value.trim().length > 0;

const isIsoDate = (value: string): boolean =>
  isNonBlank(value) && !Number.isNaN(Date.parse(value));

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const duplicateValues = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
};

const validateKnownSourceIds = (
  sourceIds: readonly SourceId[],
  knownSourceIds: ReadonlySet<SourceId>,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (const duplicate of duplicateValues(sourceIds)) {
    issues.push(
      makeIssue(
        "warning",
        "duplicate-source-reference",
        path,
        `Source ${duplicate} is referenced more than once.`,
      ),
    );
  }

  sourceIds.forEach((sourceId, index) => {
    if (!knownSourceIds.has(sourceId)) {
      issues.push(
        makeIssue(
          "error",
          "unknown-source",
          `${path}[${index}]`,
          `Source ${sourceId} is not present in the source registry.`,
        ),
      );
    }
  });

  return issues;
};

const validateVerification = (
  verification: VerificationRecord,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const isReviewed =
    verification.status === "verified" ||
    verification.status === "expert-reviewed";

  if (isReviewed && !verification.reviewedBy) {
    issues.push(
      makeIssue(
        "warning",
        "reviewer-not-recorded",
        `${path}.reviewedBy`,
        "Reviewed content should identify its reviewer.",
      ),
    );
  }

  if (verification.reviewedAt && !isIsoDate(verification.reviewedAt)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-review-date",
        `${path}.reviewedAt`,
        "reviewedAt must be an ISO-compatible date string.",
      ),
    );
  }

  return issues;
};

export const validateSourceReference = (
  source: SourceReference,
): readonly ValidationIssue[] => {
  const path = `sources.${source.id}`;
  const issues: ValidationIssue[] = [
    ...validateVerification(source.verification, `${path}.verification`),
  ];

  if (!isNonBlank(source.provider) || !isNonBlank(source.title)) {
    issues.push(
      makeIssue(
        "error",
        "incomplete-source-identity",
        path,
        "A source needs a non-empty provider and title.",
      ),
    );
  }

  if (source.url !== null && !isHttpUrl(source.url)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-source-url",
        `${path}.url`,
        "Source URLs must use http or https.",
      ),
    );
  }

  if (!isIsoDate(source.retrievedAt)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-retrieval-date",
        `${path}.retrievedAt`,
        "retrievedAt must be an ISO-compatible date string.",
      ),
    );
  }

  return issues;
};

export const validateEvidenceClaim = (
  claim: EvidenceClaim,
  knownSourceIds: ReadonlySet<SourceId>,
  path = `claims.${claim.id}`,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [
    ...validateVerification(claim.verification, `${path}.verification`),
    ...validateKnownSourceIds(claim.sourceIds, knownSourceIds, `${path}.sourceIds`),
  ];

  if (!isNonBlank(claim.statement)) {
    issues.push(
      makeIssue(
        "error",
        "empty-claim",
        `${path}.statement`,
        "Evidence claims cannot be empty.",
      ),
    );
  }

  if (
    claim.evidenceLevel === "no-evidence" &&
    (claim.verification.status === "verified" ||
      claim.verification.status === "source-supported")
  ) {
    issues.push(
      makeIssue(
        "error",
        "unsupported-verification",
        `${path}.verification.status`,
        "A no-evidence claim cannot be verified or source-supported.",
      ),
    );
  }

  return issues;
};

const validateStructureAsset = (
  asset: SdfStructureAsset,
  expectedDimension: StructureDimension,
  structureSet: MoleculeStructureSet,
  knownSourceIds: ReadonlySet<SourceId>,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [
    ...validateVerification(asset.verification, `${path}.verification`),
    ...validateKnownSourceIds([asset.sourceId], knownSourceIds, `${path}.sourceId`),
  ];

  if (asset.moleculeId !== structureSet.moleculeId) {
    issues.push(
      makeIssue(
        "error",
        "structure-molecule-mismatch",
        `${path}.moleculeId`,
        "Structure asset must point to its containing molecule structure set.",
      ),
    );
  }
  if (asset.pubChemCid !== structureSet.pubChemCid) {
    issues.push(
      makeIssue(
        "error",
        "structure-cid-mismatch",
        `${path}.pubChemCid`,
        "Structure asset CID must match its containing molecule structure set.",
      ),
    );
  }
  if (asset.dimension !== expectedDimension) {
    issues.push(
      makeIssue(
        "error",
        "structure-dimension-mismatch",
        `${path}.dimension`,
        `Expected a ${expectedDimension.toUpperCase()} structure asset.`,
      ),
    );
  }
  if (!asset.publicPath.startsWith("/") || !asset.publicPath.endsWith(".sdf")) {
    issues.push(
      makeIssue(
        "error",
        "invalid-structure-path",
        `${path}.publicPath`,
        "A cached SDF asset needs a root-relative .sdf public path.",
      ),
    );
  }
  if (!isNonBlank(asset.sourceProvider) || !isNonBlank(asset.sourceExternalId)) {
    issues.push(
      makeIssue(
        "error",
        "incomplete-structure-source",
        path,
        "A structure asset needs a source provider and external ID.",
      ),
    );
  }
  if (!isHttpUrl(asset.sourceUrl)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-structure-source-url",
        `${path}.sourceUrl`,
        "Structure source URLs must use http or https.",
      ),
    );
  }
  if (!isIsoDate(asset.retrievedAt)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-structure-retrieval-date",
        `${path}.retrievedAt`,
        "Structure retrievedAt must be an ISO-compatible date string.",
      ),
    );
  }

  return issues;
};

export const validateMoleculeStructureSet = (
  structureSet: MoleculeStructureSet,
  molecule: Pick<MoleculeRecord, "id" | "identity">,
  knownSourceIds: ReadonlySet<SourceId>,
  path = `molecules.${molecule.id}.structures`,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (structureSet.moleculeId !== molecule.id) {
    issues.push(
      makeIssue(
        "error",
        "structure-set-molecule-mismatch",
        `${path}.moleculeId`,
        "Structure set must point to its containing molecule.",
      ),
    );
  }
  if (structureSet.pubChemCid !== molecule.identity.pubChemCid) {
    issues.push(
      makeIssue(
        "error",
        "structure-set-cid-mismatch",
        `${path}.pubChemCid`,
        "Structure set CID must match the normalized molecule identity.",
      ),
    );
  }

  issues.push(
    ...validateStructureAsset(
      structureSet.twoDimensional,
      "2d",
      structureSet,
      knownSourceIds,
      `${path}.twoDimensional`,
    ),
    ...validateStructureAsset(
      structureSet.threeDimensional,
      "3d",
      structureSet,
      knownSourceIds,
      `${path}.threeDimensional`,
    ),
  );

  if (structureSet.twoDimensional.id === structureSet.threeDimensional.id) {
    issues.push(
      makeIssue(
        "error",
        "duplicate-structure-asset-id",
        path,
        "The 2D and 3D structure assets must have distinct IDs.",
      ),
    );
  }

  return issues;
};

const validateMoleculeClassification = (
  classification: MoleculeClassification,
  knownSourceIds: ReadonlySet<SourceId>,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [
    ...validateVerification(classification.verification, `${path}.verification`),
    ...validateKnownSourceIds(
      classification.sourceIds,
      knownSourceIds,
      `${path}.sourceIds`,
    ),
  ];

  if (
    !isNonBlank(classification.value) ||
    !isNonBlank(classification.label) ||
    !isNonBlank(classification.summary)
  ) {
    issues.push(
      makeIssue(
        "error",
        "incomplete-molecule-classification",
        path,
        "Classification value, label, and summary must be non-empty.",
      ),
    );
  }
  if (classification.sourceIds.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "unsourced-molecule-classification",
        `${path}.sourceIds`,
        "A classification must retain at least one resolvable source or review record.",
      ),
    );
  }

  return issues;
};

const validateMoleculeEducationalProfile = (
  profile: MoleculeEducationalProfile,
  knownSourceIds: ReadonlySet<SourceId>,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [
    ...validateVerification(profile.verification, `${path}.verification`),
    ...validateKnownSourceIds(profile.sourceIds, knownSourceIds, `${path}.sourceIds`),
  ];

  if (!isNonBlank(profile.summary) || !isNonBlank(profile.learningContext)) {
    issues.push(
      makeIssue(
        "error",
        "incomplete-educational-profile",
        path,
        "Educational summary and learning context must be non-empty.",
      ),
    );
  }
  if (profile.sourceIds.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "unsourced-educational-profile",
        `${path}.sourceIds`,
        "Educational framing must link to a source or internal review record.",
      ),
    );
  }

  return issues;
};

const validateRegulatoryProduct = (
  product: RegulatoryProductReference,
  molecule: MoleculeRecord,
  knownSourceIds: ReadonlySet<SourceId>,
  path: string,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [
    ...validateVerification(product.verification, `${path}.verification`),
    ...validateKnownSourceIds([product.sourceId], knownSourceIds, `${path}.sourceId`),
  ];

  if (product.moleculeId !== molecule.id) {
    issues.push(
      makeIssue("error", "regulatory-molecule-mismatch", `${path}.moleculeId`,
        "Regulatory product must point to its containing molecule."),
    );
  }
  if (!molecule.forms.some((form) => form.id === product.chemicalFormId)) {
    issues.push(
      makeIssue("error", "regulatory-form-missing", `${path}.chemicalFormId`,
        "Approval evidence must resolve to an explicit chemical form in the molecule record."),
    );
  }
  if (!/^(?:NDA|ANDA)\d{6}$/.test(product.applicationNumber)) {
    issues.push(
      makeIssue("error", "invalid-regulatory-application", `${path}.applicationNumber`,
        "Drugs@FDA application number must be an exact NDA/ANDA identifier."),
    );
  }
  if (!/^\d{3}$/.test(product.productNumber)) {
    issues.push(
      makeIssue("error", "invalid-regulatory-product", `${path}.productNumber`,
        "Drugs@FDA product number must be the exact three-digit product identifier."),
    );
  }
  if (
    product.approvalAction.submissionType !== "ORIG" ||
    product.approvalAction.submissionNumber !== "1" ||
    product.approvalAction.submissionStatus !== "AP"
  ) {
    issues.push(
      makeIssue("error", "unapproved-regulatory-action", `${path}.approvalAction`,
        "Approval evidence must contain the exact Drugs@FDA ORIG/1/AP action."),
    );
  }
  if (
    !isIsoDate(product.approvalAction.actionDate) ||
    !isIsoDate(product.datasetLastUpdated) ||
    !isIsoDate(product.retrievedAt)
  ) {
    issues.push(
      makeIssue("error", "invalid-regulatory-date", path,
        "Regulatory action, dataset, and retrieval dates must be ISO-compatible."),
    );
  }
  if (!/^[a-f0-9]{64}$/.test(product.canonicalSha256)) {
    issues.push(
      makeIssue("error", "invalid-regulatory-snapshot-hash", `${path}.canonicalSha256`,
        "Regulatory snapshot must retain a lowercase SHA-256 digest."),
    );
  }
  if (!isHttpUrl(product.apiQueryUrl) || !isHttpUrl(product.sourceUrl)) {
    issues.push(
      makeIssue("error", "invalid-regulatory-url", path,
        "Regulatory evidence must retain resolvable API and human-readable URLs."),
    );
  }
  if (
    !isNonBlank(product.brandName) ||
    !isNonBlank(product.activeIngredient.name) ||
    !isNonBlank(product.activeIngredient.strength) ||
    product.limitations.length === 0
  ) {
    issues.push(
      makeIssue("error", "incomplete-regulatory-product", path,
        "Regulatory product identity, ingredient, strength, and limitations are required."),
    );
  }

  return issues;
};

export const validateMoleculeRecord = (
  molecule: MoleculeRecord,
  knownSourceIds: ReadonlySet<SourceId>,
): readonly ValidationIssue[] => {
  const path = `molecules.${molecule.id}`;
  const identityPath = `${path}.identity`;
  const issues: ValidationIssue[] = [
    ...validateVerification(
      molecule.identity.verification,
      `${identityPath}.verification`,
    ),
    ...validateKnownSourceIds(
      molecule.identity.sourceIds,
      knownSourceIds,
      `${identityPath}.sourceIds`,
    ),
    ...validateVerification(
      molecule.stereochemistry.verification,
      `${path}.stereochemistry.verification`,
    ),
    ...validateMoleculeStructureSet(
      molecule.structures,
      molecule,
      knownSourceIds,
      `${path}.structures`,
    ),
    ...validateMoleculeEducationalProfile(
      molecule.educationalProfile,
      knownSourceIds,
      `${path}.educationalProfile`,
    ),
  ];

  if (molecule.classifications.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "missing-molecule-classification",
        `${path}.classifications`,
        "Catalog molecules need at least one sourced classification.",
      ),
    );
  }

  for (const duplicate of duplicateValues(
    molecule.classifications.map((classification) => classification.id),
  )) {
    issues.push(
      makeIssue(
        "error",
        "duplicate-classification-id",
        `${path}.classifications`,
        `Classification ${duplicate} is duplicated.`,
      ),
    );
  }

  molecule.classifications.forEach((classification, index) => {
    issues.push(
      ...validateMoleculeClassification(
        classification,
        knownSourceIds,
        `${path}.classifications[${index}]`,
      ),
    );
  });

  const primaryAxes = molecule.classifications
    .filter((classification) => classification.isPrimary)
    .map((classification) => classification.axis);
  for (const duplicate of duplicateValues(primaryAxes)) {
    issues.push(
      makeIssue(
        "error",
        "multiple-primary-classifications",
        `${path}.classifications`,
        `Classification axis ${duplicate} has more than one primary value.`,
      ),
    );
  }

  if (
    !isNonBlank(molecule.identity.preferredName) ||
    !isNonBlank(molecule.identity.molecularFormula) ||
    !isNonBlank(molecule.identity.canonicalSmiles)
  ) {
    issues.push(
      makeIssue(
        "error",
        "incomplete-molecule-identity",
        identityPath,
        "Preferred name, molecular formula, and canonical SMILES are required.",
      ),
    );
  }

  if (
    molecule.identity.molecularWeight <= 0 ||
    molecule.identity.pubChemCid <= 0 ||
    !Number.isInteger(molecule.identity.pubChemCid)
  ) {
    issues.push(
      makeIssue(
        "error",
        "invalid-molecule-number",
        identityPath,
        "Molecular weight and PubChem CID must be positive; CID must be an integer.",
      ),
    );
  }

  if (!/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(molecule.identity.inchiKey)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-inchi-key",
        `${identityPath}.inchiKey`,
        "InChIKey does not match the expected 14-10-1 format.",
      ),
    );
  }

  for (const duplicate of duplicateValues(molecule.forms.map((form) => form.id))) {
    issues.push(
      makeIssue(
        "error",
        "duplicate-form-id",
        `${path}.forms`,
        `Chemical form ${duplicate} is duplicated.`,
      ),
    );
  }

  molecule.forms.forEach((form, index) => {
    const formPath = `${path}.forms[${index}]`;
    if (form.parentMoleculeId !== molecule.id) {
      issues.push(
        makeIssue(
          "error",
          "form-parent-mismatch",
          `${formPath}.parentMoleculeId`,
          "Chemical form must point to its containing molecule.",
        ),
      );
    }
    if (form.kind === "salt" && !form.counterionOrModifier) {
      issues.push(
        makeIssue(
          "error",
          "salt-counterion-missing",
          `${formPath}.counterionOrModifier`,
          "Salt forms must identify their counterion or modifier.",
        ),
      );
    }
    issues.push(
      ...validateVerification(form.verification, `${formPath}.verification`),
      ...validateKnownSourceIds(
        form.sourceIds,
        knownSourceIds,
        `${formPath}.sourceIds`,
      ),
    );
  });

  for (const duplicate of duplicateValues(
    molecule.regulatoryProducts.map((product) => product.id),
  )) {
    issues.push(
      makeIssue("error", "duplicate-regulatory-product-id", `${path}.regulatoryProducts`,
        `Regulatory product ${duplicate} is duplicated.`),
    );
  }
  for (const duplicate of duplicateValues(
    molecule.regulatoryProducts.map(
      (product) => `${product.applicationNumber}:${product.productNumber}`,
    ),
  )) {
    issues.push(
      makeIssue("error", "duplicate-regulatory-product-anchor", `${path}.regulatoryProducts`,
        `Regulatory application/product ${duplicate} is duplicated.`),
    );
  }
  molecule.regulatoryProducts.forEach((product, index) => {
    issues.push(
      ...validateRegulatoryProduct(
        product,
        molecule,
        knownSourceIds,
        `${path}.regulatoryProducts[${index}]`,
      ),
    );
  });

  molecule.conformers.forEach((conformer, index) => {
    const conformerPath = `${path}.conformers[${index}]`;
    issues.push(
      ...validateVerification(
        conformer.verification,
        `${conformerPath}.verification`,
      ),
    );
    if (conformer.sourceId && !knownSourceIds.has(conformer.sourceId)) {
      issues.push(
        makeIssue(
          "error",
          "unknown-source",
          `${conformerPath}.sourceId`,
          `Source ${conformer.sourceId} is not present in the source registry.`,
        ),
      );
    }
    if (conformer.url !== null && !isHttpUrl(conformer.url)) {
      issues.push(
        makeIssue(
          "error",
          "invalid-conformer-url",
          `${conformerPath}.url`,
          "Conformer URLs must use http or https.",
        ),
      );
    }
  });

  molecule.claims.forEach((claim, index) => {
    issues.push(
      ...validateEvidenceClaim(
        claim,
        knownSourceIds,
        `${path}.claims[${index}]`,
      ),
    );
    const claimSubjectIsKnown =
      claim.subjectId === molecule.id ||
      molecule.forms.some((form) => form.id === claim.subjectId) ||
      molecule.regulatoryProducts.some((product) => product.id === claim.subjectId);
    if (!claimSubjectIsKnown) {
      issues.push(
        makeIssue(
          "warning",
          "claim-subject-mismatch",
          `${path}.claims[${index}].subjectId`,
          "Claim subject differs from the containing molecule.",
        ),
      );
    }
  });

  return issues;
};

export const validateSynthesisStory = (
  story: SynthesisStory,
  knownSourceIds: ReadonlySet<SourceId>,
): readonly ValidationIssue[] => {
  const path = `synthesisStories.${story.id}`;
  const issues: ValidationIssue[] = [
    ...validateVerification(story.verification, `${path}.verification`),
    ...validateKnownSourceIds(story.sourceIds, knownSourceIds, `${path}.sourceIds`),
  ];

  if (story.steps.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "empty-synthesis-story",
        `${path}.steps`,
        "A synthesis story needs at least one educational step.",
      ),
    );
  }

  for (const duplicate of duplicateValues(story.steps.map((step) => step.id))) {
    issues.push(
      makeIssue(
        "error",
        "duplicate-synthesis-step",
        `${path}.steps`,
        `Synthesis step ${duplicate} is duplicated.`,
      ),
    );
  }

  story.steps.forEach((step, index) => {
    const stepPath = `${path}.steps[${index}]`;
    if (step.order !== index + 1) {
      issues.push(
        makeIssue(
          "error",
          "invalid-step-order",
          `${stepPath}.order`,
          "Synthesis steps must be consecutively ordered from 1.",
        ),
      );
    }
    if (!isNonBlank(step.title) || !isNonBlank(step.changeSummary)) {
      issues.push(
        makeIssue(
          "error",
          "incomplete-synthesis-step",
          stepPath,
          "Each synthesis step needs a title and change summary.",
        ),
      );
    }
    issues.push(
      ...validateVerification(step.verification, `${stepPath}.verification`),
      ...validateKnownSourceIds(
        step.sourceIds,
        knownSourceIds,
        `${stepPath}.sourceIds`,
      ),
    );
  });

  if (story.routeType === "ai-proposed" && story.verification.status === "verified") {
    issues.push(
      makeIssue(
        "error",
        "ai-route-marked-verified",
        `${path}.verification.status`,
        "An AI-proposed route cannot be marked verified without a different route classification.",
      ),
    );
  }

  return issues;
};

export const validateLearningMission = (
  mission: LearningMission,
  knownMoleculeIds: ReadonlySet<MoleculeId>,
  knownStoryIds: ReadonlySet<SynthesisStoryId>,
  knownSourceIds: ReadonlySet<SourceId>,
): readonly ValidationIssue[] => {
  const path = `missions.${mission.id}`;
  const issues: ValidationIssue[] = [
    ...validateVerification(mission.verification, `${path}.verification`),
    ...validateKnownSourceIds(mission.sourceIds, knownSourceIds, `${path}.sourceIds`),
  ];

  if (mission.estimatedMinutes <= 0 || !Number.isFinite(mission.estimatedMinutes)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-mission-duration",
        `${path}.estimatedMinutes`,
        "Estimated mission duration must be positive.",
      ),
    );
  }

  mission.moleculeIds.forEach((id, index) => {
    if (!knownMoleculeIds.has(id)) {
      issues.push(
        makeIssue(
          "error",
          "unknown-molecule",
          `${path}.moleculeIds[${index}]`,
          `Molecule ${id} is not present in the catalog.`,
        ),
      );
    }
  });

  mission.synthesisStoryIds.forEach((id, index) => {
    if (!knownStoryIds.has(id)) {
      issues.push(
        makeIssue(
          "error",
          "unknown-synthesis-story",
          `${path}.synthesisStoryIds[${index}]`,
          `Synthesis story ${id} is not present in the catalog.`,
        ),
      );
    }
  });

  for (const duplicate of duplicateValues(mission.tasks.map((task) => task.id))) {
    issues.push(
      makeIssue(
        "error",
        "duplicate-mission-task",
        `${path}.tasks`,
        `Mission task ${duplicate} is duplicated.`,
      ),
    );
  }

  mission.tasks.forEach((task, index) => {
    const taskPath = `${path}.tasks[${index}]`;

    if (task.type === "single-choice") {
      const optionIds = task.options.map((option) => option.id);
      if (!optionIds.includes(task.correctOptionId)) {
        issues.push(
          makeIssue(
            "error",
            "missing-correct-option",
            `${taskPath}.correctOptionId`,
            "The correct option must exist in the task options.",
          ),
        );
      }
      if (duplicateValues(optionIds).length > 0) {
        issues.push(
          makeIssue(
            "error",
            "duplicate-option-id",
            `${taskPath}.options`,
            "Single-choice option IDs must be unique.",
          ),
        );
      }
    }

    if (task.type === "classification") {
      const groupIds = new Set(task.groups.map((group) => group.id));
      for (const itemId of task.itemIds) {
        const groupId = task.correctGroupByItemId[itemId];
        if (!groupId || !groupIds.has(groupId)) {
          issues.push(
            makeIssue(
              "error",
              "invalid-classification-answer",
              `${taskPath}.correctGroupByItemId.${itemId}`,
              "Every classification item must map to a declared group.",
            ),
          );
        }
      }
    }

    if (task.type === "ordering") {
      const items = [...task.itemIds].sort();
      const answer = [...task.correctOrder].sort();
      if (
        duplicateValues(task.correctOrder).length > 0 ||
        items.length !== answer.length ||
        items.some((item, itemIndex) => item !== answer[itemIndex])
      ) {
        issues.push(
          makeIssue(
            "error",
            "invalid-ordering-answer",
            `${taskPath}.correctOrder`,
            "Correct order must contain each task item exactly once.",
          ),
        );
      }
    }

    if (task.type === "evidence-review") {
      for (const claimId of task.claimIds) {
        if (!task.acceptableVerdicts[claimId]) {
          issues.push(
            makeIssue(
              "error",
              "missing-evidence-verdict",
              `${taskPath}.acceptableVerdicts.${claimId}`,
              "Every reviewed claim needs an acceptable verdict.",
            ),
          );
        }
      }
    }
  });

  return issues;
};

export const validateAIEvidenceCard = (
  card: AIEvidenceCard,
  knownMoleculeIds: ReadonlySet<MoleculeId>,
  knownSourceIds: ReadonlySet<SourceId>,
): readonly ValidationIssue[] => {
  const path = `aiEvidenceCards.${card.id}`;
  const issues: ValidationIssue[] = [
    ...validateKnownSourceIds(
      card.searchedSourceIds,
      knownSourceIds,
      `${path}.searchedSourceIds`,
    ),
  ];

  if (!isIsoDate(card.generatedAt)) {
    issues.push(
      makeIssue(
        "error",
        "invalid-ai-card-date",
        `${path}.generatedAt`,
        "generatedAt must be an ISO-compatible date string.",
      ),
    );
  }

  if (card.moleculeId && !knownMoleculeIds.has(card.moleculeId)) {
    issues.push(
      makeIssue(
        "error",
        "unknown-molecule",
        `${path}.moleculeId`,
        `Molecule ${card.moleculeId} is not present in the catalog.`,
      ),
    );
  }

  if (card.databaseIdentity === "exact-match" && card.moleculeId === null) {
    issues.push(
      makeIssue(
        "error",
        "exact-match-without-molecule",
        `${path}.moleculeId`,
        "An exact database match must identify the matched catalog molecule.",
      ),
    );
  }

  card.findings.forEach((finding, index) => {
    const findingPath = `${path}.findings[${index}]`;
    issues.push(
      ...validateVerification(
        finding.verification,
        `${findingPath}.verification`,
      ),
      ...validateKnownSourceIds(
        finding.sourceIds,
        knownSourceIds,
        `${findingPath}.sourceIds`,
      ),
    );
    if (!isNonBlank(finding.label) || !isNonBlank(finding.summary)) {
      issues.push(
        makeIssue(
          "error",
          "empty-ai-finding",
          findingPath,
          "AI evidence findings need a label and summary.",
        ),
      );
    }
  });

  return issues;
};

export const validateDomainDataset = (
  dataset: DomainDataset,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const sourceIds = new Set<SourceId>(dataset.sources.map((source) => source.id));
  const moleculeIds = new Set<MoleculeId>(
    dataset.molecules.map((molecule) => molecule.id),
  );
  const storyIds = new Set<SynthesisStoryId>(
    dataset.synthesisStories.map((story) => story.id),
  );

  const duplicateCollections: readonly {
    readonly label: string;
    readonly path: string;
    readonly values: readonly string[];
  }[] = [
    {
      label: "source",
      path: "sources",
      values: dataset.sources.map((source) => source.id),
    },
    {
      label: "molecule",
      path: "molecules",
      values: dataset.molecules.map((molecule) => molecule.id),
    },
    {
      label: "molecule classification",
      path: "molecules.classifications",
      values: dataset.molecules.flatMap((molecule) =>
        molecule.classifications.map((classification) => classification.id),
      ),
    },
    {
      label: "structure asset",
      path: "molecules.structures",
      values: dataset.molecules.flatMap((molecule) => [
        molecule.structures.twoDimensional.id,
        molecule.structures.threeDimensional.id,
      ]),
    },
    {
      label: "synthesis story",
      path: "synthesisStories",
      values: dataset.synthesisStories.map((story) => story.id),
    },
    {
      label: "mission",
      path: "missions",
      values: dataset.missions.map((mission) => mission.id),
    },
    {
      label: "AI evidence card",
      path: "aiEvidenceCards",
      values: (dataset.aiEvidenceCards ?? []).map((card) => card.id),
    },
  ];

  for (const collection of duplicateCollections) {
    for (const duplicate of duplicateValues(collection.values)) {
      issues.push(
        makeIssue(
          "error",
          "duplicate-domain-id",
          collection.path,
          `Duplicate ${collection.label} ID: ${duplicate}.`,
        ),
      );
    }
  }

  dataset.sources.forEach((source) => {
    issues.push(...validateSourceReference(source));
  });
  dataset.molecules.forEach((molecule) => {
    issues.push(...validateMoleculeRecord(molecule, sourceIds));
  });
  dataset.synthesisStories.forEach((story) => {
    issues.push(...validateSynthesisStory(story, sourceIds));
    if (!moleculeIds.has(story.moleculeId)) {
      issues.push(
        makeIssue(
          "error",
          "unknown-molecule",
          `synthesisStories.${story.id}.moleculeId`,
          `Molecule ${story.moleculeId} is not present in the catalog.`,
        ),
      );
    }
  });
  dataset.missions.forEach((mission) => {
    issues.push(
      ...validateLearningMission(
        mission,
        moleculeIds,
        storyIds,
        sourceIds,
      ),
    );
  });
  (dataset.aiEvidenceCards ?? []).forEach((card) => {
    issues.push(...validateAIEvidenceCard(card, moleculeIds, sourceIds));
  });

  return issues;
};

// These aliases make the accepted ID collections discoverable to API callers.
export type DomainCatalogId =
  | MoleculeId
  | MoleculeClassificationId
  | StructureAssetId
  | SourceId
  | SynthesisStoryId
  | LearningMissionId
  | AIEvidenceCardId;
