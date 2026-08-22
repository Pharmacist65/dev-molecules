import type { PharmacologyProfile, TargetActionType } from "@/lib/domain/pharmacology";

import styles from "./PharmacologyPanel.module.css";

export interface PharmacologyPanelProps {
  readonly profile: PharmacologyProfile;
  readonly locale: "tr" | "en";
  readonly compact?: boolean;
}

const copy = {
  tr: {
    eyebrow: "FARMAKOLOJİ",
    title: "Hedefler ve etkileşimler",
    description: "Yalnız ölçüm bağlamı, birimi ve doğrudan kaynağı çözümlenmiş etkileşimler gösterilir.",
    unavailable: "Farmakoloji kapsamı henüz açık değil",
    target: "Hedef",
    family: "Hedef ailesi",
    action: "Eylem",
    measurement: "Ölçüm",
    context: "Tür / deney bağlamı",
    reviewed: "İncelenmiş etkileşim",
    classification: "İncelenmiş sınıflandırmalar",
  },
  en: {
    eyebrow: "PHARMACOLOGY",
    title: "Targets and interactions",
    description: "Only interactions with resolved measurement context, units, and direct sources are shown.",
    unavailable: "Pharmacology coverage is not available yet",
    target: "Target",
    family: "Target family",
    action: "Action",
    measurement: "Measurement",
    context: "Species / assay context",
    reviewed: "Reviewed interaction",
    classification: "Reviewed classifications",
  },
} as const;

const actionLabel: Readonly<Record<TargetActionType, Readonly<Record<"tr" | "en", string>>>> = {
  agonist: { tr: "Agonist", en: "Agonist" },
  antagonist: { tr: "Antagonist", en: "Antagonist" },
  inhibitor: { tr: "İnhibitör", en: "Inhibitor" },
  modulator: { tr: "Modülatör", en: "Modulator" },
  binder: { tr: "Bağlayıcı", en: "Binder" },
  other: { tr: "Diğer", en: "Other" },
};

export function PharmacologyPanel({
  profile,
  locale,
  compact = false,
}: PharmacologyPanelProps) {
  const labels = copy[locale];
  const classifications = profile.classifications;

  return (
    <section
      className={styles.panel}
      data-pharmacology-coverage={profile.availability}
      data-compact={compact}
      aria-labelledby="dossier-pharmacology-heading"
    >
      <header>
        <span>{labels.eyebrow}</span>
        <h2 id="dossier-pharmacology-heading">{labels.title}</h2>
        <p>{labels.description}</p>
      </header>

      {profile.targets.length === 0 ? (
        <div className={styles.unavailable} role="status">
          <span aria-hidden="true">○</span>
          <div>
            <strong>{labels.unavailable}</strong>
            <p>{profile.unavailableReason}</p>
          </div>
        </div>
      ) : (
        <div className={styles.targetTable} role="table" aria-label={labels.title}>
          <div className={styles.tableHeader} role="row">
            <span role="columnheader">{labels.target}</span>
            <span role="columnheader">{labels.action}</span>
            <span role="columnheader">{labels.measurement}</span>
            <span role="columnheader">{labels.context}</span>
          </div>
          {profile.targets.map((target) => (
            <div key={target.id} role="row" className={styles.targetRow}>
              <div role="cell">
                <strong>{target.targetName.value}</strong>
                <small>{target.targetFamily?.value ?? labels.family}</small>
              </div>
              <div role="cell">
                <span>{actionLabel[target.action.value][locale]}</span>
              </div>
              <div role="cell">
                <strong>{target.measurementType.value}</strong>
                <small>{target.measurement.value} {target.measurement.unit}</small>
              </div>
              <div role="cell">
                <strong>{target.species.value}</strong>
                <small>{target.assayContext.value}</small>
              </div>
              <span className={styles.reviewed}>{labels.reviewed}</span>
            </div>
          ))}
        </div>
      )}

      {classifications.length > 0 ? (
        <aside className={styles.classifications}>
          <span>{labels.classification}</span>
          <ul>
            {classifications.map((classification) => (
              <li key={classification.id}>{classification.label.value}</li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
