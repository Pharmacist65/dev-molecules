"use client";

import { MoleculeStructurePreview, MoleculeViewer } from "@/components/molecule-viewer";
import { SmilesNotationPanel } from "@/components/chemistry/SmilesNotationPanel";
import type { BasicMolecularRecord as BasicMolecularRecordModel } from "@/lib/application/basic-molecular-record";
import { getDrugHash } from "@/lib/application/platform-route";
import type { Locale } from "@/lib/i18n";

import styles from "./BasicMolecularRecord.module.css";

const copyByLocale = {
  tr: {
    back: "İlaç Atlası'na dön",
    eyebrow: "Temel Moleküler Kayıt",
    identityScope: "Kaynak eşleşmeli kimlik ve yapı kaydı",
    depthTitle: "Temel kayıt",
    depthBody: "Bu kayıt için derin farmasötik içerik henüz eklenmedi.",
    sourceBoundary: "Kimlik, yapı ve temel özellikler kaynak kayıtlarıyla desteklenir; bağımsız bilimsel doğrulama değildir.",
    structures: "2B ve 3B yapı",
    structuresDescription: "Kaynak 2B kaydı ile PubChem tarafından hesaplanan 3B konformer ayrı kökenleriyle gösterilir.",
    sourceStructures: "Kaynak yapılar",
    true2d: "Kaynak 2B yapı",
    computed3d: "Hesaplanmış 3B konformer",
    open2dSource: "2B kaynak kaydını aç",
    aliases: "Eş anlamlı adlar",
    twoDSourceLabel: "PubChem 2B SDF kaydı",
    threeDSourceLabel: "PubChem hesaplanmış 3B konformeri",
    identity: "Moleküler kimlik",
    formula: "Molekül formülü",
    cid: "PubChem CID",
    canonicalSmiles: "Canonical SMILES",
    isomericSmiles: "Isomeric SMILES",
    smilesNotation: "SMILES yapı gösterimi",
    inchiKey: "InChIKey",
    properties: "Temel fizikokimyasal özellikler",
    propertiesDescription: "Değerler, bu CID ile eşleşen PubChem kaynak kaydındaki açık alanlardan alınır; bağımsız doğrulama değildir.",
    pubChem2dPropertySource: "PubChem 2B kaynak kaydı",
    pubChemPropertySource: "PubChem özellik kaydı",
    propertyLabels: {
      "molecular-weight": "Molekül ağırlığı",
      complexity: "Yapısal karmaşıklık",
      "hydrogen-bond-acceptors": "Hidrojen bağı alıcıları",
      "hydrogen-bond-donors": "Hidrojen bağı vericileri",
      "rotatable-bonds": "Dönebilir bağlar",
      xlogp: "XLogP",
      "exact-mass": "Kesin kütle",
      "topological-polar-surface-area": "Topolojik polar yüzey alanı",
      "monoisotopic-mass": "Monoisotopik kütle",
      "total-charge": "Toplam yük",
      "heavy-atom-count": "Ağır atom sayısı",
    },
    coverage: "İçerik kapsamı",
    coverageDescription: "“Var” yalnız içerik bulunduğunu gösterir; bilimsel inceleme derecesi değildir ve eksik alanlardan sonuç çıkarmaz.",
    available: "Var",
    partial: "Kısmi",
    unavailable: "Henüz eklenmedi",
    dimensions: {
      identity: "Kimlik",
      structure: "Yapı",
      classification: "Sınıflandırma",
      pharmacology: "Farmakoloji",
      adme: "ADME",
      metabolites: "Metabolitler",
      synthesis: "Sentez",
      nomenclature: "Nomenklatür",
      learning: "Öğrenme içeriği",
    },
    neighbors: "Yakın yapı örnekleri",
    neighborsDescription: "Yalnız cihazda hazır bulunan sınırlı kayıt penceresinden yapısal keşif için seçilir.",
    neighborBoundary: "Yalnız yapısal bir öğrenme ipucudur; biyolojik veya klinik benzerlik göstermez.",
    structuralHint: "Yapısal keşif",
    similarity: "yapı yakınlığı",
    sources: "Kaynaklar ve veri kökeni",
    sourceLabels: {
      identity: "PubChem kimlik kaydı",
      "2d-structure": "PubChem 2B SDF kaydı",
      "3d-conformer": "PubChem hesaplanmış 3B konformeri",
      "source-listing": "DrugCentral kaynak listesi kaydı",
    },
    snapshot: "Katalog anlık görüntüsü",
    capturedAt: "Yakalama zamanı",
  },
  en: {
    back: "Back to Drug Atlas",
    eyebrow: "Basic Molecular Record",
    identityScope: "Source-matched identity and structure record",
    depthTitle: "Basic record",
    depthBody: "Deep pharmaceutical content has not yet been added for this record.",
    sourceBoundary: "Identity, structure, and basic properties are supported by source records; this is not independent scientific verification.",
    structures: "2D and 3D structures",
    structuresDescription: "The source 2D record and PubChem-computed 3D conformer are presented with separate origins.",
    sourceStructures: "Source structures",
    true2d: "Source 2D structure",
    computed3d: "Computed 3D conformer",
    open2dSource: "Open the 2D source record",
    aliases: "Aliases",
    twoDSourceLabel: "PubChem 2D SDF record",
    threeDSourceLabel: "PubChem computed 3D conformer",
    identity: "Molecular identity",
    formula: "Molecular formula",
    cid: "PubChem CID",
    canonicalSmiles: "Canonical SMILES",
    isomericSmiles: "Isomeric SMILES",
    smilesNotation: "SMILES structure notation",
    inchiKey: "InChIKey",
    properties: "Basic physicochemical properties",
    propertiesDescription: "Values are copied from explicit fields in the PubChem source record matched to this CID; they are not independently verified.",
    pubChem2dPropertySource: "PubChem 2D source record",
    pubChemPropertySource: "PubChem property record",
    propertyLabels: {
      "molecular-weight": "Molecular weight",
      complexity: "Structural complexity",
      "hydrogen-bond-acceptors": "Hydrogen-bond acceptors",
      "hydrogen-bond-donors": "Hydrogen-bond donors",
      "rotatable-bonds": "Rotatable bonds",
      xlogp: "XLogP",
      "exact-mass": "Exact mass",
      "topological-polar-surface-area": "Topological polar surface area",
      "monoisotopic-mass": "Monoisotopic mass",
      "total-charge": "Total charge",
      "heavy-atom-count": "Heavy atom count",
    },
    coverage: "Content coverage",
    coverageDescription: "“Available” reports content presence only; it is not a scientific review grade, and missing fields imply no conclusion.",
    available: "Available",
    partial: "Partial",
    unavailable: "Not yet added",
    dimensions: {
      identity: "Identity",
      structure: "Structure",
      classification: "Classification",
      pharmacology: "Pharmacology",
      adme: "ADME",
      metabolites: "Metabolites",
      synthesis: "Synthesis",
      nomenclature: "Nomenclature",
      learning: "Learning content",
    },
    neighbors: "Nearby structure examples",
    neighborsDescription: "Selected only from the bounded records already available on this device for structural exploration.",
    neighborBoundary: "This is only a structural learning hint; it does not establish biological or clinical similarity.",
    structuralHint: "Structural exploration",
    similarity: "structure proximity",
    sources: "Sources and provenance",
    sourceLabels: {
      identity: "PubChem identity record",
      "2d-structure": "PubChem 2D SDF record",
      "3d-conformer": "PubChem computed 3D conformer",
      "source-listing": "DrugCentral source-list record",
    },
    snapshot: "Catalog snapshot",
    capturedAt: "Captured",
  },
} as const;

