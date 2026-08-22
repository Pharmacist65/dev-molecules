import type {
  EvidenceLevel,
  VerificationStatus,
} from "./evidence";
import type {
  SynthesisAtlasChallengeId,
  SynthesisAtlasSourceGate,
} from "./synthesis-atlas";

export type RoleExperienceLocale = "tr" | "en";

export type LearnerPresentationMode = "student" | "expert";

export interface StudentPresentationDepth {
  readonly mode: "student";
  readonly narrative: "guided";
  readonly sourceDetail: "icon-and-drawer";
  readonly measurements: "selected-and-explained";
  readonly assayContext: "on-demand";
  readonly comparison: "guided";
  readonly export: "unavailable";
  readonly rawScientificEnums: false;
}

export interface ExpertPresentationDepth {
  readonly mode: "expert";
  readonly narrative: "reference-dense";
  readonly sourceDetail: "citation-and-drawer";
  readonly measurements: "value-unit-conditions";
  readonly assayContext: "visible";
  readonly comparison: "multi-record";
  readonly export: "available-when-source-complete";
  readonly rawScientificEnums: false;
}

/**
 * Student and Expert are presentation depths over the same evidence. Reviewer
 * access is intentionally absent: it is a separate authorization boundary.
 */
export type LearnerPresentationDepth =
  | StudentPresentationDepth
  | ExpertPresentationDepth;

export type PresentationScientificTerm =
  | { readonly kind: "verification"; readonly value: VerificationStatus }
  | { readonly kind: "evidence"; readonly value: EvidenceLevel }
  | { readonly kind: "synthesis-source-gate"; readonly value: SynthesisAtlasSourceGate }
  | {
      readonly kind: "assessment";
      readonly value: "not-assessed" | "computed-unreviewed";
    };

export type NomenclatureInstructorTaskId = `academy:${string}`;

export type InstructorTaskReference =
  | {
      readonly kind: "nomenclature";
      readonly taskId: NomenclatureInstructorTaskId;
    }
  | {
      readonly kind: "synthesis";
      readonly taskId: SynthesisAtlasChallengeId;
    };

export type InstructorTaskAvailability = "available" | "blocked-source-gate";

export interface InstructorTaskCatalogEntry {
  readonly reference: InstructorTaskReference;
  readonly title: string;
  readonly description: string;
  readonly moduleLabel: string;
  readonly availability: InstructorTaskAvailability;
  readonly contentBoundary: string;
}

export interface DeviceLocalLessonPackage {
  readonly schemaVersion: 1;
  readonly packageId: `local-lesson-package:${string}`;
  readonly title: string;
  readonly locale: RoleExperienceLocale;
  readonly taskReferences: readonly InstructorTaskReference[];
  readonly createdAt: string;
  readonly boundary: {
    readonly storage: "device-local-download";
    readonly serverSync: false;
    readonly automaticLearnerDelivery: false;
  };
}

export interface InstructorProgressSnapshot {
  readonly scope: "device-local";
  readonly capturedAt: string;
  readonly completedNomenclatureTaskIds: readonly NomenclatureInstructorTaskId[];
  readonly completedSynthesisTaskIds: readonly SynthesisAtlasChallengeId[];
}

export interface InstructorErrorPatternSnapshot {
  readonly scope: "device-local";
  readonly capturedAt: string;
  readonly patterns: readonly {
    readonly taskReference: InstructorTaskReference;
    readonly incorrectAttemptCount: number;
    readonly localizedLabel: Readonly<Record<RoleExperienceLocale, string>>;
  }[];
}

export interface InstructorAssignmentSummary {
  readonly selectedTaskCount: number;
  readonly completedTaskCount: number | null;
  readonly completionPercent: number | null;
  readonly hasNomenclatureTask: boolean;
  readonly hasSynthesisTask: boolean;
  readonly progressBoundary: "device-local-snapshot" | "not-connected";
}

export interface InstructorProgressExport {
  readonly schemaVersion: 1;
  readonly exportedAt: string;
  readonly package: DeviceLocalLessonPackage;
  readonly progress: {
    readonly source: "device-local-snapshot";
    readonly capturedAt: string;
    readonly tasks: readonly {
      readonly reference: InstructorTaskReference;
      readonly completed: boolean;
    }[];
    readonly completedTaskCount: number;
    readonly selectedTaskCount: number;
    readonly completionPercent: number;
  };
  readonly boundary: {
    readonly containsLearnerIdentity: false;
    readonly serverRecordCreated: false;
    readonly note: string;
  };
}

export type ReviewerAccessFailure =
  | "adapter-missing"
  | "unauthenticated"
  | "forbidden"
  | "adapter-unavailable"
  | "authorization-invalid";

export type ReviewerScope =
  | "scientific-review:read"
  | "scientific-review:decide"
  | "scientific-review:correct";

export type ReviewerAuthorizationResult =
  | {
      readonly status: "authorized";
      readonly actorId: string;
      readonly role: "scientific-reviewer";
      readonly scope: readonly ReviewerScope[];
      readonly expiresAt: string;
    }
  | {
      readonly status: "unauthenticated";
      readonly reason: string;
    }
  | {
      readonly status: "forbidden";
      readonly reason: string;
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
    };

export type ReviewerConsoleReadiness =
  | { readonly status: "locked"; readonly reason: ReviewerAccessFailure }
  | { readonly status: "authorizing" }
  | {
      readonly status: "ready";
      readonly actorId: string;
      readonly scope: readonly ReviewerScope[];
      readonly expiresAt: string;
    };

export interface ReviewerSourceLocator {
  readonly sourceId: string;
  readonly provider: string;
  readonly url: string;
  readonly locator: string;
  readonly retrievedAt: string;
  readonly version: string;
  readonly contentHash: `sha256:${string}`;
}

export interface ScientificReviewRecord {
  readonly recordId: string;
  readonly claimId: string;
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly statement: string;
  readonly verificationStatus: VerificationStatus;
  readonly evidenceLevel: EvidenceLevel;
  readonly source: ReviewerSourceLocator;
  readonly rawRecord: unknown;
  readonly conflictNote: string | null;
}

export type ReviewerAction =
  | {
      readonly kind: "promote" | "demote" | "mark-conflict";
      readonly recordId: string;
      readonly expectedVersion: string;
      readonly expectedHash: `sha256:${string}`;
      readonly rationale: string;
    }
  | {
      readonly kind: "correction";
      readonly recordId: string;
      readonly expectedVersion: string;
      readonly expectedHash: `sha256:${string}`;
      readonly replacementStatement: string;
      readonly rationale: string;
    };

export interface ReviewerActionReceipt {
  readonly accepted: boolean;
  readonly auditId: string | null;
  readonly message: string;
}

/**
 * The public static application supplies no default implementation. A host
 * must inject an adapter backed by real authentication, authorization, audit,
 * and persistence before review controls can become interactive.
 */
export interface ScientificReviewerAdapter {
  authorize(signal?: AbortSignal): Promise<ReviewerAuthorizationResult>;
  listReviewRecords(signal?: AbortSignal): Promise<readonly ScientificReviewRecord[]>;
  submitAction(
    action: ReviewerAction,
    signal?: AbortSignal,
  ): Promise<ReviewerActionReceipt>;
}
