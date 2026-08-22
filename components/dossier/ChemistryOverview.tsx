import { MoleculeViewer } from "@/components/molecule-viewer";
import type { DrugDossierRecord } from "@/lib/domain/dossier";

import styles from "./DrugDossier.module.css";

export interface ChemistryOverviewProps {
  readonly dossier: DrugDossierRecord;
  readonly locale: "tr" | "en";
  readonly compact?: boolean;
}

export function ChemistryOverview({ dossier, locale, compact = false }: ChemistryOverviewProps) {
  const labels = locale === "tr"
    ? {
        eyebrow: "KİMYA",
        title: "Yapıyı kimlik sınırlarıyla oku",
        formula: "Molekül formülü",
        weight: "Molekül ağırlığı",
        systematic: "Sistematik ad",
        stereo: "Stereokimya",
        forms: "Kimyasal formlar",
        descriptors: "Kaynak bekleyen tanımlayıcılar",
        unavailable: "Kaynaklı alan henüz yok",
        activeMoiety: "Ana molekül",
        pharmaceuticalForm: "Farmasötik form",
        relatedForm: "İlişkili form",
        source: "PubChem yapı kaydı",
        computed3d: "Hesaplanmış 3B konformer",
      }
    : {
        eyebrow: "CHEMISTRY",
        title: "Read the structure with identity boundaries intact",
        formula: "Molecular formula",
        weight: "Molecular weight",
        systematic: "Systematic name",
        stereo: "Stereochemistry",
        forms: "Chemical forms",
        descriptors: "Descriptors awaiting a source",
        unavailable: "No sourced field yet",
        activeMoiety: "Parent molecule",
        pharmaceuticalForm: "Pharmaceutical form",
        relatedForm: "Related form",
        source: "PubChem structure record",
        computed3d: "Computed 3D conformer",
      };
  const twoD = dossier.chemistry.structures.find((structure) => structure.dimension === "2d");
  const threeD = dossier.chemistry.structures.find((structure) => structure.dimension === "3d");
  const relationshipLabel = {
    "active-moiety": labels.activeMoiety,
    "pharmaceutical-form": labels.pharmaceuticalForm,
    "related-form": labels.relatedForm,
  } as const;

  return (
    <section className={styles.chemistry} data-compact={compact} aria-labelledby="dossier-chemistry-heading">
      <header>
        <span>{labels.eyebrow}</span>
        <h2 id="dossier-chemistry-heading">{labels.title}</h2>
      </header>
      <div className={styles.chemistryGrid}>
        {threeD ? (
          <div className={styles.structureStage}>
            <MoleculeViewer
              structureUrl={threeD.publicPath}
              twoDStructureUrl={twoD?.publicPath}
              moleculeName={dossier.preferredName}
              expectedPubChemCid={dossier.sourceRecord.identity.pubChemCid}
              sourceLabel={labels.source}
              originLabel={labels.computed3d}
              sourceHref={threeD.sourceUrl}
              twoDSourceLabel={labels.source}
              twoDOriginLabel={labels.source}
              twoDSourceHref={twoD?.sourceUrl}
              initialDimension="3d"
            />
          </div>
        ) : null}
        <div className={styles.chemistryFacts}>
          <dl>
            <div><dt>{labels.systematic}</dt><dd>{dossier.chemistry.systematicName?.value ?? labels.unavailable}</dd></div>
            <div><dt>{labels.formula}</dt><dd>{dossier.chemistry.molecularFormula.value}</dd></div>
            <div><dt>{labels.weight}</dt><dd>{dossier.chemistry.molecularWeight.value} {dossier.chemistry.molecularWeight.unit}</dd></div>
            <div><dt>{labels.stereo}</dt><dd>{dossier.chemistry.stereochemistry?.value ?? labels.unavailable}</dd></div>
          </dl>
          <div className={styles.forms}>
            <span>{labels.forms}</span>
            {dossier.chemistry.chemicalForms.length > 0 ? (
              <ul>
                {dossier.chemistry.chemicalForms.map((form) => (
                  <li key={form.id}>
                    <strong>{form.displayName}</strong>
                    <small>{relationshipLabel[form.relation]}</small>
                  </li>
                ))}
              </ul>
            ) : <p>{labels.unavailable}</p>}
          </div>
          {!compact ? (
            <div className={styles.descriptorBoundary}>
              <span>{labels.descriptors}</span>
              <p>{dossier.chemistry.unavailableDescriptorKeys.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
