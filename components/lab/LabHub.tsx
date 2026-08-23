"use client";

import { lazy, Suspense, useMemo, useState } from "react";

import { createLocalEvidenceCard } from "@/lib/application/evidence-card";
import { presentEvidenceStatus } from "@/lib/application/evidence-status-presentation";
import {
  createCanonicalSmilesPathFingerprint,
  tanimotoSimilarity,
} from "@/lib/explore";
import { moleculeCatalog } from "@/lib/data/catalog";
import { createTranslator } from "@/lib/i18n";

import styles from "./LabHub.module.css";

const KetcherWorkspace = lazy(() =>
  import("./KetcherWorkspace").then((module) => ({
    default: module.KetcherWorkspace,
  })),
);

type LabArea = "builder" | "compare" | "evidence" | "sandbox";

const content = {
  tr: {
    eyebrow: "Laboratuvar",
    title: "Yapıyı çiz, karşılaştır ve kanıt sınırını koru.",
    intro: "Hesaplama cihazında kalır. Çizilen yapı bir keşif veya doğrulanmış bilimsel sonuç değildir.",
    builder: "Molekül Oluşturucu",
    compare: "Molekülleri Karşılaştır",
    evidence: "Kanıt Çalışma Alanı",
    sandbox: "Araştırma Deneme Alanı",
    local: "Cihazda çalışan",
    computed: "Hesaplanmış · incelenmemiş",
    compareTitle: "İki–dört kürate edilmiş yapıyı karşılaştır",
    compareBody: "Bu görünüm yalnız kanonik-SMILES yol fingerprint yakınlığını hesaplar; ortak biyolojik etki veya klinik eşdeğerlik ileri sürmez.",
    selection: "Karşılaştırma seçimi",
    evidenceTitle: "Boş bir AI paneli değil, çözümlenebilir yerel kanıt özeti",
    evidenceBody: "Public statik sürüm yalnız kürate edilmiş kayıtları ve kaynak kimliklerini sunar. Model üretimi kapalıdır.",
    chooseDrug: "Katalog kimliği",
    source: "Kaynaklar",
    limitations: "Sınırlar",
    sandboxTitle: "Özel Araştırma Betası",
    sandboxBody: "Bu yüzey herkese açık sürümde etkin değildir. Sunucu tarafı API, kimlik doğrulama, özel depolama, kota, denetim ve açık onay olmadan araştırma üretimi açılmaz.",
    unavailable: "Şu an kullanılamıyor",
    privateBeta: "Özel beta",
    required: "Açılmadan önce gereken sınırlar",
    editorLoading: "2B editör rotası yükleniyor…",
  },
  en: {
    eyebrow: "Laboratory",
    title: "Draw, compare, and keep the evidence boundary intact.",
    intro: "Computation stays on this device. A drawn structure is not a discovery or a verified scientific result.",
    builder: "Molecule Builder",
    compare: "Compare Molecules",
    evidence: "Evidence Workspace",
    sandbox: "Research Sandbox",
    local: "On-device",
    computed: "Computed · unreviewed",
    compareTitle: "Compare two to four curated structures",
    compareBody: "This view calculates canonical-SMILES path-fingerprint proximity only; it makes no claim of shared biology or clinical equivalence.",
    selection: "Comparison selection",
    evidenceTitle: "A resolvable local evidence summary, not an empty AI panel",
    evidenceBody: "The public static build presents curated records and source identifiers only. Model generation is disabled.",
    chooseDrug: "Catalog identity",
    source: "Sources",
    limitations: "Limitations",
    sandboxTitle: "Private Research Beta",
    sandboxBody: "This surface is not enabled in the public build. Research generation remains unavailable without a server-side API, authentication, private storage, quotas, audit, and explicit consent.",
    unavailable: "Unavailable now",
    privateBeta: "Private beta",
    required: "Boundaries required before launch",
    editorLoading: "Loading the 2D editor route…",
  },
} as const;

export interface LabHubProps {
  readonly locale: "tr" | "en";
  readonly initialArea?: LabArea;
}

export function LabHub({ locale, initialArea = "builder" }: LabHubProps) {
  const t = content[locale];
  const [area, setArea] = useState<LabArea>(initialArea);

  const tabs: readonly { id: LabArea; label: string; badge?: string }[] = [
    { id: "builder", label: t.builder, badge: t.local },
    { id: "compare", label: t.compare, badge: t.computed },
    { id: "evidence", label: t.evidence, badge: t.local },
    { id: "sandbox", label: t.sandbox, badge: t.privateBeta },
  ];

  return (
    <main className={styles.lab} data-lab-area={area}>
      <header className={styles.hero}>
        <p>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <span>{t.intro}</span>
      </header>

      <nav className={styles.tabList} aria-label={t.eyebrow}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={area === tab.id ? "page" : undefined}
            onClick={() => setArea(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.badge ? <small>{tab.badge}</small> : null}
          </button>
        ))}
      </nav>

      {area === "builder" ? (
        <Suspense fallback={<div className={styles.routeLoading}>{t.editorLoading}</div>}>
          <KetcherWorkspace locale={locale} />
        </Suspense>
      ) : null}
      {area === "compare" ? <LocalComparison locale={locale} /> : null}
      {area === "evidence" ? <LocalEvidenceWorkspace locale={locale} /> : null}
      {area === "sandbox" ? <PrivateSandbox locale={locale} /> : null}
    </main>
  );
}

