"use client";

import { lazy, Suspense, useMemo, useState } from "react";

import { MoleculeStructurePreview } from "@/components/molecule-viewer";
import {
  buildFamilyComparisonRows,
  buildFamilyFingerprintComparison,
  getFamilyCoverageGaps,
  type FamilyComparisonRow,
} from "@/lib/application/family-page";
import type {
  DrugClassificationSystem,
  DrugFamilyPageModel,
  FamilyComparisonFieldId,
  FamilyEvidenceField,
  FamilyEvidenceSource,
  LocalizedFamilyText,
} from "@/lib/domain/drug-family";
import type { Locale } from "@/lib/i18n";

import type { AtlasSpatialConfiguration } from "./types";
import styles from "./FamilyPage.module.css";

const LazyAtlasSpatialView = lazy(() => import("./AtlasSpatialView"));

const copyByLocale = {
  tr: {
    eyebrow: "Aday Kayıt İncelemesi",
    overview: "İnceleme seti sınırı",
    hierarchy: "Üyelik / sınıflandırma durumu",
    sharedMechanism: "Ortak mekanizma kanıt durumu",
    primaryTargets: "Ortak hedef kanıt durumu",
    sharedMotifs: "Ortak yapısal motif kanıt durumu",
    candidateIdentities: "Aday kimlikler",
    compare2d: "2B karşılaştırma",
    explore3d: "Aday yapıları 3B incele",
    hide3d: "3B görünümü kapat",
    spatialLoading: "Aday 3B yapılar yükleniyor…",
    spatialScope: "Aday kayıt 3B örneklemi",
    spatialBoundary: "Yalnız seçilmiş aday kimlikler; bu sette üyelik kurulmamıştır.",
    fingerprint: "Yapısal fingerprint karşılaştırması",
    fingerprintBoundary: "Hesaplanmış ve incelenmemiştir; farmakolojik veya klinik benzerlik anlamına gelmez.",
    fingerprintMissing: "Karşılaştırma için en az iki kaynaklı canonical SMILES gerekir.",
    comparison: "Kaynaklı karşılaştırma matrisi",
    comparisonEmpty: "En az iki aday kimlikte karşılaştırılabilir kaynaklı alan bulunmuyor.",
    coverage: "Açık veri boşlukları",
    coverageComplete: "Bu karşılaştırma alanları için açık boşluk yok.",
    missing: "Kürate edilmedi",
    source: "Kaynak ve sınırlar",
    noHierarchy: "Bu aday seti için kaynaklı üyelik veya sınıflandırma yolu eklenmedi. Set üyeliği kurulmamıştır.",
    openDrug: "İlaç dosyası",
    learning: "Öğrenme yolu",
    noLearning: "Bu aday inceleme seti için öğrenme yolu henüz kürate edilmedi.",
    formula: "Moleküler formül",
    identitySource: "PubChem kimlik kaydı",
    structureSource: "PubChem 2B SDF kaynağı",
    atc: "Terapötik / ATC",
    pharmacological: "Farmakolojik mekanizma",
    scaffold: "Kimyasal / scaffold",
    tableDrug: "Aday kimlik",
  },
  en: {
    eyebrow: "Candidate Record Review",
    overview: "Review-set boundary",
    hierarchy: "Membership / classification status",
    sharedMechanism: "Shared-mechanism evidence status",
    primaryTargets: "Shared-target evidence status",
    sharedMotifs: "Shared structural-motif evidence status",
    candidateIdentities: "Candidate identities",
    compare2d: "2D comparison",
    explore3d: "Explore candidate structures in 3D",
    hide3d: "Close 3D view",
    spatialLoading: "Loading candidate 3D structures…",
    spatialScope: "Candidate-record 3D sample",
    spatialBoundary: "Selected candidate identities only; membership is not established in this set.",
    fingerprint: "Structural fingerprint comparison",
    fingerprintBoundary: "Computed and unreviewed; it does not imply pharmacological or clinical similarity.",
    fingerprintMissing: "At least two source-backed canonical SMILES are required for comparison.",
    comparison: "Source-backed comparison matrix",
    comparisonEmpty: "No source-backed field is comparable across at least two candidate identities.",
    coverage: "Explicit data gaps",
    coverageComplete: "No explicit gap remains in these comparison fields.",
    missing: "Not curated",
    source: "Sources and limitations",
    noHierarchy: "No source-backed membership or classification path has been added for this candidate set. Set membership is not established.",
    openDrug: "Drug dossier",
    learning: "Learning pathway",
    noLearning: "No learning pathway has been curated for this candidate review set yet.",
    formula: "Molecular formula",
    identitySource: "PubChem identity record",
    structureSource: "PubChem 2D SDF source",
    atc: "Therapeutic / ATC",
    pharmacological: "Pharmacological mechanism",
    scaffold: "Chemical / scaffold",
    tableDrug: "Candidate identity",
  },
} as const;

