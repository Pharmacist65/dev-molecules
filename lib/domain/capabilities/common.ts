import type { SourceId } from "../ids";

export type ScientificDataStatus =
  | "experimental"
  | "computed"
  | "predicted"
  | "user-supplied";

export interface ScientificToolRef {
  readonly name: string;
  readonly version: string;
}

export interface ScientificConditions {
  /** Human-readable boundary such as pH, solvent, assay, or "not applicable". */
  readonly summary: string;
  readonly values: Readonly<Record<string, string | number>>;
}

export interface OperationProvenance {
  readonly providerId: string;
  readonly sourceIds: readonly SourceId[];
  readonly sourceLocators: readonly string[];
  readonly method: string | null;
  readonly tool: ScientificToolRef | null;
  readonly conditions: ScientificConditions;
  readonly dataStatus: ScientificDataStatus;
  readonly generatedAt: string | null;
  readonly limitations: readonly string[];
}

export type PortFailureCode =
  | "not-found"
  | "unsupported-input"
  | "invalid-structure"
  | "ambiguous-identity"
  | "provider-unavailable"
  | "rate-limited"
  | "ineligible-evidence"
  | "analysis-failed";

export interface PortFailure {
  readonly code: PortFailureCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Provenance is mandatory on both success and failure so parsers and remote
 * adapters cannot erase which provider, file, or method produced the outcome.
 */
export type ScientificPortResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly provenance: OperationProvenance;
    }
  | {
      readonly ok: false;
      readonly failure: PortFailure;
      readonly provenance: OperationProvenance;
    };
