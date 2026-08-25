"use client";

import { useMemo, useState } from "react";

import {
  presentAdministrationRoute,
  presentDosageForm,
  selectAdmeProfile,
} from "@/lib/application/adme";
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
    emptyTitle: "İlaç-özel ADME ölçümü henüz yok",
    emptyWithContext: "Bu bağlam için kaynaklandırılmış ilaç-özel ADME ölçümü henüz yok.",
    emptyWithoutContext: "Kaynaklandırılmış ürün/form bağlamı veya ilaç-özel ADME ölçümü henüz yok.",
    profile: "Ürün / uygulama profili",
    noProfile: "Kaynaklandırılmış ürün/form bağlamı henüz yok.",
    noEvidence: "Bu bağlam için kaynaklandırılmış ADME ölçümü henüz yok.",
    absorption: "Emilim",
    distribution: "Dağılım",
    metabolism: "Metabolizma",
    excretion: "Atılım",
    conditions: "Koşullar",
    routeContext: "Kaynaklandırılmış uygulama bağlamı",
    routeNotMeasurement: "Uygulama yolu ve farmasötik form, ADME ölçümü veya farmakokinetik sonuç değildir.",
  },
  en: {
    eyebrow: "ADME",
    title: "Route- and form-specific pharmacokinetic evidence",
    description: "Oral, IV, ophthalmic, and other administration contexts are never copied into one another automatically.",
    emptyTitle: "Drug-specific ADME measurements are not available yet",
    emptyWithContext: "No sourced drug-specific ADME measurement is available for this context yet.",
    emptyWithoutContext: "No sourced product/form context or drug-specific ADME measurement is available yet.",
    profile: "Product / administration profile",
    noProfile: "No sourced product/form context is available yet.",
    noEvidence: "No sourced ADME measurement is available for this context yet.",
    absorption: "Absorption",
    distribution: "Distribution",
    metabolism: "Metabolism",
    excretion: "Excretion",
    conditions: "Conditions",
    routeContext: "Sourced administration context",
    routeNotMeasurement: "Administration route and pharmaceutical form are not ADME measurements or pharmacokinetic outcomes.",
  },
} as const;

const profileHasMeasurements = (profile: AdmeProfile): boolean =>
  profile.absorption.length > 0 ||
  profile.distribution.length > 0 ||
  profile.metabolism.length > 0 ||
  profile.excretion.length > 0;

function EvidenceList({
  fields,
  conditions,
  expert,
}: {
  readonly fields: readonly AdmeEvidenceField[];
  readonly conditions: string;
  readonly expert: boolean;
}) {
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
  const hasAnyMeasurements = profiles.some(profileHasMeasurements);

  if (!hasAnyMeasurements) {
    return (
      <section
        className={styles.admePanel}
        data-empty-coverage="adme"
        data-adme-measurements="unavailable"
        aria-labelledby="dossier-adme-heading"
      >
        <header>
          <span>{labels.eyebrow}</span>
          <h2 id="dossier-adme-heading">{labels.emptyTitle}</h2>
          <p>{profile ? labels.emptyWithContext : labels.emptyWithoutContext}</p>
        </header>
        {profile ? (
          <aside className={styles.contextCard} data-adme-context-only="true">
            <span>{labels.routeContext}</span>
            <strong>{presentAdministrationRoute(profile.administration.route.value, locale)}</strong>
            <p>{presentDosageForm(profile.administration.formulation?.value, locale)}</p>
            <small>{labels.routeNotMeasurement}</small>
          </aside>
        ) : null}
      </section>
    );
  }

  return (
    <section className={styles.admePanel} data-adme-measurements="available" aria-labelledby="dossier-adme-heading">
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
                {presentAdministrationRoute(candidate.administration.route.value, locale)} ·{" "}
                {presentDosageForm(candidate.administration.formulation?.value, locale)}
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
            <strong>{presentAdministrationRoute(profile.administration.route.value, locale)}</strong>
            <p>{presentDosageForm(profile.administration.formulation?.value, locale)}</p>
            <small>{labels.routeNotMeasurement} {profile.administration.route.conditions.note}</small>
          </aside>
          {profileHasMeasurements(profile) ? <div className={styles.phaseGrid}>
            {([
              ["absorption", labels.absorption, profile.absorption],
              ["distribution", labels.distribution, profile.distribution],
              ["metabolism", labels.metabolism, profile.metabolism],
              ["excretion", labels.excretion, profile.excretion],
            ] as const).filter(([, , fields]) => fields.length > 0).map(([id, label, fields]) => (
              <article key={id} data-phase={id}>
                <span>{label}</span>
                <EvidenceList fields={fields} conditions={labels.conditions} expert={expert} />
              </article>
            ))}
          </div> : <p className={styles.noProfile}>{labels.noEvidence}</p>}
        </>
      ) : null}
    </section>
  );
}
