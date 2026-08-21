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
}: StructureProvenancePresentationInput): StructureProvenancePresentation {
  const isPubChem = /pubchem/i.test([sourceLabel, sourceId].filter(Boolean).join(" "));

  if (dimension === "2d") {
    return {
      heading: isPubChem ? "PUBCHEM CANONICAL 2B KAYIT" : "CANONICAL 2B KAYIT",
      note: "İki boyutlu veritabanı yerleşimidir; 3B kökenden türetilmez.",
    };
  }

  switch (origin) {
    case "computed-3d-conformer":
      return {
        heading: isPubChem
          ? "PUBCHEM HESAPLANMIŞ 3B KONFORMER"
          : "HESAPLANMIŞ 3B KONFORMER",
        note: "Deneysel kristal veya protein-bound pose değildir.",
      };
    case "experimental-structure":
      return {
        heading: "DENEYSEL 3B YAPI",
        note: "Bu genel köken etiketi protein-bound pose anlamına gelmez; doğrudan kaynağı inceleyin.",
      };
    case "experimental-bound-pose":
      return {
        heading: "DENEYSEL BAĞLI POZ",
        note: "Deneysel bağlı-poz iddiası yalnız doğrudan kaynak ve inceleme kaydıyla birlikte gösterilir.",
      };
    case "user-supplied":
      return {
        heading: "İÇE AKTARILMIŞ 3B KAYIT",
        note: "Köken ve doğrulama durumu kullanıcı kaydından ayrı izlenir.",
      };
    case "model-generated":
      return {
        heading: "MODEL TARAFINDAN ÜRETİLMİŞ KONFORMER",
        note: "Deneysel olarak doğrulanmış bir yapı değildir.",
      };
    case "user-edited-conformation":
      return {
        heading: "KULLANICI TARAFINDAN DÜZENLENMİŞ KONFORMASYON",
        note: "Kullanıcı düzenlemesi deneysel doğrulama olarak yorumlanamaz.",
      };
    default:
      return {
        heading: "3B YAPI KÖKENİ İNCELEMEDE",
        note: "Köken doğrulanmadan deneysel yapı olarak yorumlanamaz.",
      };
  }
}
