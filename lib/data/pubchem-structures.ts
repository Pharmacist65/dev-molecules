import type {
  MoleculeId,
  MoleculeStructureSet,
  Sdf2DStructureAsset,
  Sdf3DStructureAsset,
  SourceId,
} from "../domain";

const RETRIEVED_AT = "2026-08-21";
const PUBCHEM_PUG_RECORD_ROOT =
  "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid";

interface PubChemStructureIdentity {
  readonly moleculeId: MoleculeId;
  readonly pubChemCid: number;
  readonly sourceId: SourceId;
}

const sourceUrl = (pubChemCid: number, dimension: "2d" | "3d") =>
  `${PUBCHEM_PUG_RECORD_ROOT}/${pubChemCid}/record/SDF?record_type=${dimension}`;

const publicPath = (pubChemCid: number, dimension: "2d" | "3d") =>
  `/structures/pubchem/cid-${pubChemCid}-${dimension}.sdf` as const;

/**
 * Maps any catalog identity with a PubChem CID to its locally cached PUG REST
 * records. Callers must only create a set after both files have been acquired
 * and integrity-checked; absence must remain explicit rather than synthesized.
 */
export const createPubChemStructureSet = ({
  moleculeId,
  pubChemCid,
  sourceId,
}: PubChemStructureIdentity): MoleculeStructureSet => {
  const sourceExternalId = `PubChem CID ${pubChemCid}`;
  const shared = {
    moleculeId,
    pubChemCid,
    format: "sdf-v2000" as const,
    mediaType: "chemical/x-mdl-sdfile" as const,
    sourceId,
    sourceProvider: "PubChem PUG REST",
    sourceExternalId,
    retrievedAt: RETRIEVED_AT,
    hydrogenEncoding: "explicit" as const,
  };

  const twoDimensional: Sdf2DStructureAsset = {
    ...shared,
    id: `structure:pubchem-${pubChemCid}-2d`,
    dimension: "2d",
    publicPath: publicPath(pubChemCid, "2d"),
    sourceUrl: sourceUrl(pubChemCid, "2d"),
    origin: "database-2d-record",
    verification: {
      status: "verified",
      reviewedAt: RETRIEVED_AT,
      reviewedBy: "Dev Molecules asset integrity check",
      note:
        "The cached SDF is non-empty, names the expected PubChem CID, and contains 2D coordinates. This verifies asset identity, not a biological claim.",
    },
  };

  const threeDimensional: Sdf3DStructureAsset = {
    ...shared,
    id: `structure:pubchem-${pubChemCid}-3d`,
    dimension: "3d",
    publicPath: publicPath(pubChemCid, "3d"),
    sourceUrl: sourceUrl(pubChemCid, "3d"),
    origin: "computed-3d-conformer",
    verification: {
      status: "verified",
      reviewedAt: RETRIEVED_AT,
      reviewedBy: "Dev Molecules asset integrity check",
      note:
        "The cached SDF is non-empty, names the expected PubChem CID, and contains 3D coordinates. It is a PubChem computed conformer, not an experimental bound pose.",
    },
  };

  return {
    moleculeId,
    pubChemCid,
    twoDimensional,
    threeDimensional,
  };
};
