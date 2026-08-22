import { translate } from "../i18n/core";
import type { Locale } from "../i18n/locale";
import type { TranslationKey } from "../i18n/messages";

export type StructurePresentationDimension = "2d" | "3d";

export interface StructureProvenancePresentationInput {
  readonly dimension: StructurePresentationDimension;
  readonly origin?: string | null;
  readonly sourceLabel?: string | null;
  readonly sourceId?: string | null;
}

export interface StructureProvenancePresentation {
  readonly heading: string;
  readonly note: string;
}

/** Centralized, fail-closed scientific wording for structure provenance. */
export function getStructureProvenancePresentation({
  dimension,
  origin,
  sourceLabel,
  sourceId,
}: StructureProvenancePresentationInput, locale: Locale = "tr"): StructureProvenancePresentation {
  const isPubChem = /pubchem/i.test([sourceLabel, sourceId].filter(Boolean).join(" "));

  const present = (
    headingKey: TranslationKey,
    noteKey: TranslationKey,
  ): StructureProvenancePresentation => ({
    heading: translate(locale, headingKey),
    note: translate(locale, noteKey),
  });

  if (dimension === "2d") {
    return present(
      isPubChem
        ? "viewer.presentation.2dPubChemHeading"
        : "viewer.presentation.2dCanonicalHeading",
      "viewer.presentation.2dNote",
    );
  }

  switch (origin) {
    case "computed-3d-conformer":
      return present(
        isPubChem
          ? "viewer.presentation.computedPubChemHeading"
          : "viewer.presentation.computedHeading",
        "viewer.presentation.computedNote",
      );
    case "experimental-structure":
      return present(
        "viewer.presentation.experimentalHeading",
        "viewer.presentation.experimentalNote",
      );
    case "experimental-bound-pose":
      return present(
        "viewer.presentation.boundPoseHeading",
        "viewer.presentation.boundPoseNote",
      );
    case "user-supplied":
      return present(
        "viewer.presentation.importedHeading",
        "viewer.presentation.importedNote",
      );
    case "model-generated":
      return present(
        "viewer.presentation.modelHeading",
        "viewer.presentation.modelNote",
      );
    case "user-edited-conformation":
      return present(
        "viewer.presentation.editedHeading",
        "viewer.presentation.editedNote",
      );
    default:
      return present(
        "viewer.presentation.unknownHeading",
        "viewer.presentation.unknownNote",
      );
  }
}
