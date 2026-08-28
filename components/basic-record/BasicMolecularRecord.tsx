"use client";

import { MoleculeStructurePreview, MoleculeViewer } from "@/components/molecule-viewer";
import { SmilesNotationPanel } from "@/components/chemistry/SmilesNotationPanel";
import { EmbeddedSynthesisLearningStudio } from "@/components/synthesis/EmbeddedSynthesisLearningStudio";
import type { BasicMolecularRecord as BasicMolecularRecordModel } from "@/lib/application/basic-molecular-record";
import { getBasicRecordSynthesisSurfaceState } from "@/lib/application/basic-record-synthesis-coverage";
import { getDrugHash, getSynthesisAcademyHash } from "@/lib/application/platform-route";
import type { SynthesisCatalogNavigator } from "@/lib/application/synthesis-catalog";
import type { Locale } from "@/lib/i18n";

import styles from "./BasicMolecularRecord.module.css";

const copyByLocale = {
  tr: {
    back: "İlaç Atlası'na dön",
    eyebrow: "Temel Moleküler Kayıt",
    identityScope: "Kaynak eşleşmeli kimlik ve yapı kaydı",
    synthesisLearningEyebrow: "SENTEZ VE 3B ÖĞRENME",
    synthesisLearningTitle: "Yapıdan sentez kanıtına geç",
    synthesisLearningBody: "Bu molekülün 3B yapısını, sentez kapsamını, kaynak destekli basamaklarını ve açık bilimsel boşluklarını tek öğrenme alanında incele.",
    synthesisLearningAction: "Sentez aşamalarını incele",
    depthTitle: "Temel kayıt",
    depthBody: "Bu kayıt için derin farmasötik içerik henüz eklenmedi.",
    depthBodyWithSynthesis: "Bu temel kayıtta sentez kanıtı araştırma kapsamı bulunur; diğer derin farmasötik katmanlar henüz eklenmedi.",
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
    synthesisCoverageEyebrow: "SENTEZ KAPSAM KAYDI",
    synthesisCoverageTitle: "Sentez kanıtı araştırması",
    synthesisCoverageDescription: "Bu alan otomatik kaynak keşfinin kapsamını ve bilimsel statüsünü gösterir. Aday kaynak, eğitsel rekonstrüksiyon veya hesaplamalı öneri doğrulanmış bir sentez rotası değildir.",
    synthesisCoverageUnavailableTitle: "Sentez kapsam verisi kullanılamıyor",
    synthesisCoverageUnavailableSummary: "Sentez kapsam artefaktı güvenli biçimde yüklenemedi. Bu durum kaynak bulunmadığının, rota bulunmadığının veya molekülün sentezlenebilir ya da sentezlenemez olduğunun kanıtı değildir.",
    reportedResolved: "Raporlanmış sentez kaynağı çözümlendi",
    reportedNotResolved: "Raporlanmış sentez: Çözümlenmedi",
    reportedPending: "Doğrudan kaynak mevcut; rota bilimsel inceleme bekliyor ve doğrulanmış olarak sunulmuyor.",
    reportedCompleteSummary: "{name} için {count} tam raporlanmış rota referansı çözümlendi.",
    reportedPartialSummary: "{name} için {count} kısmi raporlanmış rota referansı çözümlendi; kaynak boşlukları açık kalır.",
    reportedGatedSummary: "{name} için doğrudan kaynak çözümlendi; rota ayrıntıları inceleme ve yeniden kullanım kapısı tamamlanana kadar kapalıdır.",
    teachingSummary: "{name} için kaynak segmentli bir eğitsel rekonstrüksiyon bulunur; tek bir eksiksiz raporlanmış rota değildir.",
    candidateCompleteTitle: "Aday kaynaklar değerlendirildi",
    candidateCompleteSummary: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi. {name} için {count} aday eşleşmesi sonuçlandırıldı.",
    candidatePendingTitle: "Aday kaynaklar bulundu",
    candidatePendingSummary: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi.",
    accessBlockedTitle: "Kaynak erişimi engellendi",
    accessBlockedSummary: "{count} aday belge erişim sınırı nedeniyle incelenemedi; sonuç rota yokluğu iddiası değildir.",
    scopedNoSupportTitle: "Kaydedilen araştırma kapsamında destekleyici kaynak çözümlenmedi",
    scopedNoSupportSummary: "{providers} sağlayıcıda {queries} sorgu kaydedildi. Bu sonuç yenilik, patentlenebilirlik veya sentezlenebilirlik anlamına gelmez.",
    evidenceProcessing: "Aday kanıt işleme özeti",
    terminalAssociations: "Sonuçlandırılan aday",
    accessBlocked: "Erişimi engellenen",
    metadataOnly: "Yalnız üstveri",
    accessible: "Erişilebilir",
    unavailableSources: "Kullanılamayan",
    openSynthesisAtlas: "Sentez Atlası kapsam kaydını aç",
    atlasGateBoundary: "Atlas tüm katalog kimliklerinde kapsam durumunu açar; kaynak destekli public-alpha taslaklar pending etiketiyle, incelenmiş rotalardan ayrı gösterilir.",
    publicDraftTitle: "Kaynak destekli sentez taslağı",
    publicDraftSummary: "{name} için {count} exact-target kaynak segmenti, uzman incelemesi bekleyen ve üst-akış boşluğu açık bir eğitim grafiğine dönüştürüldü.",
    publicDraftBoundary: "Bu public-alpha içerik reviewed veya verified değildir; reaksiyon sınıfı, bağ değişimleri ve laboratuvar uygulanabilirliği çözümlenmemiştir.",
    viewPartialRoute: "Kısmi rotayı görüntüle",
    assessment: "Değerlendirme",
    sourceEvidence: "Kaynak kanıtı",
    applicability: "Uygulanabilirlik",
    review: "İnceleme",
    license: "Lisans / yeniden kullanım",
    searchDate: "Son araştırma",
    identityScopeDetail: "Araştırılan kimlik kapsamı",
    chemicalForm: "Kimyasal form",
    stereochemistry: "Stereokimya",
    specified: "Belirtilmiş",
    notSpecified: "Belirtilmemiş",
    queriedAliases: "Sorgulanan adlar",
    pipeline: "Araştırma yöntemi sürümü",
    searchScope: "Kaynak araştırma kapsamı",
    searchScopeBoundary: "Sonuç yalnız aşağıda kaydedilen sağlayıcılar, sorgular ve tarihle sınırlıdır; tüm internetin tüketildiği anlamına gelmez.",
    query: "sorgu",
    queries: "sorgu",
    candidate: "aday",
    candidates: "aday",
    routes: "Rota referansları",
    noRouteReference: "Bu kimlik için yayımlanabilir rota referansı veya karşılaştırması yok.",
    routeId: "Rota kimliği",
    routeType: "Rota türü",
    completeness: "Tamlık",
    routeBoundaryReported: "Kaynak doğrudan çözümlenmiş olsa bile bu rota, inceleme statüsü doğrulanmış olana kadar doğrulanmış sayılmaz.",
    routeBoundaryTeaching: "Kaynaklandırılmış bölümlerden kurulan eğitsel rekonstrüksiyondur; tek ve eksiksiz raporlanmış rota değildir.",
    routeBoundaryComputational: "Hesaplamalı olarak önerilmiştir; raporlanmış veya doğrulanmış rota değildir.",
    routeComparisonTitle: "Çoklu rota karşılaştırması",
    routeComparisonDescription: "Yalnız bu molekül kimliğinin kanıt kaydında referans verilen ve yayımlanabilir özet koşullarını karşılayan rotalar karşılaştırılır.",
    routeComparisonWithheld: "Rota özetleri bilimsel inceleme ve lisans / yeniden kullanım kapıları nedeniyle karşılaştırmaya kapalıdır. Kapalı hücrelerden bilimsel sonuç çıkarılmaz.",
    routeComparisonUnavailable: "Rota karşılaştırma indeksi kullanılamıyor. Coverage statüsü korunur; eksik karşılaştırma alanları rota kanıtı sayılmaz.",
    routeComparisonPartial: "Yalnız yayımlanabilir özet kapısını geçen rotaların karşılaştırma alanları açıktır; diğer hücreler kapalı kalır.",
    comparisonUnavailableCell: "Yayıma kapalı",
    numberOfSteps: "Basamak sayısı",
    startingMaterials: "Başlangıç maddeleri",
    stereochemicalStrategy: "Stereokimyasal strateji",
    keyTransformations: "Ana dönüşümler",
    sourceAndYear: "Kaynak sınıfı / yıl",
    publicationState: "Yayın durumu",
    candidateBoundary: "Aday kaynaklar yalnız keşif ipucudur; kesin kaynak ve konum çözümlenmeden bir sentez rotasını desteklemez.",
    noSourceBoundary: "Kaydedilen araştırma kapsamında doğrudan veya aday kaynak bulunmadı. Bu sonuç yenilik, patentlenebilirlik ya da sentezlenebilirlik iddiası değildir.",
    assessmentStates: {
      not_assessed: "Değerlendirilmedi",
      searching: "Araştırma sürüyor",
      assessed: "Araştırıldı",
    },
    sourceEvidenceStates: {
      none_found: "Kayıtlı kapsamda kaynak bulunamadı",
      candidate_sources: "Yalnız aday kaynaklar",
      direct_source_resolved: "Doğrudan kaynak çözümlendi",
    },
    applicabilityStates: {
      applicable: "Uygulanabilir",
      not_applicable: "Uygulanamaz",
      unclear: "Belirsiz",
    },
    reviewStates: {
      pending: "İnceleme bekliyor",
      reviewed: "İncelendi",
      verified: "Doğrulandı",
      withdrawn: "Geri çekildi",
    },
    licenseStates: {
      permitted: "Kullanıma izinli",
      attribution_required: "Atıf gerekli",
      link_only: "Yalnız bağlantı",
      restricted: "Kısıtlı",
      mixed: "Karma",
      unknown: "Belirsiz",
    },
    routeTypes: {
      patent_reported: "Patentte raporlanmış",
      literature_reported: "Literatürde raporlanmış",
      teaching_reconstruction: "Eğitsel rekonstrüksiyon",
      computational_proposed: "Hesaplamalı öneri",
    },
    routeCompleteness: {
      complete: "Tam",
      partial: "Kısmi",
      upstream_gap: "Başlangıç öncesi boşluk",
      convergent_partial: "Konvergent kısmi",
      unknown: "Tamlık çözümlenmedi",
    },
    providerStatuses: {
      completed: "Tamamlandı",
      completed_with_errors: "Hatalarla tamamlandı",
      rate_limited: "Hız sınırına takıldı",
      unavailable: "Kullanılamadı",
    },
    formKinds: {
      free_parent: "Serbest ana yapı",
      salt: "Tuz",
      hydrate: "Hidrat",
      solvate: "Solvat",
      other: "Diğer",
      unresolved: "Çözümlenmedi",
    },
    publicationStates: {
      reported_route: "Raporlanmış rota özeti",
      teaching_reconstruction: "Eğitsel rekonstrüksiyon özeti",
      computationally_proposed_route: "Hesaplamalı öneri özeti",
      withheld: "Yayıma kapalı",
      unavailable: "Kullanılamıyor",
    },
    routeSourceClasses: {
      patent_reported: "Patent",
      literature_reported: "Literatür",
      teaching_reconstruction: "Birleşik kaynaklar",
      computational_proposed: "Hesaplamalı öneri",
    },
  },
  en: {
    back: "Back to Drug Atlas",
    eyebrow: "Basic Molecular Record",
    identityScope: "Source-matched identity and structure record",
    synthesisLearningEyebrow: "3D & SYNTHESIS LEARNING",
    synthesisLearningTitle: "Move from structure to synthesis evidence",
    synthesisLearningBody: "Explore this molecule's 3D structure, synthesis coverage, steps linked to their sources, and explicit scientific gaps in one learning workspace.",
    synthesisLearningAction: "Explore synthesis",
    depthTitle: "Basic record",
    depthBody: "Deep pharmaceutical content has not yet been added for this record.",
    depthBodyWithSynthesis: "Synthesis evidence-discovery coverage is present in this basic record; other deep pharmaceutical layers have not yet been added.",
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
    synthesisCoverageEyebrow: "SYNTHESIS COVERAGE RECORD",
    synthesisCoverageTitle: "Synthesis evidence discovery",
    synthesisCoverageDescription: "This section reports the scope and scientific status of automated source discovery. A candidate source, teaching reconstruction, or computational proposal is not a verified synthesis route.",
    synthesisCoverageUnavailableTitle: "Synthesis coverage data unavailable",
    synthesisCoverageUnavailableSummary: "The synthesis coverage artifact could not be loaded safely. This is not evidence that no source or route exists, and it does not establish whether the molecule is synthesizable or unsynthesizable.",
    reportedResolved: "Reported synthesis source resolved",
    reportedNotResolved: "Reported synthesis: Not resolved",
    reportedPending: "A direct source is present; the route remains under scientific review and is not presented as verified.",
    reportedCompleteSummary: "{count} complete reported-route references are resolved for {name}.",
    reportedPartialSummary: "{count} partial reported-route references are resolved for {name}; source gaps remain explicit.",
    reportedGatedSummary: "A direct source is resolved for {name}; route details remain closed until review and reuse gates pass.",
    teachingSummary: "A source-segmented teaching reconstruction exists for {name}; it is not one completely reported route.",
    candidateCompleteTitle: "Candidate-source assessment complete",
    candidateCompleteSummary: "Sources identified; route extraction not yet resolved. {count} candidate associations for {name} were terminally assessed.",
    candidatePendingTitle: "Candidate sources found",
    candidatePendingSummary: "Sources identified; route extraction not yet resolved.",
    accessBlockedTitle: "Source access blocked",
    accessBlockedSummary: "{count} candidate documents could not be inspected because of access boundaries; this is not a no-route claim.",
    scopedNoSupportTitle: "No supporting source resolved in the recorded search scope",
    scopedNoSupportSummary: "{queries} queries were recorded across {providers} providers. This does not establish novelty, patentability, or synthesizability.",
    evidenceProcessing: "Candidate-source assessment summary",
    terminalAssociations: "Completed assessments",
    accessBlocked: "Access blocked",
    metadataOnly: "Metadata only",
    accessible: "Accessible",
    unavailableSources: "Unavailable",
    openSynthesisAtlas: "Open this Synthesis Atlas coverage record",
    atlasGateBoundary: "The Atlas opens coverage for every catalog identity; source-supported public-alpha drafts remain pending and separate from reviewed routes.",
    publicDraftTitle: "Source-supported synthesis draft",
    publicDraftSummary: "{count} exact-target source segments for {name} were projected into a teaching graph with explicit upstream gaps and expert review still pending.",
    publicDraftBoundary: "This public-alpha content is neither reviewed nor verified; reaction class, bond changes, and laboratory applicability remain unresolved.",
    viewPartialRoute: "View partial route",
    assessment: "Assessment",
    sourceEvidence: "Source evidence",
    applicability: "Applicability",
    review: "Review",
    license: "License / reuse",
    searchDate: "Last searched",
    identityScopeDetail: "Queried identity scope",
    chemicalForm: "Chemical form",
    stereochemistry: "Stereochemistry",
    specified: "Specified",
    notSpecified: "Not specified",
    queriedAliases: "Names queried",
    pipeline: "Assessment method version",
    searchScope: "Source-search scope",
    searchScopeBoundary: "The result is bounded by the recorded providers, queries, and date below; it is not an exhaustive search of the internet.",
    query: "query",
    queries: "queries",
    candidate: "candidate",
    candidates: "candidates",
    routes: "Route references",
    noRouteReference: "No publishable route reference or comparison is available for this identity.",
    routeId: "Route ID",
    routeType: "Route type",
    completeness: "Completeness",
    routeBoundaryReported: "Even with a directly resolved source, this route is not verified until its review state explicitly says verified.",
    routeBoundaryTeaching: "This is a teaching reconstruction assembled from sourced segments; it is not reported as one complete route.",
    routeBoundaryComputational: "This is computationally proposed; it is not a reported or verified route.",
    routeComparisonTitle: "Multi-route comparison",
    routeComparisonDescription: "Only routes referenced by the exact coverage record and admitted through the publishable-summary gate are compared.",
    routeComparisonWithheld: "Route summaries are closed by scientific-review and license / reuse gates. No scientific conclusion should be drawn from closed cells.",
    routeComparisonUnavailable: "The route-comparison index is unavailable. Coverage status remains intact; missing comparison fields are not route evidence.",
    routeComparisonPartial: "Comparison fields are open only for routes that pass the publishable-summary gate; all other cells remain closed.",
    comparisonUnavailableCell: "Not available",
    numberOfSteps: "Number of steps",
    startingMaterials: "Starting materials",
    stereochemicalStrategy: "Stereochemical strategy",
    keyTransformations: "Key transformations",
    sourceAndYear: "Source class / year",
    publicationState: "Publication state",
    candidateBoundary: "Candidate sources are discovery leads only; they do not support a synthesis route until an exact source and locator are resolved.",
    noSourceBoundary: "No direct or candidate source was found within the recorded search scope. This is not a novelty, patentability, or synthesizability claim.",
    assessmentStates: {
      not_assessed: "Not assessed",
      searching: "Search in progress",
      assessed: "Assessed",
    },
    sourceEvidenceStates: {
      none_found: "No source found in recorded scope",
      candidate_sources: "Candidate sources only",
      direct_source_resolved: "Direct source resolved",
    },
    applicabilityStates: {
      applicable: "Applicable",
      not_applicable: "Not applicable",
      unclear: "Unclear",
    },
    reviewStates: {
      pending: "Pending review",
      reviewed: "Reviewed",
      verified: "Verified",
      withdrawn: "Withdrawn",
    },
    licenseStates: {
      permitted: "Permitted",
      attribution_required: "Attribution required",
      link_only: "Link only",
      restricted: "Restricted",
      mixed: "Mixed",
      unknown: "Unknown",
    },
    routeTypes: {
      patent_reported: "Patent reported",
      literature_reported: "Literature reported",
      teaching_reconstruction: "Teaching reconstruction",
      computational_proposed: "Computational proposal",
    },
    routeCompleteness: {
      complete: "Complete",
      partial: "Partial",
      upstream_gap: "Upstream gap",
      convergent_partial: "Convergent partial",
      unknown: "Completeness unresolved",
    },
    providerStatuses: {
      completed: "Completed",
      completed_with_errors: "Completed with errors",
      rate_limited: "Rate limited",
      unavailable: "Unavailable",
    },
    formKinds: {
      free_parent: "Free parent",
      salt: "Salt",
      hydrate: "Hydrate",
      solvate: "Solvate",
      other: "Other",
      unresolved: "Unresolved",
    },
    publicationStates: {
      reported_route: "Reported-route summary",
      teaching_reconstruction: "Teaching-reconstruction summary",
      computationally_proposed_route: "Computational-proposal summary",
      withheld: "Withheld",
      unavailable: "Unavailable",
    },
    routeSourceClasses: {
      patent_reported: "Patent",
      literature_reported: "Literature",
      teaching_reconstruction: "Combined sources",
      computational_proposed: "Computational proposal",
    },
  },
} as const;

