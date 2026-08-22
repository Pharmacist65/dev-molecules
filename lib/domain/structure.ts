import type { VerificationRecord } from "./evidence";
import type { MoleculeId, SourceId, StructureAssetId } from "./ids";

export type StructureDimension = "2d" | "3d";
export type SdfFormat = "sdf-v2000";
export type StructureHydrogenEncoding = "explicit" | "implicit" | "mixed";

export type StructureOrigin =
  | "database-2d-record"
  | "computed-3d-conformer"
  | "experimental-structure"
  | "experimental-bound-pose"
  | "user-supplied"
  | "model-generated"
  | "user-edited-conformation";

interface SdfStructureAssetBase {
  readonly id: StructureAssetId;
  readonly moleculeId: MoleculeId;
  readonly pubChemCid: number;
  readonly format: SdfFormat;
  readonly mediaType: "chemical/x-mdl-sdfile";
  /** Root-relative URL served from the application's public directory. */
  readonly publicPath: `/${string}.sdf`;
  readonly sourceId: SourceId;
  readonly sourceProvider: string;
  readonly sourceExternalId: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly hydrogenEncoding: StructureHydrogenEncoding;
  readonly verification: VerificationRecord;
}

export interface Sdf2DStructureAsset extends SdfStructureAssetBase {
  readonly dimension: "2d";
  readonly origin: "database-2d-record";
}

export interface Sdf3DStructureAsset extends SdfStructureAssetBase {
  readonly dimension: "3d";
  /** This seed provider stores PubChem computed conformers; other providers may use another origin. */
  readonly origin: "computed-3d-conformer";
}

export type SdfStructureAsset =
  | Sdf2DStructureAsset
  | Sdf3DStructureAsset;

export interface MoleculeStructureSet {
  readonly moleculeId: MoleculeId;
  readonly pubChemCid: number;
  readonly twoDimensional: Sdf2DStructureAsset;
  readonly threeDimensional: Sdf3DStructureAsset;
}

export type MoleculeStructureKey = MoleculeId | number;

export interface MoleculeStructureProvider {
  readonly providerId: string;
  getByMoleculeId(moleculeId: MoleculeId): MoleculeStructureSet | undefined;
  getByPubChemCid(pubChemCid: number): MoleculeStructureSet | undefined;
  getAsset(
    moleculeIdOrCid: MoleculeStructureKey,
    dimension: StructureDimension,
  ): SdfStructureAsset | undefined;
}

/**
 * Builds a catalog index without assuming a therapeutic class or fixture size.
 * Duplicate identifiers fail closed instead of silently replacing provenance.
 */
export const createMoleculeStructureProvider = (
  structureSets: readonly MoleculeStructureSet[],
  providerId = "catalog-structures",
): MoleculeStructureProvider => {
  const byMoleculeId = new Map<MoleculeId, MoleculeStructureSet>();
  const byPubChemCid = new Map<number, MoleculeStructureSet>();

  for (const structureSet of structureSets) {
    if (byMoleculeId.has(structureSet.moleculeId)) {
      throw new Error(`Duplicate structure molecule ID: ${structureSet.moleculeId}`);
    }
    if (byPubChemCid.has(structureSet.pubChemCid)) {
      throw new Error(`Duplicate structure PubChem CID: ${structureSet.pubChemCid}`);
    }
    byMoleculeId.set(structureSet.moleculeId, structureSet);
    byPubChemCid.set(structureSet.pubChemCid, structureSet);
  }

  const getByMoleculeId = (moleculeId: MoleculeId) => byMoleculeId.get(moleculeId);
  const getByPubChemCid = (pubChemCid: number) => byPubChemCid.get(pubChemCid);

  return {
    providerId,
    getByMoleculeId,
    getByPubChemCid,
    getAsset(moleculeIdOrCid, dimension) {
      const structureSet =
        typeof moleculeIdOrCid === "number"
          ? getByPubChemCid(moleculeIdOrCid)
          : getByMoleculeId(moleculeIdOrCid);

      if (!structureSet) return undefined;
      return dimension === "2d"
        ? structureSet.twoDimensional
        : structureSet.threeDimensional;
    },
  };
};