export interface BasicMolecularRecordProps {
  readonly record: BasicMolecularRecordModel;
  readonly locale: Locale;
  readonly onBackToAtlas: () => void;
}

const formatNumber = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 3,
  }).format(value);

const formatDate = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  }).format(date);
};

export function BasicMolecularRecord({
  record,
  locale,
  onBackToAtlas,
}: BasicMolecularRecordProps) {
  const copy = copyByLocale[locale];
  const twoD = record.structures.find((structure) => structure.dimension === "2d")!;
  const threeD = record.structures.find((structure) => structure.dimension === "3d")!;

  return (
    <article
      className={styles.record}
      data-basic-molecular-record="true"
      data-record-id={record.id}
      data-record-stable-slug={record.stableSlug}
      data-pubchem-cid={record.identity.pubChemCid}
    >
      <button className={styles.back} type="button" onClick={onBackToAtlas}>
        <span aria-hidden="true">←</span>{copy.back}
      </button>

      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{record.preferredName}</h1>
          <p className={styles.formula}>
            {record.identity.molecularFormula} · CID {record.identity.pubChemCid}
          </p>
          {record.aliases.length > 0 ? (
            <ul className={styles.aliases} aria-label={copy.aliases}>
              {record.aliases.map((alias) => <li key={alias}>{alias}</li>)}
            </ul>
          ) : null}
        </div>
        <aside className={styles.summaryCard}>
          <span className={styles.sectionEyebrow}>{copy.identityScope}</span>
          <strong>{copy.depthTitle}</strong>
          <p>{copy.depthBody}</p>
          <p
            className={styles.reviewBoundary}
            data-basic-record-review-status="source-supported"
          >
            {copy.sourceBoundary}
          </p>
        </aside>
      </header>

      <div className={styles.body}>
        <section aria-labelledby="basic-record-structures">
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>{copy.sourceStructures}</span>
              <h2 id="basic-record-structures">{copy.structures}</h2>
            </div>
            <p>{copy.structuresDescription}</p>
          </header>
          <div className={styles.structureGrid}>
            <section
              className={styles.structureCard}
              data-basic-record-structure="2d"
              data-structure-review-status={twoD.reviewStatus}
            >
              <header><strong>{copy.true2d}</strong><span>2D</span></header>
              <MoleculeStructurePreview
                className={styles.twoDPreview}
                structureUrl={twoD.publicPath}
                moleculeName={record.preferredName}
                expectedPubChemCid={record.identity.pubChemCid}
              />
              <a className={styles.structureSource} href={twoD.sourceUrl} target="_blank" rel="noreferrer">
                {copy.open2dSource} ↗
              </a>
            </section>
            <section
              className={styles.structureCard}
              data-basic-record-structure="3d"
              data-structure-review-status={threeD.reviewStatus}
            >
              <header><strong>{copy.computed3d}</strong><span>3D</span></header>
              <MoleculeViewer
                className={styles.viewer}
                structureUrl={threeD.publicPath}
                twoDStructureUrl={twoD.publicPath}
                moleculeName={record.preferredName}
                expectedPubChemCid={record.identity.pubChemCid}
                sourceLabel={copy.threeDSourceLabel}
                originLabel="computed-3d-conformer"
                sourceHref={threeD.sourceUrl}
                twoDSourceLabel={copy.twoDSourceLabel}
                twoDOriginLabel="database-2d-record"
                twoDSourceHref={twoD.sourceUrl}
                showHydrogensInitially={false}
              />
            </section>
          </div>
        </section>

        <section
          aria-labelledby="basic-record-identity"
          data-basic-record-identity-review-status={record.identity.reviewStatus}
        >
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>{copy.eyebrow}</span>
              <h2 id="basic-record-identity">{copy.identity}</h2>
            </div>
          </header>
          <dl className={styles.detailGrid}>
            <div><dt>{copy.formula}</dt><dd>{record.identity.molecularFormula}</dd></div>
            <div><dt>{copy.cid}</dt><dd>{record.identity.pubChemCid}</dd></div>
            <div><dt>{copy.inchiKey}</dt><dd><code>{record.identity.inchiKey}</code></dd></div>
            <div className={styles.smilesIdentity} data-basic-record-smiles="student">
              <dt>{copy.smilesNotation}</dt>
              <dd>
                <SmilesNotationPanel
                  canonicalSmiles={record.identity.canonicalSmiles}
                  isomericSmiles={record.identity.isomericSmiles}
                  locale={locale}
                  mode="student"
                />
              </dd>
            </div>
          </dl>
        </section>

        {record.properties.length > 0 ? (
          <section aria-labelledby="basic-record-properties" data-basic-record-properties="true">
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>{record.properties.length}</span>
                <h2 id="basic-record-properties">{copy.properties}</h2>
              </div>
              <p>{copy.propertiesDescription}</p>
            </header>
            <dl className={styles.propertyGrid}>
              {record.properties.map((property) => (
                <div
                  key={property.id}
                  data-basic-record-property={property.id}
                  data-property-provenance={property.provenance}
                  data-property-review-status={property.reviewStatus}
                  {...(property.provenance === "pubchem-2d-sdf"
                    ? { "data-property-source-field": property.sourceField }
                    : {})}
                >
                  <dt>{copy.propertyLabels[property.id]}</dt>
                  <dd>
                    <strong>
                      {formatNumber(property.value, locale)}{property.unit ? ` ${property.unit}` : ""}
                    </strong>
                    <a href={property.sourceUrl} target="_blank" rel="noreferrer">
                      {property.provenance === "pubchem-2d-sdf"
                        ? copy.pubChem2dPropertySource
                        : copy.pubChemPropertySource} · CID {property.pubChemCid} ↗
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section aria-labelledby="basic-record-coverage" data-basic-record-coverage="true">
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>9</span>
              <h2 id="basic-record-coverage">{copy.coverage}</h2>
            </div>
            <p>{copy.coverageDescription}</p>
          </header>
          <ul className={styles.coverageList}>
            {record.coverage.map((item) => (
              <li
                key={item.dimension}
                data-coverage-dimension={item.dimension}
                data-coverage-status={item.status}
              >
                <strong>{copy.dimensions[item.dimension]}</strong>
                <span data-status={item.status}>{copy[item.status]}</span>
              </li>
            ))}
          </ul>
          <p className={styles.depthNotice}>{copy.depthBody}</p>
        </section>

        {record.structuralNeighbors.length > 0 ? (
          <section aria-labelledby="basic-record-neighbors" data-basic-record-neighbors="resident-window">
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>{copy.structuralHint}</span>
                <h2 id="basic-record-neighbors">{copy.neighbors}</h2>
              </div>
              <p>{copy.neighborsDescription}</p>
            </header>
            <ul className={styles.neighborList}>
              {record.structuralNeighbors.map((neighbor) => (
                <li key={neighbor.id}>
                  <a href={getDrugHash(neighbor.stableSlug)}>
                    <strong>{neighbor.preferredName}</strong>
                    <span>{neighbor.molecularFormula} · CID {neighbor.pubChemCid}</span>
                    <small>{copy.similarity}: {formatNumber(neighbor.score, locale)}</small>
                  </a>
                </li>
              ))}
            </ul>
            <p className={styles.neighborBoundary}>{copy.neighborBoundary}</p>
          </section>
        ) : null}

        <details className={styles.sources} data-basic-record-sources="closed-by-default">
          <summary>{copy.sources}</summary>
          <ul>
            {record.sources.map((source) => (
              <li key={source.id}>
                <a href={source.href} target="_blank" rel="noreferrer">
                  {copy.sourceLabels[source.role]}
                  {source.role === "identity" ? ` · CID ${record.identity.pubChemCid}` : ""} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className={styles.snapshot}>
            {copy.snapshot}: {record.provenance.snapshotId}<br />
            {copy.capturedAt}: {formatDate(record.provenance.capturedAt, locale)}
          </p>
        </details>
      </div>
    </article>
  );
}

export default BasicMolecularRecord;