const comparisonLabels: Readonly<
  Record<FamilyComparisonFieldId, LocalizedFamilyText>
> = {
  selectivity: { tr: "Seçicilik", en: "Selectivity" },
  "action-type": { tr: "Etki türü", en: "Action type" },
  "primary-targets": { tr: "Birincil hedefler", en: "Primary targets" },
  lipophilicity: { tr: "Lipofilisite", en: "Lipophilicity" },
  "main-metabolic-pathway": { tr: "Ana metabolik yol", en: "Main metabolic pathway" },
  "active-metabolites": { tr: "Aktif metabolitler", en: "Active metabolites" },
  "half-life-range": { tr: "Yarı ömür aralığı", en: "Half-life range" },
  "common-route": { tr: "Yaygın uygulama yolu", en: "Common route" },
  "structural-motif": { tr: "Yapısal motif", en: "Structural motif" },
};

const verificationLabels = {
  verified: { tr: "Doğrulandı", en: "Verified" },
  "expert-reviewed": { tr: "Uzman incelemeli", en: "Expert reviewed" },
  "source-supported": { tr: "Kaynak destekli", en: "Source supported" },
} as const;

const localize = (value: LocalizedFamilyText, locale: Locale): string => value[locale];

function Sources({
  sources,
  limitations,
  label,
  locale,
}: {
  readonly sources: readonly FamilyEvidenceSource[];
  readonly limitations?: readonly LocalizedFamilyText[];
  readonly label: string;
  readonly locale: Locale;
}) {
  return (
    <details className={styles.sources}>
      <summary>{label}</summary>
      <ul>
        {sources.map((source) => (
          <li key={source.id}>
            <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
            <small>{verificationLabels[source.verification][locale]}</small>
          </li>
        ))}
        {limitations?.map((limitation, index) => (
          <li key={`limitation-${index}`} className={styles.limitation}>
            {localize(limitation, locale)}
          </li>
        ))}
      </ul>
    </details>
  );
}

function EvidenceText({
  field,
  locale,
  sourceLabel,
}: {
  readonly field: FamilyEvidenceField<LocalizedFamilyText>;
  readonly locale: Locale;
  readonly sourceLabel: string;
}) {
  if (field.availability === "missing") {
    return <p className={styles.missing}>{localize(field.reason, locale)}</p>;
  }
  return (
    <>
      <p>{localize(field.value, locale)}</p>
      <Sources
        sources={field.sources}
        limitations={field.limitations}
        label={sourceLabel}
        locale={locale}
      />
    </>
  );
}

function EvidenceList({
  field,
  locale,
  sourceLabel,
}: {
  readonly field: FamilyEvidenceField<readonly LocalizedFamilyText[]>;
  readonly locale: Locale;
  readonly sourceLabel: string;
}) {
  if (field.availability === "missing") {
    return <p className={styles.missing}>{localize(field.reason, locale)}</p>;
  }
  return (
    <>
      <ul className={styles.factList}>
        {field.value.map((value, index) => <li key={index}>{localize(value, locale)}</li>)}
      </ul>
      <Sources
        sources={field.sources}
        limitations={field.limitations}
        label={sourceLabel}
        locale={locale}
      />
    </>
  );
}

function systemLabel(
  system: DrugClassificationSystem,
  copy: typeof copyByLocale[Locale],
) {
  if (system === "therapeutic-atc") return copy.atc;
  if (system === "pharmacological-mechanism") return copy.pharmacological;
  return copy.scaffold;
}

