import {
  SmilesNotationPanel,
  type SmilesNotationMode,
} from "@/components/chemistry/SmilesNotationPanel";
import { MoleculeViewer } from "@/components/molecule-viewer";
import type { DrugDossierRecord } from "@/lib/domain/dossier";

import styles from "./DrugDossier.module.css";

export interface ChemistryOverviewProps {
  readonly dossier: DrugDossierRecord;
  readonly locale: "tr" | "en";
  readonly compact?: boolean;
  readonly smilesMode?: SmilesNotationMode;
}

export function ChemistryOverview({
  dossier,
  locale,
  compact = false,
  smilesMode = compact ? "story" : "student",
}: ChemistryOverviewProps) {
  const labels = locale === "tr"
    ? {
        eyebrow: "KİMYA",
        title: "Yapıyı kimlik sınırlarıyla oku",
        formula: "Molekül formülü",
        weight: "Molekül ağırlığı",
        systematic: "Sistematik ad",
        stereo: "Stereokimya",
        forms: "Kimyasal formlar",
        descriptors: "Bu Dossier'a henüz aktarılmayan tanımlayıcılar",
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
        descriptors: "Descriptors not yet normalized into this Dossier",
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
  const descriptorLabels: Readonly<Record<string, Readonly<Record<"tr" | "en", string>>>> = {
    "formal-charge": { tr: "Biçimsel yük", en: "Formal charge" },
    pka: { tr: "pKa", en: "pKa" },
    "logp-logd": { tr: "LogP / LogD", en: "LogP / LogD" },
    tpsa: { tr: "Topolojik polar yüzey alanı", en: "Topological polar surface area" },
    "h-bond-donors": { tr: "Hidrojen bağı vericileri", en: "Hydrogen-bond donors" },
    "h-bond-acceptors": { tr: "Hidrojen bağı alıcıları", en: "Hydrogen-bond acceptors" },
    "rotatable-bonds": { tr: "Dönebilir bağlar", en: "Rotatable bonds" },
    "ring-systems": { tr: "Halka sistemleri", en: "Ring systems" },
  };

  return (
    <section
      className={styles.chemistry}
      data-compact={compact}
      data-dossier-chemistry="true"
      aria-labelledby="dossier-chemistry-heading"
    >
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
              originLabel={threeD.origin}
              sourceHref={threeD.sourceUrl}
              twoDSourceLabel={labels.source}
              twoDOriginLabel={twoD?.origin}
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
          <SmilesNotationPanel
            canonicalSmiles={dossier.chemistry.canonicalSmiles.value}
            isomericSmiles={dossier.chemistry.isomericSmiles?.value ?? null}
            locale={locale}
            mode={smilesMode}
          />
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
              <p>
                {dossier.chemistry.unavailableDescriptorKeys
                  .map((key) => descriptorLabels[key]?.[locale] ?? key)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
