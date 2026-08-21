import type { VerificationRecord } from "./evidence";
import type {
  LearningMissionId,
  LearningProgressId,
  MoleculeId,
  SourceId,
  SynthesisStoryId,
} from "./ids";

export type LearningMissionKind =
  | "find-the-drug"
  | "build-the-scaffold"
  | "repair-the-molecule"
  | "synthesis-route-puzzle"
  | "sar-challenge"
  | "target-match"
  | "mechanism-detective"
  | "evidence-hunt";

export type LearningLevel = "foundation" | "advanced" | "literature";

export type MissionTask =
  | {
      readonly id: string;
      readonly type: "single-choice";
      readonly prompt: string;
      readonly options: readonly { readonly id: string; readonly label: string }[];
      readonly correctOptionId: string;
    }
  | {
      readonly id: string;
      readonly type: "classification";
      readonly prompt: string;
      readonly itemIds: readonly string[];
      readonly groups: readonly { readonly id: string; readonly label: string }[];
      readonly correctGroupByItemId: Readonly<Record<string, string>>;
    }
  | {
      readonly id: string;
      readonly type: "ordering";
      readonly prompt: string;
      readonly itemIds: readonly string[];
      readonly correctOrder: readonly string[];
    }
  | {
      readonly id: string;
      readonly type: "evidence-review";
      readonly prompt: string;
      readonly claimIds: readonly string[];
      readonly acceptableVerdicts: Readonly<
        Record<string, "accept" | "qualify" | "reject">
      >;
    };

export interface LearningMission {
  readonly id: LearningMissionId;
  readonly slug: string;
  readonly title: string;
  readonly kind: LearningMissionKind;
  readonly level: LearningLevel;
  readonly objective: string;
  readonly moleculeIds: readonly MoleculeId[];
  readonly synthesisStoryIds: readonly SynthesisStoryId[];
  readonly tasks: readonly MissionTask[];
  readonly sourceIds: readonly SourceId[];
  readonly estimatedMinutes: number;
  readonly verification: VerificationRecord;
}

export type LearningProgressStatus =
  | "not-started"
  | "in-progress"
  | "completed";

export interface LearningProgress {
  readonly id: LearningProgressId;
  readonly missionId: LearningMissionId;
  readonly learnerId: string;
  readonly status: LearningProgressStatus;
  readonly completedTaskIds: readonly string[];
  readonly attempts: number;
  readonly scorePercent: number | null;
  readonly misconceptionCodes: readonly string[];
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export const createInitialLearningProgress = (
  id: LearningProgressId,
  missionId: LearningMissionId,
  learnerId: string,
): LearningProgress => ({
  id,
  missionId,
  learnerId,
  status: "not-started",
  completedTaskIds: [],
  attempts: 0,
  scorePercent: null,
  misconceptionCodes: [],
  startedAt: null,
  completedAt: null,
});