export interface BasicMolecularRecordProps {
  readonly record: BasicMolecularRecordModel;
  readonly locale: Locale;
  readonly synthesisNavigator: SynthesisCatalogNavigator;
  readonly assetBasePath: string;
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

const interpolate = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

const synthesisProviderLabel = (adapterId: string, locale: Locale): string => {
  const labels = {
    "pubchem-manufacturing": {
      tr: "PubChem üretim yöntemi kayıtları",
      en: "PubChem manufacturing-method records",
    },
    "europe-pmc": {
      tr: "Europe PMC dergi kayıtları",
      en: "Europe PMC journal records",
    },
    "europe-pmc-patents": {
      tr: "Europe PMC patent kayıtları",
      en: "Europe PMC patent records",
    },
    "open-reaction-database": {
      tr: "Open Reaction Database",
      en: "Open Reaction Database",
    },
  } as const;
  return labels[adapterId as keyof typeof labels]?.[locale] ?? adapterId;
};

export function BasicMolecularRecord({
  record,
  locale,
  synthesisNavigator,
  assetBasePath,
  onBackToAtlas,
}: BasicMolecularRecordProps) {
  const copy = copyByLocale[locale];
  const twoD = record.structures.find((structure) => structure.dimension === "2d")!;
  const threeD = record.structures.find((structure) => structure.dimension === "3d")!;
  const synthesisCoverage = record.synthesisCoverage;
  const synthesisSurfaceState = synthesisCoverage
    ? getBasicRecordSynthesisSurfaceState(synthesisCoverage)
    : null;
  const reportedRoutes = synthesisCoverage?.routes.filter((route) =>
    route.routeType === "patent_reported" || route.routeType === "literature_reported"
  ) ?? [];
  const completeReportedRouteCount = reportedRoutes.filter(
    (route) => route.routeCompleteness === "complete",
  ).length;
  const partialReportedRouteCount = reportedRoutes.length - completeReportedRouteCount;
  const processing = synthesisCoverage?.evidenceProcessing ?? null;
  const synthesisTargetLabel = synthesisCoverage
    ? `${record.preferredName} · ${copy.formKinds[synthesisCoverage.chemicalFormKind]}`
    : record.preferredName;
  const providerQueryCount = synthesisCoverage?.providers.reduce(
    (sum, provider) => sum + provider.queryCount,
    0,
  ) ?? 0;
  const publicDraftSegmentResolved = Boolean(
    synthesisCoverage && synthesisCoverage.publicAlphaDrafts.length > 0,
  );
  const directSegmentResolved = Boolean(
    synthesisCoverage?.sourceEvidenceState === "direct_source_resolved",
  );
  const reportedRouteSourceResolved = Boolean(
    synthesisCoverage &&
    (synthesisCoverage.reportedRouteFoundPendingReview ||
      synthesisSurfaceState === "reported_complete" ||
      synthesisSurfaceState === "reported_partial"),
  );
  const synthesisEvidenceResolutionState = publicDraftSegmentResolved
    ? "draft-segment-resolved"
    : reportedRouteSourceResolved
      ? "reported-source-resolved"
      : directSegmentResolved
        ? "direct-segment-gated"
      : "not-resolved";
  const synthesisSurfaceTitle = synthesisSurfaceState === "candidate_extraction_complete"
    ? copy.candidateCompleteTitle
    : synthesisSurfaceState === "candidate_processing_incomplete"
      ? copy.candidatePendingTitle
      : synthesisSurfaceState === "source_access_blocked"
        ? copy.accessBlockedTitle
        : synthesisSurfaceState === "no_supporting_source_resolved"
          ? copy.scopedNoSupportTitle
          : synthesisSurfaceState === "public_draft_partial"
            ? copy.publicDraftTitle
          : synthesisSurfaceState === "teaching_reconstruction"
            ? copy.routeTypes.teaching_reconstruction
            : copy.reportedResolved;
  const synthesisSurfaceSummary = synthesisSurfaceState === "reported_complete"
    ? completeReportedRouteCount > 0
      ? interpolate(copy.reportedCompleteSummary, {
          name: synthesisTargetLabel,
          count: completeReportedRouteCount,
        })
      : interpolate(copy.reportedGatedSummary, { name: synthesisTargetLabel })
      : synthesisSurfaceState === "reported_partial"
      ? partialReportedRouteCount > 0
        ? interpolate(copy.reportedPartialSummary, {
            name: synthesisTargetLabel,
            count: partialReportedRouteCount,
          })
        : interpolate(copy.reportedGatedSummary, { name: synthesisTargetLabel })
      : synthesisSurfaceState === "public_draft_partial"
        ? interpolate(copy.publicDraftSummary, {
            name: synthesisTargetLabel,
            count: synthesisCoverage?.publicAlphaDrafts[0]?.draftRouteCount ?? 0,
          })
      : synthesisSurfaceState === "direct_source_gated"
        ? interpolate(copy.reportedGatedSummary, { name: synthesisTargetLabel })
      : synthesisSurfaceState === "teaching_reconstruction"
        ? interpolate(copy.teachingSummary, { name: synthesisTargetLabel })
        : synthesisSurfaceState === "candidate_extraction_complete"
          ? interpolate(copy.candidateCompleteSummary, {
              name: synthesisTargetLabel,
              count: processing?.terminalAssociationCount ?? 0,
            })
          : synthesisSurfaceState === "candidate_processing_incomplete"
            ? copy.candidatePendingSummary
            : synthesisSurfaceState === "source_access_blocked"
              ? interpolate(copy.accessBlockedSummary, {
                  count: processing?.accessBlockedCount ?? 0,
                })
              : interpolate(copy.scopedNoSupportSummary, {
                  providers: synthesisCoverage?.providers.length ?? 0,
                  queries: providerQueryCount,
                });

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
          <aside
            className={styles.synthesisLearningEntry}
            data-synthesis-learning-entry="true"
          >
            <span>{copy.synthesisLearningEyebrow}</span>
            <strong>{copy.synthesisLearningTitle}</strong>
            <p>{copy.synthesisLearningBody}</p>
            <a href={getSynthesisAcademyHash(record.stableSlug, "atlas")}>
              {copy.synthesisLearningAction} <i aria-hidden="true">→</i>
            </a>
          </aside>
        </div>
        <aside className={styles.summaryCard}>
          <span className={styles.sectionEyebrow}>{copy.identityScope}</span>
          <strong>{copy.depthTitle}</strong>
          <p>{synthesisCoverage ? copy.depthBodyWithSynthesis : copy.depthBody}</p>
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
          <p className={styles.depthNotice}>
            {synthesisCoverage ? copy.depthBodyWithSynthesis : copy.depthBody}
          </p>
        </section>

        {synthesisCoverage ? (
          <section
            aria-labelledby="basic-record-synthesis-coverage"
            data-basic-record-synthesis-coverage="true"
            data-synthesis-assessment-state={synthesisCoverage.assessmentState}
            data-synthesis-source-evidence-state={synthesisCoverage.sourceEvidenceState}
            data-synthesis-review-state={synthesisCoverage.reviewState}
            data-synthesis-surface-state={synthesisSurfaceState}
            data-synthesis-best-outcome={synthesisCoverage.bestOutcome ?? "legacy-snapshot"}
          >
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>{copy.synthesisCoverageEyebrow}</span>
                <h2 id="basic-record-synthesis-coverage">{copy.synthesisCoverageTitle}</h2>
              </div>
              <p>{copy.synthesisCoverageDescription}</p>
            </header>

            <div
              className={styles.reportedSynthesisState}
              data-reported-synthesis-state={reportedRouteSourceResolved ? "source-resolved" : "not-resolved"}
              data-synthesis-evidence-resolution-state={synthesisEvidenceResolutionState}
              data-synthesis-terminal-state={synthesisSurfaceState}
            >
              <span aria-hidden="true">{reportedRouteSourceResolved || directSegmentResolved || publicDraftSegmentResolved ? "●" : "○"}</span>
              <div>
                <strong>{synthesisSurfaceTitle}</strong>
                <small>{synthesisSurfaceSummary}</small>
                {synthesisSurfaceState === "public_draft_partial" ? (
                  <small>{copy.publicDraftBoundary}</small>
                ) : reportedRouteSourceResolved && synthesisCoverage.reviewState !== "verified" ? (
                  <small>{copy.reportedPending}</small>
                ) : null}
                {synthesisCoverage.sourceEvidenceState === "candidate_sources" && !processing ? (
                  <small>{copy.candidateBoundary}</small>
                ) : null}
                {synthesisCoverage.sourceEvidenceState === "none_found" && synthesisSurfaceState !== "source_access_blocked" ? (
                  <small>{copy.noSourceBoundary}</small>
                ) : null}
              </div>
            </div>

            {processing ? (
              <section
                className={styles.evidenceProcessing}
                aria-labelledby="basic-record-synthesis-evidence-processing"
                data-terminal-associations={processing.terminalAssociationCount}
              >
                <header>
                  <h3 id="basic-record-synthesis-evidence-processing">{copy.evidenceProcessing}</h3>
                  <code>{processing.pipelineVersion}</code>
                </header>
                <dl>
                  <div><dt>{copy.terminalAssociations}</dt><dd>{processing.terminalAssociationCount}/{processing.candidateAssociationCount}</dd></div>
                  <div><dt>{copy.accessible}</dt><dd>{processing.accessibleCount}</dd></div>
                  <div><dt>{copy.metadataOnly}</dt><dd>{processing.metadataOnlyCount}</dd></div>
                  <div><dt>{copy.accessBlocked}</dt><dd>{processing.accessBlockedCount}</dd></div>
                  <div><dt>{copy.unavailableSources}</dt><dd>{processing.unavailableCount}</dd></div>
                </dl>
              </section>
            ) : null}

            <dl className={styles.synthesisStateGrid}>
              <div>
                <dt>{copy.assessment}</dt>
                <dd>{copy.assessmentStates[synthesisCoverage.assessmentState]}</dd>
              </div>
              <div>
                <dt>{copy.sourceEvidence}</dt>
                <dd>{copy.sourceEvidenceStates[synthesisCoverage.sourceEvidenceState]}</dd>
              </div>
              <div>
                <dt>{copy.applicability}</dt>
                <dd>{copy.applicabilityStates[synthesisCoverage.applicability]}</dd>
              </div>
              <div>
                <dt>{copy.review}</dt>
                <dd>{copy.reviewStates[synthesisCoverage.reviewState]}</dd>
              </div>
              <div>
                <dt>{copy.license}</dt>
                <dd>{copy.licenseStates[synthesisCoverage.licenseState]}</dd>
              </div>
              <div>
                <dt>{copy.searchDate}</dt>
                <dd>{formatDate(synthesisCoverage.searchedAt, locale)}</dd>
              </div>
            </dl>

            <div className={styles.synthesisColumns}>
              <section className={styles.searchScope} aria-labelledby="basic-record-synthesis-search-scope">
                <header>
                  <h3 id="basic-record-synthesis-search-scope">{copy.searchScope}</h3>
                  <p>{copy.searchScopeBoundary}</p>
                </header>
                <ul>
                  {synthesisCoverage.providers.map((provider) => (
                    <li
                      key={`${provider.adapterId}:${provider.provider}`}
                      data-synthesis-provider={provider.adapterId}
                      data-provider-status={provider.status}
                    >
                      <div>
                        <strong>{synthesisProviderLabel(provider.adapterId, locale)}</strong>
                        <small>{copy.providerStatuses[provider.status]}</small>
                      </div>
                      <span>
                        {provider.queryCount} {provider.queryCount === 1 ? copy.query : copy.queries} · {provider.candidateCount} {provider.candidateCount === 1 ? copy.candidate : copy.candidates}
                      </span>
                    </li>
                  ))}
                </ul>
                <details className={styles.identityScope}>
                  <summary>{copy.identityScopeDetail}</summary>
                  <dl>
                    <div><dt>{copy.chemicalForm}</dt><dd>{copy.formKinds[synthesisCoverage.chemicalFormKind]}</dd></div>
                    <div><dt>{copy.stereochemistry}</dt><dd>{synthesisCoverage.stereochemistrySpecified ? copy.specified : copy.notSpecified}</dd></div>
                    <div><dt>{copy.queriedAliases}</dt><dd>{synthesisCoverage.aliasesQueried.join(" · ")}</dd></div>
                    <div><dt>{copy.pipeline}</dt><dd><code>{synthesisCoverage.pipelineVersion}</code></dd></div>
                  </dl>
                </details>
              </section>

              <section className={styles.routeReferences} aria-labelledby="basic-record-synthesis-routes">
                <header>
                  <h3 id="basic-record-synthesis-routes">{copy.routes}</h3>
                  <span>{synthesisCoverage.publicAlphaDrafts[0]?.draftRouteCount ?? synthesisCoverage.routes.length}</span>
                </header>
                {synthesisCoverage.publicAlphaDrafts.length > 0 ? (
                  <article
                    className={styles.publicDraftReference}
                    data-public-alpha-synthesis="source-supported-draft"
                    data-review-state="pending"
                    data-verified-scientific-claim="false"
                  >
                    <strong>{copy.publicDraftTitle}</strong>
                    <p>{copy.publicDraftBoundary}</p>
                    <dl>
                      <div><dt>{copy.completeness}</dt><dd>{copy.routeCompleteness[synthesisCoverage.publicAlphaDrafts[0].routeCompleteness]}</dd></div>
                      <div><dt>{copy.numberOfSteps}</dt><dd>{synthesisCoverage.publicAlphaDrafts[0].extractedStepCount}</dd></div>
                      <div><dt>{copy.review}</dt><dd>{copy.reviewStates.pending}</dd></div>
                    </dl>
                  </article>
                ) : synthesisCoverage.routes.length === 0 ? (
                  <p className={styles.noRoutes}>{copy.noRouteReference}</p>
                ) : (
                  <ul>
                    {synthesisCoverage.routes.map((route) => (
                      <li
                        key={route.routeId}
                        data-synthesis-route-type={route.routeType}
                        data-route-review-state={route.reviewState}
                        data-route-license-state={route.licenseState}
                      >
                        <div className={styles.routeHeading}>
                          <strong>{copy.routeTypes[route.routeType]}</strong>
                          <span data-review-state={route.reviewState}>{copy.reviewStates[route.reviewState]}</span>
                        </div>
                        <dl>
                          <div><dt>{copy.routeId}</dt><dd><code>{route.routeId}</code></dd></div>
                          <div><dt>{copy.completeness}</dt><dd>{copy.routeCompleteness[route.routeCompleteness]}</dd></div>
                          <div><dt>{copy.license}</dt><dd>{copy.licenseStates[route.licenseState]}</dd></div>
                        </dl>
                        {route.routeType === "teaching_reconstruction" ? (
                          <p>{copy.routeBoundaryTeaching}</p>
                        ) : route.routeType === "computational_proposed" ? (
                          <p>{copy.routeBoundaryComputational}</p>
                        ) : route.reviewState !== "verified" ? (
                          <p>{copy.routeBoundaryReported}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {synthesisCoverage.routes.length > 0 ? (
              <section
                className={styles.routeComparison}
                aria-labelledby="basic-record-route-comparison"
                data-synthesis-route-comparison={synthesisCoverage.routeComparison.state}
              >
                <header>
                  <div>
                    <span className={styles.sectionEyebrow}>{copy.routes}</span>
                    <h3 id="basic-record-route-comparison">{copy.routeComparisonTitle}</h3>
                  </div>
                  <p>{copy.routeComparisonDescription}</p>
                </header>
                {synthesisCoverage.routeComparison.state === "withheld" ? (
                  <p className={styles.comparisonGate}>{copy.routeComparisonWithheld}</p>
                ) : synthesisCoverage.routeComparison.state === "unavailable" ? (
                  <p className={styles.comparisonGate}>{copy.routeComparisonUnavailable}</p>
                ) : synthesisCoverage.routeComparison.state === "partially_available" ? (
                  <p className={styles.comparisonGate}>{copy.routeComparisonPartial}</p>
                ) : null}
                <div className={styles.comparisonScroller}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{copy.routeId}</th>
                        <th scope="col">{copy.numberOfSteps}</th>
                        <th scope="col">{copy.startingMaterials}</th>
                        <th scope="col">{copy.routeType}</th>
                        <th scope="col">{copy.stereochemicalStrategy}</th>
                        <th scope="col">{copy.keyTransformations}</th>
                        <th scope="col">{copy.sourceAndYear}</th>
                        <th scope="col">{copy.completeness}</th>
                        <th scope="col">{copy.review}</th>
                        <th scope="col">{copy.publicationState}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {synthesisCoverage.routeComparison.routes.map((route) => {
                        const comparisonAvailable = route.comparisonAvailability === "available";
                        return (
                          <tr
                            key={route.routeId}
                            data-comparison-route-id={route.routeId}
                            data-comparison-availability={route.comparisonAvailability}
                          >
                            <th scope="row"><code>{route.routeId}</code></th>
                            <td>{comparisonAvailable ? route.numberOfSteps : <span>{copy.comparisonUnavailableCell}</span>}</td>
                            <td>{comparisonAvailable ? route.startingMaterials.join(" · ") : <span>{copy.comparisonUnavailableCell}</span>}</td>
                            <td>{copy.routeTypes[route.routeType]}</td>
                            <td>{comparisonAvailable ? route.stereochemicalStrategy : <span>{copy.comparisonUnavailableCell}</span>}</td>
                            <td>{comparisonAvailable ? route.keyTransformations.join(" · ") : <span>{copy.comparisonUnavailableCell}</span>}</td>
                            <td>
                              {comparisonAvailable
                                ? `${copy.routeSourceClasses[route.routeType]} · ${route.sourceYear ?? copy.comparisonUnavailableCell}`
                                : <span>{copy.comparisonUnavailableCell}</span>}
                            </td>
                            <td>{copy.routeCompleteness[route.routeCompleteness]}</td>
                            <td>{copy.reviewStates[route.reviewState]}</td>
                            <td>{copy.publicationStates[route.publicationState]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

          </section>
        ) : (
          <section
            aria-labelledby="basic-record-synthesis-coverage"
            data-basic-record-synthesis-coverage="unavailable"
            data-synthesis-surface-state="coverage_unavailable"
          >
            <header className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>{copy.synthesisCoverageEyebrow}</span>
                <h2 id="basic-record-synthesis-coverage">{copy.synthesisCoverageTitle}</h2>
              </div>
              <p>{copy.synthesisCoverageDescription}</p>
            </header>

            <div
              className={styles.reportedSynthesisState}
              data-synthesis-coverage-load-state="unavailable"
              role="status"
            >
              <span aria-hidden="true">!</span>
              <div>
                <strong>{copy.synthesisCoverageUnavailableTitle}</strong>
                <small>{copy.synthesisCoverageUnavailableSummary}</small>
              </div>
            </div>
          </section>
        )}

        <EmbeddedSynthesisLearningStudio
          stableSlug={record.stableSlug}
          navigator={synthesisNavigator}
          assetBasePath={assetBasePath}
          locale={locale}
          fullAtlasHref={getSynthesisAcademyHash(record.stableSlug, "atlas")}
        />

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