function ComparisonTable({
  rows,
  family,
  locale,
}: {
  readonly rows: readonly FamilyComparisonRow[];
  readonly family: DrugFamilyPageModel;
  readonly locale: Locale;
}) {
  const copy = copyByLocale[locale];
  if (rows.length === 0) return <p className={styles.missing}>{copy.comparisonEmpty}</p>;
  return (
    <div
      className={styles.tableScroller}
      role="region"
      aria-label={copy.comparison}
    >
      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            <th scope="col">{copy.tableDrug}</th>
            {rows.map((row) => (
              <th key={row.field} scope="col">{localize(comparisonLabels[row.field], locale)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {family.representatives.map((drug) => (
            <tr key={drug.id}>
              <th scope="row">{drug.name}</th>
              {rows.map((row) => {
                const field = row.values.find((value) => value.drugId === drug.id)?.field;
                if (!field || field.availability === "missing") {
                  return <td key={row.field} data-availability="missing">{copy.missing}</td>;
                }
                return (
                  <td key={row.field} data-availability="available">
                    <span>{localize(field.value, locale)}</span>
                    <Sources
                      sources={field.sources}
                      limitations={field.limitations}
                      label={copy.source}
                      locale={locale}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface FamilyPageProps {
  readonly family: DrugFamilyPageModel;
  readonly locale?: Locale;
  readonly spatial?: AtlasSpatialConfiguration;
  readonly getDrugHref?: (slug: string) => string;
  readonly className?: string;
}

export function FamilyPage({
  family,
  locale = "en",
  spatial,
  getDrugHref = (slug) => `#drug/${encodeURIComponent(slug)}`,
  className,
}: FamilyPageProps) {
  const copy = copyByLocale[locale];
  const [showSpatial, setShowSpatial] = useState(false);
  const fingerprint = useMemo(
    () => buildFamilyFingerprintComparison(family.representatives),
    [family.representatives],
  );
  const comparisonRows = useMemo(
    () => buildFamilyComparisonRows(family.representatives),
    [family.representatives],
  );
  const coverageGaps = useMemo(
    () => getFamilyCoverageGaps(family.representatives),
    [family.representatives],
  );
  const drugById = new Map(family.representatives.map((drug) => [drug.id, drug]));

  return (
    <article
      className={[styles.family, className].filter(Boolean).join(" ")}
      data-family-page={family.slug}
    >
      <header className={styles.hero}>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <h1>{localize(family.name, locale)}</h1>
        <div className={styles.overview}>
          <h2>{copy.overview}</h2>
          <EvidenceText field={family.overview} locale={locale} sourceLabel={copy.source} />
        </div>
      </header>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>01</span>
          <h2>{copy.hierarchy}</h2>
        </header>
        {family.classifications.length === 0 ? (
          <p className={styles.missing}>{copy.noHierarchy}</p>
        ) : (
          <div className={styles.hierarchyGrid}>
            {family.classifications.map((track, trackIndex) => (
              <article key={`${track.system}-${trackIndex}`}>
                <h3>{systemLabel(track.system, copy)}</h3>
                {track.paths.map((path, pathIndex) => (
                  <ol key={pathIndex} className={styles.hierarchyPath}>
                    {path.map((node, nodeIndex) => (
                      <li key={`${node.code ?? "node"}-${nodeIndex}`}>
                        {node.code ? <small>{node.code}</small> : null}
                        <span>{localize(node.label, locale)}</span>
                      </li>
                    ))}
                  </ol>
                ))}
                <Sources sources={track.sources} label={copy.source} locale={locale} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>02</span>
          <h2>{copy.sharedMechanism}</h2>
        </header>
        <div className={styles.factGrid}>
          <article>
            <h3>{copy.sharedMechanism}</h3>
            <EvidenceList field={family.sharedMechanism} locale={locale} sourceLabel={copy.source} />
          </article>
          <article>
            <h3>{copy.primaryTargets}</h3>
            <EvidenceList field={family.primaryTargetFamilies} locale={locale} sourceLabel={copy.source} />
          </article>
          <article>
            <h3>{copy.sharedMotifs}</h3>
            <EvidenceList field={family.sharedStructuralMotifs} locale={locale} sourceLabel={copy.source} />
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>03</span>
          <h2>{copy.candidateIdentities}</h2>
          {spatial ? (
            <button type="button" onClick={() => setShowSpatial((value) => !value)} aria-expanded={showSpatial}>
              {showSpatial ? copy.hide3d : copy.explore3d}
            </button>
          ) : null}
        </header>
        {showSpatial && spatial ? (
          <Suspense fallback={<p className={styles.loading} role="status">{copy.spatialLoading}</p>}>
            <LazyAtlasSpatialView
              configuration={spatial}
              copy={{ scope: copy.spatialScope, bounded: copy.spatialBoundary }}
            />
          </Suspense>
        ) : (
          <div className={styles.representativeGrid}>
            {family.representatives.map((drug) => (
              <article key={drug.id}>
                <div className={styles.structureCard}>
                  {drug.twoDStructureUrl ? (
                    <MoleculeStructurePreview
                      structureUrl={drug.twoDStructureUrl}
                      moleculeName={drug.name}
                      expectedPubChemCid={drug.pubChemCid}
                    />
                  ) : (
                    <span>{drug.formula}</span>
                  )}
                </div>
                <h3>{drug.name}</h3>
                <p>{copy.formula} · {drug.formula}</p>
                <div className={styles.recordSources}>
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${drug.pubChemCid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.identitySource} · CID {drug.pubChemCid}<span aria-hidden="true">↗</span>
                  </a>
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${drug.pubChemCid}/record/SDF?record_type=2d`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.structureSource}<span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className={styles.memberships}>
                  {drug.memberships.flatMap((membership) =>
                    membership.labels.map((label, index) => (
                      <small key={`${membership.system}-${index}`}>
                        {localize(label, locale)}
                      </small>
                    )),
                  )}
                </div>
                <a className={styles.drugLink} href={getDrugHref(drug.slug)}>{copy.openDrug}<span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>04</span>
          <h2>{copy.fingerprint}</h2>
        </header>
        {fingerprint ? (
          <>
            <p className={styles.boundary}>{copy.fingerprintBoundary}</p>
            <div
              className={styles.tableScroller}
              role="region"
              aria-label={copy.fingerprint}
            >
              <table className={styles.fingerprintTable}>
                <thead>
                  <tr>
                    <th scope="col">{copy.tableDrug}</th>
                    {fingerprint.moleculeIds.map((id) => <th key={id} scope="col">{drugById.get(id)?.name ?? id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fingerprint.moleculeIds.map((leftId) => (
                    <tr key={leftId}>
                      <th scope="row">{drugById.get(leftId)?.name ?? leftId}</th>
                      {fingerprint.moleculeIds.map((rightId) => (
                        <td key={rightId}>{Math.round((fingerprint.similarities[leftId]?.[rightId] ?? 0) * 100)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.missing}>{copy.fingerprintMissing}</p>
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>05</span>
          <h2>{copy.comparison}</h2>
        </header>
        <ComparisonTable rows={comparisonRows} family={family} locale={locale} />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>06</span>
          <h2>{copy.coverage}</h2>
        </header>
        <div className={styles.gapGrid}>
          {coverageGaps.map((gap) => (
            <article key={gap.drugId}>
              <h3>{drugById.get(gap.drugId)?.name ?? gap.drugId}</h3>
              {gap.missingFields.length > 0 ? (
                <ul>
                  {gap.missingFields.map((field) => (
                    <li key={field}>{localize(comparisonLabels[field], locale)} · {copy.missing}</li>
                  ))}
                </ul>
              ) : <p>{copy.coverageComplete}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeading}>
          <span>07</span>
          <h2>{copy.learning}</h2>
        </header>
        {family.learningPath.length > 0 ? (
          <ol className={styles.learningPath}>
            {family.learningPath.map((link) => (
              <li key={link.id}><a href={link.href}>{localize(link.label, locale)}<span aria-hidden="true">↗</span></a></li>
            ))}
          </ol>
        ) : <p className={styles.missing}>{copy.noLearning}</p>}
      </section>
    </article>
  );
}

export default FamilyPage;
