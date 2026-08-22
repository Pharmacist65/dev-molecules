import type { AdmeProfile } from "@/lib/domain/adme";
import type { PharmacologyProfile } from "@/lib/domain/pharmacology";

import styles from "./Adme.module.css";

export interface DrugJourneyProps {
  readonly profile: AdmeProfile | null;
  readonly pharmacology: PharmacologyProfile;
  readonly locale: "tr" | "en";
}

const copy = {
  tr: {
    eyebrow: "VÜCUTTAKİ YOLCULUK",
    title: "Kaynak bulunduğu yere kadar izle",
    description: "Her düğüm bağımsız bir kanıt sınırıdır. Uygulama yolu, emilim veya terapötik sonuç yerine geçmez.",
    route: "Uygulama yolu",
    absorption: "Emilim bölgesi",
    circulation: "Sistemik dolaşım",
    distribution: "Dağılım",
    tissue: "Hedef doku / hücre",
    target: "Moleküler hedef",
    downstream: "Aşağı akım etki",
    metabolism: "Metabolizma",
    excretion: "Atılım",
    unavailable: "Kaynaklı veri henüz yok",
    contextOnly: "Ürün/form bağlamı",
  },
  en: {
    eyebrow: "DRUG JOURNEY",
    title: "Follow only as far as the evidence goes",
    description: "Every node is an independent evidence boundary. An administration route does not stand in for absorption or therapeutic outcome.",
    route: "Administration route",
    absorption: "Absorption site",
    circulation: "Systemic circulation",
    distribution: "Distribution",
    tissue: "Target tissue / cell",
    target: "Molecular target",
    downstream: "Downstream effect",
    metabolism: "Metabolism",
    excretion: "Excretion",
    unavailable: "No sourced data yet",
    contextOnly: "Product/form context",
  },
} as const;

export function DrugJourney({ profile, pharmacology, locale }: DrugJourneyProps) {
  const labels = copy[locale];
  const steps = [
    {
      id: "route",
      label: labels.route,
      value: profile?.administration.route.value ?? labels.unavailable,
      available: Boolean(profile),
    },
    {
      id: "absorption",
      label: labels.absorption,
      value: profile?.absorption[0]?.value ?? labels.unavailable,
      available: Boolean(profile?.absorption.length),
    },
    { id: "circulation", label: labels.circulation, value: labels.unavailable, available: false },
    {
      id: "distribution",
      label: labels.distribution,
      value: profile?.distribution[0]?.value ?? labels.unavailable,
      available: Boolean(profile?.distribution.length),
    },
    { id: "tissue", label: labels.tissue, value: labels.unavailable, available: false },
    {
      id: "target",
      label: labels.target,
      value: pharmacology.targets[0]?.targetName.value ?? labels.unavailable,
      available: pharmacology.targets.length > 0,
    },
    {
      id: "downstream",
      label: labels.downstream,
      value: pharmacology.pathwayEffects[0]?.description.value ?? labels.unavailable,
      available: pharmacology.pathwayEffects.length > 0,
    },
    {
      id: "metabolism",
      label: labels.metabolism,
      value: profile?.metabolism[0]?.value ?? labels.unavailable,
      available: Boolean(profile?.metabolism.length),
    },
    {
      id: "excretion",
      label: labels.excretion,
      value: profile?.excretion[0]?.value ?? labels.unavailable,
      available: Boolean(profile?.excretion.length),
    },
  ];

  return (
    <section className={styles.journey} aria-labelledby="drug-journey-heading">
      <header>
        <span>{labels.eyebrow}</span>
        <h2 id="drug-journey-heading">{labels.title}</h2>
        <p>{labels.description}</p>
      </header>
      {profile ? (
        <div className={styles.routeContext}>
          <span>{labels.contextOnly}</span>
          <strong>{profile.administration.route.value}</strong>
          <small>{profile.administration.formulation?.value}</small>
        </div>
      ) : null}
      <ol className={styles.journeyPath}>
        {steps.map((step, index) => (
          <li key={step.id} data-evidence={step.available ? "available" : "unavailable"}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{String(step.value)}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
