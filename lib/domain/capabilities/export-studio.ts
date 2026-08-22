import type { MoleculeId, SourceId } from "../ids";
import type { ScientificPortResult } from "./common";

export type FigureExportFormat = "png" | "svg";
export type FigureAspectRatio = "free" | "1:1" | "4:3" | "16:9" | "a4-portrait";

export interface FigureExportRequest {
  readonly moleculeIds: readonly MoleculeId[];
  readonly representation: "2d" | "3d" | "comparison";
  readonly format: FigureExportFormat;
  readonly resolution: "standard" | "high";
  readonly widthPx: number;
  readonly heightPx: number;
  readonly transparentBackground: boolean;
  readonly aspectRatio: FigureAspectRatio;
  readonly labelMode: "labelled" | "unlabelled";
  readonly includeCitationStrip: boolean;
  readonly highlightedFeatureIds: readonly string[];
  readonly sourceIds: readonly SourceId[];
}

export interface FigureExportArtifact {
  readonly mediaType: "image/png" | "image/svg+xml";
  readonly locator: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly rendererId: string;
  readonly rendererVersion: string;
  readonly generatedAt: string;
  readonly sourceIds: readonly SourceId[];
}

export interface FigureExportPort {
  readonly adapterId: string;
  readonly rendererKind: "molecular-figure-renderer" | "chemical-diagram-renderer";
  exportFigure(
    request: FigureExportRequest,
  ): Promise<ScientificPortResult<FigureExportArtifact>>;
}

export interface FigureExportEligibilityAssessment {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export const assessFigureExportRequest = (
  request: FigureExportRequest,
): FigureExportEligibilityAssessment => {
  const reasons: string[] = [];
  if (request.moleculeIds.length === 0) reasons.push("At least one molecule is required.");
  if (request.representation === "comparison" && request.moleculeIds.length < 2) {
    reasons.push("Comparison figures require at least two molecules.");
  }
  if (!Number.isInteger(request.widthPx) || !Number.isInteger(request.heightPx)) {
    reasons.push("Figure dimensions must be integer pixels.");
  }
  if (request.widthPx < 320 || request.heightPx < 240) {
    reasons.push("Figure dimensions are below the supported output minimum.");
  }
  if (request.format === "svg" && request.representation !== "2d") {
    reasons.push("SVG export is limited to 2D chemical structures.");
  }
  if (request.includeCitationStrip && request.sourceIds.length === 0) {
    reasons.push("A citation strip requires resolvable source IDs.");
  }
  return { eligible: reasons.length === 0, reasons };
};
