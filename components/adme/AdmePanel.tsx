"use client";

import { useMemo, useState } from "react";

import { selectAdmeProfile } from "@/lib/application/adme";
import type { AdmeEvidenceField, AdmeProfile } from "@/lib/domain/adme";

import styles from "./Adme.module.css";

export interface AdmePanelProps {
  readonly profiles: readonly AdmeProfile[];
  readonly locale: "tr" | "en";
  readonly expert?: boolean;
}

const copy = {
  tr: {
    eyebrow: "ADME",
    title: "Yol ve forma özgü farmakokinetik kanıt",
    description: "Oral, IV, oftalmik ve diğer uygulama bağlamları otomatik olarak birbirine kopyalanmaz.",
    profile: "Ürün / uygulama profili",
    noProfile: "Kaynaklandırılmış ürün/form bağlamı henüz yok.",
    noEvidence: "Bu bağlam için kaynaklandırılmış ADME ölçümü henüz yok.",
    absorption: "Emilim",
    distribution: "Dağılım",
    metabolism: "Metabolizma",
    excretion: "Atılım",
    conditions: "Koşullar",
    routeContext: "Doğrulanmış uygulama bağlamı",
  },
  en: {
    eyebrow: "ADME",
    title: "Route- and form-specific pharmacokinetic evidence",
    description: "Oral, IV, ophthalmic, and other administration contexts are never copied into one another automatically.",
    profile: "Product / administration profile",
    noProfile: "No sourced product/form context is available yet.",
    noEvidence: "No sourced ADME measurement is available for this context yet.",
    absorption: "Absorption",
    distribution: "Distribution",
    metabolism: "Metabolism",
    excretion: "Excretion",
    conditions: "Conditions",
    routeContext: "Verified administration context",
  },
} as const;

function EvidenceList({
  fields,
  empty,
  conditions,
  expert,
}: {
  readonly fields: readonly AdmeEvidenceField[];
  readonly empty: string;
  readonly conditions: string;
  readonly expert: boolean;
}) {
  if (fields.length === 0) return <p className={styles.emptyPhase}>{empty}</p>;
  return (
    <dl className={styles.evidenceList}>
      {fields.map((field) => (
        <div key={field.id}>
          <dt>{field.label}</dt>
          <dd>{field.value} {field.unit}</dd>
          {expert ? <small>{conditions}: {field.conditions.note}</small> : null}
        </div>
      ))}
    </dl>
  );
}

export function AdmePanel({ profiles, locale, expert = false }: AdmePanelProps) {
  const labels = copy[locale];
  const [selectedId, setSelectedId] = useState<string | null>(profiles[0]?.id ?? null);
  const profile = useMemo(
    () => selectAdmeProfile(profiles, selectedId),
    [profiles, selectedId],
  );

  return (
    <section className={styles.admePanel} aria-labelledby="dossier-adme-heading">
      <header>
        <span>{labels.eyebrow}</span>
        <h2 id="dossier-adme-heading">{labels.title}</h2>
        <p>{labels.description}</p>
      </header>
      {profiles.length > 0 ? (
        <label className={styles.profileSelect}>
          <span>{labels.profile}</span>
          <select value={profile?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
            {profiles.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.administration.route.value} · {candidate.administration.formulation?.value}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className={styles.noProfile}>{labels.noProfile}</p>
      )}

      {profile ? (
        <>
          <aside className={styles.contextCard} data-adme-context-only={profile.evidenceAvailability === "context-only"}>
            <span>{labels.routeContext}</span>
            <strong>{profile.administration.route.value}</strong>
            <p>{profile.administration.formulation?.value}</p>
            <small>{profile.administration.route.conditions.note}</small>
          </aside>
          <div className={styles.phaseGrid}>
            {([
              ["absorption", labels.absorption, profile.absorption],
              ["distribution", labels.distribution, profile.distribution],
              ["metabolism", labels.metabolism, profile.metabolism],
              ["excretion", labels.excretion, profile.excretion],
            ] as const).map(([id, label, fields]) => (
              <article key={id} data-phase={id}>
                <span>{label}</span>
                <EvidenceList fields={fields} empty={labels.noEvidence} conditions={labels.conditions} expert={expert} />
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