function LocalComparison({ locale }: { readonly locale: "tr" | "en" }) {
  const t = content[locale];
  const [selectedIds, setSelectedIds] = useState<string[]>(
    moleculeCatalog.slice(0, 2).map((record) => record.id),
  );
  const selected = moleculeCatalog.filter((record) => selectedIds.includes(record.id));
  const matrix = useMemo(
    () =>
      selected.map((left) => ({
        id: left.id,
        name: left.identity.preferredName,
        values: selected.map((right) => ({
          id: right.id,
          score: tanimotoSimilarity(
            createCanonicalSmilesPathFingerprint(left.identity.canonicalSmiles),
            createCanonicalSmilesPathFingerprint(right.identity.canonicalSmiles),
          ),
        })),
      })),
    [selected],
  );

  return (
    <section className={styles.workspace} aria-labelledby="lab-compare-heading">
      <header className={styles.workspaceHeader}>
        <div><p>{t.computed}</p><h2 id="lab-compare-heading">{t.compareTitle}</h2><span>{t.compareBody}</span></div>
      </header>
      <div className={styles.compareLayout}>
        <fieldset>
          <legend>{t.selection}</legend>
          {moleculeCatalog.map((record) => {
            const checked = selectedIds.includes(record.id);
            return (
              <label key={record.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selectedIds.length >= 4}
                  onChange={() =>
                    setSelectedIds((current) =>
                      checked
                        ? current.length > 2
                          ? current.filter((id) => id !== record.id)
                          : current
                        : [...current, record.id],
                    )
                  }
                />
                <span>{record.identity.preferredName}</span>
                <small>{record.identity.molecularFormula}</small>
              </label>
            );
          })}
        </fieldset>
        <div className={styles.similarityMatrix} role="table" aria-label={t.compareTitle}>
          {matrix.map((row) => (
            <div key={row.id} role="row">
              <strong>{row.name}</strong>
              {row.values.map((value) => (
                <span key={value.id}>{Math.round(value.score * 100)}%</span>
              ))}
            </div>
          ))}
          <p>{t.compareBody}</p>
        </div>
      </div>
    </section>
  );
}

function LocalEvidenceWorkspace({ locale }: { readonly locale: "tr" | "en" }) {
  const t = content[locale];
  const translate = createTranslator(locale);
  const [moleculeId, setMoleculeId] = useState<string>(moleculeCatalog[0]?.id ?? "");
  const card = useMemo(
    () =>
      createLocalEvidenceCard(
        moleculeId,
        locale === "tr" ? "Bu kürate edilmiş kayıt neyi destekliyor?" : "What does this curated record support?",
        locale,
      ),
    [locale, moleculeId],
  );

  return (
    <section className={styles.workspace} aria-labelledby="lab-evidence-heading">
      <header className={styles.workspaceHeader}>
        <div><p>{t.local}</p><h2 id="lab-evidence-heading">{t.evidenceTitle}</h2><span>{t.evidenceBody}</span></div>
      </header>
      <label className={styles.evidenceSelect}>
        <span>{t.chooseDrug}</span>
        <select value={moleculeId} onChange={(event) => setMoleculeId(event.target.value)}>
          {moleculeCatalog.map((record) => <option key={record.id} value={record.id}>{record.identity.preferredName}</option>)}
        </select>
      </label>
      {card ? (
        <article className={styles.localEvidenceCard}>
          <header><div><span>{presentEvidenceStatus(card.mode, translate)}</span><h3>{card.moleculeName}</h3></div><strong>{presentEvidenceStatus(card.identityStatus, translate)}</strong></header>
          <p>{card.summary}</p>
          <div className={styles.findings}>
            {card.findings.map((finding) => (
              <div key={finding.label}><span>{presentEvidenceStatus(finding.status, translate)}</span><strong>{finding.label}</strong><p>{finding.value}</p></div>
            ))}
          </div>
          <details>
            <summary>{t.source} · {card.sources.length}</summary>
            {card.sources.map((source) => <p key={source.id}><strong>{source.provider}</strong> · {source.title}</p>)}
          </details>
          <details>
            <summary>{t.limitations}</summary>
            <ul>{card.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          </details>
        </article>
      ) : null}
    </section>
  );
}

function PrivateSandbox({ locale }: { readonly locale: "tr" | "en" }) {
  const t = content[locale];
  const requirements = locale === "tr"
    ? ["Sunucu tarafı API", "Kimlik doğrulama", "Özel proje depolaması", "Kota ve maliyet sınırı", "Audit izi", "Açık kullanıcı onayı"]
    : ["Server-side API", "Authentication", "Private project storage", "Quota and cost boundary", "Audit trail", "Explicit user consent"];
  return (
    <section className={styles.sandbox} aria-labelledby="research-sandbox-heading">
      <div aria-hidden="true">β</div>
      <p>{t.unavailable}</p>
      <h2 id="research-sandbox-heading">{t.sandboxTitle}</h2>
      <span>{t.sandboxBody}</span>
      <h3>{t.required}</h3>
      <ul>{requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
    </section>
  );
}
