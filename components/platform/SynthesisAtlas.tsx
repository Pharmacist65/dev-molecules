"use client";

import { useEffect, useState } from "react";

import {
  getBasicRecordSynthesisSurfaceState,
  type BasicRecordSynthesisSurfaceState,
} from "@/lib/application/basic-record-synthesis-coverage";
import {
  loadPublishedSynthesisRoutes,
  type PublishedSynthesisRouteDetail,
  type PublishedSynthesisStepEvidenceMode,
} from "@/lib/application/published-synthesis-route";
import {
  SYNTHESIS_LEARNING_STRUCTURE_ASSETS_LOADING,
  SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
  loadSynthesisLearningStudioRouteDetail,
  type SynthesisLearningStudioRouteDetail,
} from "@/lib/application/synthesis-learning-studio-controller";
import type {
  PublicAlphaSynthesisDraftGraph,
  PublicAlphaSynthesisDraftStep,
} from "@/lib/domain/public-alpha-synthesis-draft";
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import { useI18n, type Locale } from "@/lib/i18n";
import { SynthesisLearningStudio } from "@/components/synthesis/SynthesisLearningStudio";
import { SmilesStructure } from "./SmilesStructure";

import atlas from "./SynthesisAtlas.module.css";

export interface SynthesisAtlasProps {
  readonly selectedMoleculeId?: string;
  readonly catalogSelection?: SynthesisCatalogSelection | null;
  readonly onSelectMolecule: (moleculeId: string) => void;
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
  readonly presentationMode?: "student" | "reviewer";
}

const copy = {
  tr: {
    eyebrow: "Sentez Atlası",
    catalogCoverage: "Sentez kanıtı kapsamı",
    coverageOnlyTitle: "{name} için sentez kanıtı durumu",
    directCoverage: "Doğrudan bir kaynak çözümlendi; rota ayrıntıları bilimsel inceleme ve yeniden kullanım izni tamamlanana kadar yayımlanmaz.",
    candidateCoverage: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi.",
    candidateLegacyCoverage: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi.",
    blockedCoverage: "Kaynak erişim sınırı nedeniyle aday belgelerin bir bölümü incelenemedi.",
    noSupportCoverage: "Kaydedilen araştırma kapsamında destekleyici kaynak çözümlenmedi.",
    reconstructionCoverage: "Kaynak segmentleriyle oluşturulan eğitsel bir rekonstrüksiyon kaydı var; tek bir eksiksiz raporlanmış rota olarak sunulmaz.",
    coverageUnavailable: "Bu kimliğin sentez kapsam kaydı şu anda doğrulanarak yüklenemiyor; eksiklik rota yokluğu olarak yorumlanmaz.",
    routeDetailClosed: "Bu kimlik için yayımlanabilir rota ayrıntısı henüz yok. Kanıt kapsamı kaydı erişilebilir; başka bir molekül seçebilir veya molekül yapısına dönebilirsin.",
    reportedDetailWithheld: "Raporlanmış rota kanıtı belirlendi; ayrıntı bilimsel inceleme ve yeniden kullanım değerlendirmesi tamamlanana kadar yayımlanmıyor.",
    routeDetailLoading: "Yayımlanabilir rota ayrıntısı doğrulanıyor…",
    routeDetailUnavailable: "Rota ayrıntısı doğrulanamadı. Güvenli kapsam görünümü korunuyor; bu durum rota yokluğu olarak yorumlanmaz.",
    publishedRoutes: "Yayımlanabilir rota ayrıntısı",
    publishedBoundary: "İncelenmiş, lisans kapısından geçmiş, operasyonel olmayan özet",
    routeType: "Rota katmanı",
    completeness: "Tamlık",
    startBoundary: "Başlangıç sınırı",
    stereochemistry: "Stereokimya stratejisi",
    review: "İnceleme",
    license: "Yeniden kullanım",
    step: "Basamak",
    reactants: "Reaktanlar",
    transformation: "Dönüşüm",
    product: "Ürün",
    evidence: "Kanıt durumu",
    reportedRoute: "Doğrudan raporlanmış rota",
    teachingRoute: "Kaynak-segmentli eğitim rekonstrüksiyonu",
    computationalRoute: "Hesaplamalı öneri",
    directReported: "Doğrudan kaynakta raporlanmış · incelenmiş",
    sourceContext: "Kaynak bağlamlı · incelenmiş",
    reconstructed: "Eğitim rekonstrüksiyonu · incelenmiş",
    computational: "Hesaplamalı öneri · incelenmiş; raporlanmış rota değildir",
    candidateAssociations: "Aday kaynak",
    terminalOutcomes: "Sonuçlandırılan değerlendirme",
    blockedDocuments: "Erişimi engellenen",
    lastAssessment: "Son değerlendirme",
    pipelineVersion: "Araştırma yöntemi sürümü",
    searchedProviders: "Araştırılan sağlayıcı",
    open3d: "Molekülü 3B odakta aç",
    draftCoverage: "Exact-target kaynak segmentlerinden oluşturulan, operasyonel ayrıntı içermeyen bir public-alpha rota taslağı var. Uzman incelemesi tamamlanmadı.",
    draftBadge: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR",
    draftBoundary: "Doğruluk, eksiksizlik, uygulanabilirlik ve yeniden üretilebilirlik uzman tarafından doğrulanmadı.",
    draftRights: "Yapılar kaynak şeması kopyalanmadan SMILES'tan bağımsız çizildi · ORD CC BY-SA 4.0",
    draftAlternatives: "Kaynak segmenti alternatifleri",
    draftAlternative: "Taslak alternatif",
    draftLayer: "Taslak katmanı",
    sourceSupportedFragment: "Kaynak destekli tek-segment taslak",
    teachingReconstruction: "Kaynaklar arası eğitim rekonstrüksiyonu",
    displayedSegments: "Bu alternatifte gösterilen segment",
    pendingReview: "Uzman incelemesi bekliyor",
    completenessPartial: "Kısmi",
    completenessUpstreamGap: "Üst-akış boşluklu",
    completenessConvergentPartial: "Konverjan kısmi",
    sourceInput: "Kaynak kaydındaki reaktan",
    exactTarget: "Exact hedef ürün",
    upstreamSegment: "Bağlanan üst-akış segmenti",
    targetSegment: "Hedefi oluşturan segment",
    exactBridge: "Exact InChIKey eşleşmeli eğitim köprüsü; kaynaklar bunu tek ve eksiksiz rota olarak raporlamaz.",
    exactIdentity: "Kesin hedef kimliği",
    chemicalFormScope: "Katalog form sınıfı",
    unresolvedChemicalForm: "Çözümlenmedi; kesin yapı eşleşmesi korunuyor",
    stereoIdentity: "Hedef kimliğinde stereokimya",
    stereoSpecified: "Belirtilmiş",
    stereoNotSpecified: "Belirtilmemiş",
    identityBoundary: "Hedef ürün exact InChIKey ile eşleşir ve kaynak segmentiyle form/stereokimya çelişkisi saptanmamıştır. Serbest ana yapı, tuz, hidrat veya solvat sınıfı katalogda çözümlenmediyse burada da açıkça çözümlenmemiş kalır.",
    unresolvedTransformation: "Segment sırası, reaksiyon sınıfı ve bağ değişimleri henüz çözümlenmedi.",
    explicitGap: "Üst-akış boşluğu açık bırakıldı",
    exactLocator: "Kesin kaynak konumu",
    sourceAttribution: "Kaynak ve atıf",
    openSource: "ORD kaydını aç",
    moreUpstream: "{count} ek üst-akış segmenti grafikte kayıtlıdır.",
    draftLoading: "Kaynak destekli taslak grafiği doğrulanıyor…",
    draftUnavailable: "Taslak grafiği bütünlük kapısından geçemedi; yalnız kapsam kaydı gösteriliyor.",
  },
  en: {
    eyebrow: "Synthesis Atlas",
    catalogCoverage: "Synthesis evidence coverage",
    coverageOnlyTitle: "Synthesis-evidence status for {name}",
    directCoverage: "A direct source has been resolved; route details remain unpublished until scientific review and reuse permission are complete.",
    candidateCoverage: "Sources identified; route extraction not yet resolved.",
    candidateLegacyCoverage: "Sources identified; route extraction not yet resolved.",
    blockedCoverage: "Some candidate documents could not be inspected because of source-access boundaries.",
    noSupportCoverage: "No supporting source was resolved in the recorded search scope.",
    reconstructionCoverage: "A source-segmented teaching reconstruction is recorded; it is not presented as one completely reported route.",
    coverageUnavailable: "This identity's synthesis coverage cannot currently be loaded with integrity; absence is not interpreted as no route.",
    routeDetailClosed: "No publishable route detail is currently available for this identity. Its evidence coverage remains accessible; choose another molecule or return to the molecular structure.",
    reportedDetailWithheld: "Reported-route evidence has been identified; detail remains withheld pending scientific and reuse review.",
    routeDetailLoading: "Validating publishable route detail…",
    routeDetailUnavailable: "Route detail could not be validated. The safe coverage view remains available; this is not interpreted as route absence.",
    publishedRoutes: "Publishable route detail",
    publishedBoundary: "Reviewed, reuse-gated, non-operational summary",
    routeType: "Route layer",
    completeness: "Completeness",
    startBoundary: "Start boundary",
    stereochemistry: "Stereochemical strategy",
    review: "Review",
    license: "Reuse permission",
    step: "Step",
    reactants: "Reactants",
    transformation: "Transformation",
    product: "Product",
    evidence: "Evidence status",
    reportedRoute: "Directly reported route",
    teachingRoute: "Source-segmented teaching reconstruction",
    computationalRoute: "Computational proposal",
    directReported: "Directly source-reported · reviewed",
    sourceContext: "Source-context evidence · reviewed",
    reconstructed: "Teaching reconstruction · reviewed",
    computational: "Computationally proposed · reviewed; not a reported route",
    candidateAssociations: "Candidate sources",
    terminalOutcomes: "Completed assessments",
    blockedDocuments: "Access blocked",
    lastAssessment: "Last assessment",
    pipelineVersion: "Assessment method version",
    searchedProviders: "Providers searched",
    open3d: "Open molecule in 3D focus",
    draftCoverage: "A non-operational public-alpha route draft has been assembled from exact-target source segments. Expert review is not complete.",
    draftBadge: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
    draftBoundary: "Accuracy, completeness, applicability, and reproducibility have not been expert-verified.",
    draftRights: "Structures are independent SMILES redraws, not copied source schemes · ORD CC BY-SA 4.0",
    draftAlternatives: "Source-segment alternatives",
    draftAlternative: "Draft alternative",
    draftLayer: "Draft layer",
    sourceSupportedFragment: "Source-supported single-segment draft",
    teachingReconstruction: "Cross-source teaching reconstruction",
    displayedSegments: "Segments shown in this alternative",
    pendingReview: "Pending expert review",
    completenessPartial: "Partial",
    completenessUpstreamGap: "Upstream gap",
    completenessConvergentPartial: "Convergent partial",
    sourceInput: "Source-record reactant",
    exactTarget: "Exact target product",
    upstreamSegment: "Connected upstream segment",
    targetSegment: "Target-forming segment",
    exactBridge: "Exact-InChIKey teaching bridge; the sources do not report this as one complete route.",
    exactIdentity: "Exact target identity",
    chemicalFormScope: "Catalog form class",
    unresolvedChemicalForm: "Unresolved; exact structure match retained",
    stereoIdentity: "Stereochemistry in target identity",
    stereoSpecified: "Specified",
    stereoNotSpecified: "Not specified",
    identityBoundary: "The target product matches by exact InChIKey and no form or stereochemistry conflict was detected against the source segment. If the catalog-level free-parent, salt, hydrate, or solvate class is unresolved, it remains explicitly unresolved here.",
    unresolvedTransformation: "Segment order, reaction class, and bond changes remain unresolved.",
    explicitGap: "Upstream gap remains explicit",
    exactLocator: "Exact source locator",
    sourceAttribution: "Source and attribution",
    openSource: "Open ORD record",
    moreUpstream: "{count} additional upstream segments remain recorded in the graph.",
    draftLoading: "Validating source-supported draft graph…",
    draftUnavailable: "The draft graph failed its integrity gate; coverage-only state is preserved.",
  },
} as const;

const interpolate = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

const formatCoverageDate = (value: string, locale: Locale): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  }).format(date);
};

const coverageStateBody = (
  state: BasicRecordSynthesisSurfaceState,
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (state === "public_draft_partial") return labels.draftCoverage;
  if (
    state === "direct_source_gated" ||
    state === "reported_complete" ||
    state === "reported_partial"
  ) {
    return labels.directCoverage;
  }
  if (state === "candidate_extraction_complete") return labels.candidateCoverage;
  if (state === "candidate_processing_incomplete") return labels.candidateLegacyCoverage;
  if (state === "source_access_blocked") return labels.blockedCoverage;
  if (state === "teaching_reconstruction") return labels.reconstructionCoverage;
  return labels.noSupportCoverage;
};

function CatalogCoverageBanner({
  selection,
  locale,
}: {
  readonly selection: SynthesisCatalogSelection;
  readonly locale: Locale;
}) {
  const labels = copy[locale];
  const coverage = selection.coverage;
  const state = coverage ? getBasicRecordSynthesisSurfaceState(coverage) : null;
  const processing = coverage?.evidenceProcessing ?? null;
  return (
    <aside
      className={atlas.catalogCoverageBanner}
      data-synthesis-catalog-coverage={selection.catalogEntityId}
      data-coverage-load-state={selection.coverageLoadState}
      data-coverage-surface-state={state ?? "unavailable"}
    >
      <div>
        <span>{labels.catalogCoverage}</span>
        <h2>{interpolate(labels.coverageOnlyTitle, { name: selection.preferredName })}</h2>
        <p>{state ? coverageStateBody(state, locale) : labels.coverageUnavailable}</p>
      </div>
      <dl>
        <div><dt>{labels.candidateAssociations}</dt><dd>{processing?.candidateAssociationCount ?? coverage?.sourceEvidenceCount ?? "—"}</dd></div>
        <div><dt>{labels.terminalOutcomes}</dt><dd>{processing ? `${processing.terminalAssociationCount}/${processing.candidateAssociationCount}` : "—"}</dd></div>
        <div><dt>{labels.blockedDocuments}</dt><dd>{processing?.accessBlockedCount ?? "—"}</dd></div>
        <div><dt>{labels.searchedProviders}</dt><dd>{coverage?.providers.length ?? "—"}</dd></div>
        <div><dt>{labels.lastAssessment}</dt><dd>{coverage ? formatCoverageDate(coverage.searchedAt, locale) : "—"}</dd></div>
        <div><dt>{labels.pipelineVersion}</dt><dd>{coverage?.pipelineVersion ?? "—"}</dd></div>
      </dl>
    </aside>
  );
}

const routePresentationLabel = (
  route: PublishedSynthesisRouteDetail,
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (route.presentation === "reported_route") return labels.reportedRoute;
  if (route.presentation === "teaching_reconstruction") return labels.teachingRoute;
  return labels.computationalRoute;
};

const evidenceLabel = (
  mode: PublishedSynthesisStepEvidenceMode,
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (mode === "direct_reported") return labels.directReported;
  if (mode === "source_context") return labels.sourceContext;
  if (mode === "reconstructed") return labels.reconstructed;
  return labels.computational;
};

const draftCompletenessLabel = (
  value: PublicAlphaSynthesisDraftGraph["routeCompleteness"],
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (value === "partial") return labels.completenessPartial;
  if (value === "convergent_partial") return labels.completenessConvergentPartial;
  return labels.completenessUpstreamGap;
};

const draftLayerLabel = (
  value: PublicAlphaSynthesisDraftGraph["alternatives"][number]["routeType"],
  locale: Locale,
): string => value === "teaching_reconstruction"
  ? copy[locale].teachingReconstruction
  : copy[locale].sourceSupportedFragment;

function PublishedRouteDetail({
  route,
  locale,
}: {
  readonly route: PublishedSynthesisRouteDetail;
  readonly locale: Locale;
}) {
  const labels = copy[locale];
  return (
    <article
      className={atlas.publishedRoute}
      data-published-synthesis-route={route.presentation}
      data-operational-details="excluded"
    >
      <header className={atlas.publishedRouteHeader}>
        <div>
          <span>{routePresentationLabel(route, locale)}</span>
          <h2>{route.title}</h2>
        </div>
        <strong>{route.steps.length} {labels.step.toLocaleLowerCase(locale)}</strong>
      </header>
      <dl className={atlas.publishedRouteMetadata}>
        <div><dt>{labels.routeType}</dt><dd>{routePresentationLabel(route, locale)}</dd></div>
        <div><dt>{labels.completeness}</dt><dd>{route.routeCompleteness.replaceAll("_", " ")}</dd></div>
        <div><dt>{labels.startBoundary}</dt><dd>{route.startBoundary}</dd></div>
        <div><dt>{labels.stereochemistry}</dt><dd>{route.stereochemicalStrategy}</dd></div>
        <div><dt>{labels.review}</dt><dd>{route.reviewState}</dd></div>
        <div><dt>{labels.license}</dt><dd>{route.licenseState.replaceAll("_", " ")}</dd></div>
      </dl>

      <div className={atlas.publishedRouteVisual} aria-hidden="true">
        {route.steps.map((step) => (
          <section className={atlas.publishedRouteStep} key={step.id}>
            <b>{String(step.order).padStart(2, "0")}</b>
            <div>
              <span>{labels.reactants}</span>
              <strong>{step.reactants.map((material) => material.label).join(" + ")}</strong>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <span>{labels.transformation}</span>
              <strong>{step.transformation}</strong>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <span>{labels.product}</span>
              <strong>{step.products.map((material) => material.label).join(" + ")}</strong>
            </div>
            <small>{evidenceLabel(step.evidenceMode, locale)}</small>
          </section>
        ))}
      </div>

      <ol className={atlas.srOnly} aria-label={`${route.title}: ${labels.publishedRoutes}`}>
        {route.steps.map((step) => (
          <li key={step.id}>
            <strong>{labels.step} {step.order}.</strong>{" "}
            <span>{labels.reactants}: {step.reactants.map((material) => material.label).join(", ")}.</span>{" "}
            <span>{labels.transformation}: {step.transformation}.</span>{" "}
            <span>{labels.product}: {step.products.map((material) => material.label).join(", ")}.</span>{" "}
            <span>{labels.evidence}: {evidenceLabel(step.evidenceMode, locale)} ({step.reviewState}).</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function DraftStepCard({
  step,
  graph,
  locale,
}: {
  readonly step: PublicAlphaSynthesisDraftStep;
  readonly graph: PublicAlphaSynthesisDraftGraph;
  readonly locale: Locale;
}) {
  const labels = copy[locale];
  const materialById = new Map(graph.materials.map((material) => [material.id, material] as const));
  const citation = graph.citations.find((item) => item.id === step.citationId);
  const inputs = step.inputMaterialIds.flatMap((id) => {
    const material = materialById.get(id);
    return material ? [material] : [];
  });
  const outputs = step.outputMaterialIds.flatMap((id) => {
    const material = materialById.get(id);
    return material ? [material] : [];
  });
  return (
    <article className={atlas.draftStep} data-draft-step={step.relationship}>
      <header>
        <span>{step.relationship === "target_forming_segment" ? labels.targetSegment : labels.upstreamSegment}</span>
        <strong>{labels.unresolvedTransformation}</strong>
      </header>
      <div className={atlas.draftReactionRow}>
        <div className={atlas.draftMaterialGroup}>
          {inputs.map((material, index) => (
            <SmilesStructure
              key={`${step.id}:input:${index}:${material.id}`}
              className={atlas.draftStructure}
              smiles={material.sourceSmiles}
              label={`${labels.sourceInput}: ${material.label}`}
            />
          ))}
        </div>
        <div className={atlas.draftArrow} aria-label={labels.transformation}>
          <span>→</span>
          <small>{labels.unresolvedTransformation}</small>
        </div>
        <div className={atlas.draftMaterialGroup}>
          {outputs.map((material, index) => (
            <SmilesStructure
              key={`${step.id}:output:${index}:${material.id}`}
              className={atlas.draftStructure}
              smiles={material.sourceSmiles}
              label={`${material.displayRole === "exact_target" ? labels.exactTarget : labels.product}: ${material.label}`}
            />
          ))}
        </div>
      </div>
      {citation ? (
        <footer className={atlas.draftCitation}>
          <div>
            <span>{labels.exactLocator}</span>
            <code>{citation.locator.value}</code>
            <span>{labels.sourceAttribution}</span>
            <strong>{citation.label}</strong>
            <small>{citation.license.attribution}</small>
          </div>
          <a href={citation.url} target="_blank" rel="noreferrer">
            {labels.openSource} <span aria-hidden="true">↗</span>
          </a>
        </footer>
      ) : null}
    </article>
  );
}

/** @deprecated The integrated learning studio is the active public surface. */
export function PublicAlphaDraftDetail({
  graph,
  locale,
}: {
  readonly graph: PublicAlphaSynthesisDraftGraph;
  readonly locale: Locale;
}) {
  const labels = copy[locale];
  const [selectedId, setSelectedId] = useState(graph.alternatives[0]?.id ?? "");
  const selected = graph.alternatives.find((item) => item.id === selectedId) ?? graph.alternatives[0];
  const stepById = new Map(graph.steps.map((step) => [step.id, step] as const));
  if (!selected) return null;
  const leadStep = stepById.get(selected.finalStepId);
  const leadCitation = leadStep
    ? graph.citations.find((item) => item.id === leadStep.citationId)
    : undefined;
  const allSelectedSteps = [
    ...selected.upstreamStepIds.flatMap((id) => {
      const step = stepById.get(id);
      return step ? [step] : [];
    }),
    ...(() => {
      const step = stepById.get(selected.finalStepId);
      return step ? [step] : [];
    })(),
  ];
  const visibleUpstreamCount = Math.min(selected.upstreamStepIds.length, 3);
  const visibleSteps = [
    ...allSelectedSteps.slice(0, visibleUpstreamCount),
    allSelectedSteps.at(-1),
  ].filter((step, index, values): step is PublicAlphaSynthesisDraftStep =>
    Boolean(step) && values.indexOf(step) === index
  );
  const hiddenUpstreamCount = Math.max(0, selected.upstreamStepIds.length - visibleUpstreamCount);
  return (
    <section
      className={atlas.publicDraft}
      data-public-alpha-synthesis="source-supported-draft"
      data-review-state="pending"
      data-verified-scientific-claim="false"
      data-operational-details="excluded"
    >
      <header className={atlas.publicDraftHeader}>
        <div>
          <span>{labels.draftBadge}</span>
          <h2>{graph.identity.preferredName}</h2>
          <dl className={atlas.draftLeadEvidence}>
            <div>
              <dt>{labels.exactIdentity}</dt>
              <dd><code>{graph.identity.inchiKey}</code></dd>
            </div>
            {leadCitation ? (
              <div>
                <dt>{labels.exactLocator}</dt>
                <dd>
                  <code>{leadCitation.locator.value}</code>
                  <a href={leadCitation.url} target="_blank" rel="noreferrer">
                    {labels.openSource} <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
          <p>{labels.draftBoundary}</p>
        </div>
        <dl>
          <div><dt>{labels.draftLayer}</dt><dd>{draftLayerLabel(selected.routeType, locale)}</dd></div>
          <div><dt>{labels.completeness}</dt><dd>{draftCompletenessLabel(selected.routeCompleteness, locale)}</dd></div>
          <div><dt>{labels.displayedSegments}</dt><dd>{allSelectedSteps.length}</dd></div>
          <div><dt>{labels.draftAlternatives}</dt><dd>{graph.alternatives.length}</dd></div>
          <div><dt>{labels.review}</dt><dd>{labels.pendingReview}</dd></div>
          <div><dt>{labels.license}</dt><dd>CC BY-SA 4.0</dd></div>
          <div><dt>{labels.explicitGap}</dt><dd>{selected.unresolvedGapCount}</dd></div>
          <div>
            <dt>{labels.chemicalFormScope}</dt>
            <dd>{graph.identity.chemicalForm === "unresolved" ? labels.unresolvedChemicalForm : graph.identity.chemicalForm}</dd>
          </div>
          <div>
            <dt>{labels.stereoIdentity}</dt>
            <dd>{graph.identity.stereochemistrySpecified ? labels.stereoSpecified : labels.stereoNotSpecified}</dd>
          </div>
        </dl>
      </header>
      <p className={atlas.draftIdentityBoundary}>{labels.identityBoundary}</p>
      <p className={atlas.draftRights}>{labels.draftRights}</p>
      {graph.alternatives.length > 1 ? (
        <div className={atlas.draftAlternativePicker} aria-label={labels.draftAlternatives}>
          {graph.alternatives.map((alternative, index) => (
            <button
              type="button"
              key={alternative.id}
              aria-pressed={alternative.id === selected.id}
              onClick={() => setSelectedId(alternative.id)}
            >
              {labels.draftAlternative} {index + 1}
            </button>
          ))}
        </div>
      ) : null}
      {selected.routeType === "teaching_reconstruction" ? (
        <aside className={atlas.draftBridgeNotice}>{labels.exactBridge}</aside>
      ) : null}
      <div className={atlas.draftSteps}>
        {visibleSteps.map((step) => (
          <DraftStepCard key={step.id} step={step} graph={graph} locale={locale} />
        ))}
      </div>
      {hiddenUpstreamCount > 0 ? (
        <p className={atlas.draftMore}>
          {interpolate(labels.moreUpstream, { count: hiddenUpstreamCount })}
        </p>
      ) : null}
      <aside className={atlas.draftLimitations}>
        {graph.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}
      </aside>
    </section>
  );
}

type RouteDetailState =
  | { readonly kind: "coverage_only"; readonly routes: readonly [] }
  | { readonly kind: "loading"; readonly routes: readonly [] }
  | { readonly kind: "available"; readonly routes: readonly PublishedSynthesisRouteDetail[] }
  | { readonly kind: "unavailable"; readonly routes: readonly [] };

interface StoredRouteDetailState {
  readonly requestKey: string;
  readonly value: Exclude<RouteDetailState, { readonly kind: "loading" }>;
}

type DraftDetailState =
  | SynthesisLearningStudioRouteDetail
  | {
      readonly kind: "loading";
      readonly graphs: readonly [];
      readonly structureAssetsByInchiKey: ReadonlyMap<string, never>;
      readonly routeDetailLoadState: "ready";
      readonly structureAssetAvailability:
        typeof SYNTHESIS_LEARNING_STRUCTURE_ASSETS_LOADING;
    };

interface StoredDraftDetailState {
  readonly requestKey: string;
  readonly value: SynthesisLearningStudioRouteDetail;
}

const EMPTY_STRUCTURE_ASSET_REGISTRY: ReadonlyMap<string, never> =
  new Map<string, never>();

/**
 * The public Atlas deliberately renders only the generated coverage
 * projection. Pending route fixtures are never imported into this client
 * module. Route detail can be fetched only through a non-null, publication-
 * eligible `detailPath` in the generated index and is validated again before
 * rendering.
 */
export function SynthesisAtlas({
  catalogSelection,
  onOpenMoleculeFocus,
  presentationMode = "student",
}: SynthesisAtlasProps) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [storedRouteDetail, setStoredRouteDetail] = useState<StoredRouteDetailState | null>(null);
  const [storedDraftDetail, setStoredDraftDetail] = useState<StoredDraftDetailState | null>(null);
  const coverage = catalogSelection?.coverage ?? null;
  const routeRequestKey = catalogSelection && coverage && coverage.routes.length > 0
    ? [
        catalogSelection.catalogEntityId,
        coverage.coverageId,
        ...coverage.routes.map((route) => route.routeId).sort(),
      ].join("|")
    : null;
  const routeDetail: RouteDetailState = routeRequestKey === null
    ? { kind: "coverage_only", routes: [] }
    : storedRouteDetail?.requestKey === routeRequestKey
      ? storedRouteDetail.value
      : { kind: "loading", routes: [] };
  const draftRequestKey = catalogSelection && coverage && coverage.publicAlphaDrafts.length > 0
    ? [
        catalogSelection.catalogEntityId,
        coverage.coverageId,
        ...coverage.publicAlphaDrafts.map((draft) => draft.graphId).sort(),
      ].join("|")
    : null;
  const draftDetail: DraftDetailState = draftRequestKey === null
    ? {
        kind: "coverage_only",
        graphs: [],
        structureAssetsByInchiKey: EMPTY_STRUCTURE_ASSET_REGISTRY,
        routeDetailLoadState: "ready",
        structureAssetAvailability:
          SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
      }
    : storedDraftDetail?.requestKey === draftRequestKey
      ? storedDraftDetail.value
      : {
          kind: "loading",
          graphs: [],
          structureAssetsByInchiKey: EMPTY_STRUCTURE_ASSET_REGISTRY,
          routeDetailLoadState: "ready",
          structureAssetAvailability:
            SYNTHESIS_LEARNING_STRUCTURE_ASSETS_LOADING,
        };

  useEffect(() => {
    let active = true;
    if (!catalogSelection || !coverage || routeRequestKey === null) return undefined;
    void loadPublishedSynthesisRoutes(
      {
        catalogEntityId: catalogSelection.catalogEntityId,
        coverageId: coverage.coverageId,
        pubChemCid: catalogSelection.pubChemCid,
        inchiKey: catalogSelection.inchiKey,
      },
      coverage.routes,
      { assetBasePath: import.meta.env.BASE_URL },
    ).then((result) => {
      if (!active) return;
      setStoredRouteDetail({
        requestKey: routeRequestKey,
        value: result.state === "available"
          ? { kind: "available", routes: result.routes }
          : { kind: "coverage_only", routes: [] },
      });
    }).catch(() => {
      if (active) {
        setStoredRouteDetail({
          requestKey: routeRequestKey,
          value: { kind: "unavailable", routes: [] },
        });
      }
    });
    return () => { active = false; };
  }, [catalogSelection, coverage, routeRequestKey]);

  useEffect(() => {
    let active = true;
    if (!catalogSelection || !coverage || draftRequestKey === null) return undefined;
    void loadSynthesisLearningStudioRouteDetail(catalogSelection, {
      assetBasePath: import.meta.env.BASE_URL,
    }).then((detail) => {
      if (!active) return;
      setStoredDraftDetail({
        requestKey: draftRequestKey,
        value: detail,
      });
    }).catch(() => {
      if (active) {
        setStoredDraftDetail({
          requestKey: draftRequestKey,
          value: {
            kind: "unavailable",
            graphs: [],
            structureAssetsByInchiKey: EMPTY_STRUCTURE_ASSET_REGISTRY,
            routeDetailLoadState: "unavailable",
            structureAssetAvailability: {
              ...SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
              reason: "route_detail_unavailable",
            },
          },
        });
      }
    });
    return () => { active = false; };
  }, [catalogSelection, coverage, draftRequestKey]);

  if (!catalogSelection) return null;

  const closedMessage = coverage?.reportedRouteFoundPendingReview
    ? labels.reportedDetailWithheld
    : labels.routeDetailClosed;

  return (
    <section
      className={atlas.atlas}
      aria-labelledby="synthesis-atlas-heading"
      data-synthesis-atlas={routeDetail.kind === "available"
        ? "published-route"
        : draftDetail.kind === "available"
          ? "public-alpha-draft"
          : "coverage-only"}
      data-synthesis-atlas-coverage-only={
        routeDetail.kind === "available" || draftDetail.kind === "available" ? "false" : "true"
      }
      data-catalog-entity-id={catalogSelection.catalogEntityId}
      data-route-detail-gate="generated-artifact-required"
      data-structure-asset-availability={
        draftDetail.structureAssetAvailability.state
      }
      data-presentation-mode={presentationMode}
    >
      {routeDetail.kind === "available" ? (
        <>
          <header className={atlas.hero}>
            <div>
              <span>{labels.eyebrow}</span>
              <h1 id="synthesis-atlas-heading">{catalogSelection.preferredName}</h1>
              <p>{catalogSelection.molecularFormula} · CID {catalogSelection.pubChemCid}</p>
            </div>
          </header>
          <CatalogCoverageBanner selection={catalogSelection} locale={locale} />
        </>
      ) : (
        <h1 id="synthesis-atlas-heading" className={atlas.srOnly}>
          {labels.eyebrow}: {catalogSelection.preferredName}
        </h1>
      )}
      {routeDetail.kind === "available" ? (
        <section className={atlas.publishedRoutes} aria-labelledby="published-synthesis-routes-heading">
          <header>
            <div>
              <span>{labels.publishedBoundary}</span>
              <h2 id="published-synthesis-routes-heading">{labels.publishedRoutes}</h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenMoleculeFocus(catalogSelection.catalogEntityId)}
            >
              {labels.open3d} <span aria-hidden="true">↗</span>
            </button>
          </header>
          {routeDetail.routes.map((route) => (
            <PublishedRouteDetail key={route.id} route={route} locale={locale} />
          ))}
        </section>
      ) : (
        <>
          {draftDetail.kind === "available" ? (
            <section
              className={atlas.publicDrafts}
              aria-label={labels.draftBadge}
              data-learning-studio-shell="true"
              data-public-alpha-synthesis="source-supported-draft"
              data-review-state="pending"
              data-verified-scientific-claim="false"
              data-operational-details="excluded"
              data-total-unresolved-gap-count={draftDetail.graphs.reduce(
                (sum, graph) => sum + graph.alternatives.reduce(
                  (graphSum, alternative) => graphSum + alternative.unresolvedGapCount,
                  0,
                ),
                0,
              )}
            >
              <SynthesisLearningStudio
                selection={catalogSelection}
                graphs={draftDetail.graphs}
                structureAssetsByInchiKey={
                  draftDetail.structureAssetsByInchiKey
                }
                structureAssetAvailability={
                  draftDetail.structureAssetAvailability
                }
                routeDetailLoadState={draftDetail.routeDetailLoadState}
                presentationMode={presentationMode}
                onOpenMoleculeFocus={onOpenMoleculeFocus}
              />
            </section>
          ) : (
            <section className={atlas.publicDrafts} data-learning-studio-shell="true">
              <SynthesisLearningStudio
                selection={catalogSelection}
                graphs={[]}
                structureAssetsByInchiKey={
                  draftDetail.structureAssetsByInchiKey
                }
                structureAssetAvailability={
                  draftDetail.structureAssetAvailability
                }
                routeDetailLoadState={draftDetail.routeDetailLoadState}
                presentationMode={presentationMode}
                onOpenMoleculeFocus={onOpenMoleculeFocus}
              />
            </section>
          )}
          {draftDetail.kind !== "available" ? (
            <section
              className={atlas.coverageOnlyBoundary}
              data-route-detail-state={draftRequestKey ? draftDetail.kind : routeDetail.kind}
              role={routeDetail.kind === "loading" || draftDetail.kind === "loading" ? "status" : undefined}
            >
              <strong>
                {draftDetail.kind === "loading"
                  ? labels.draftLoading
                  : draftDetail.kind === "unavailable"
                    ? labels.draftUnavailable
                    : routeDetail.kind === "loading"
                      ? labels.routeDetailLoading
                      : routeDetail.kind === "unavailable"
                        ? labels.routeDetailUnavailable
                        : closedMessage}
              </strong>
              <button
                type="button"
                onClick={() => onOpenMoleculeFocus(catalogSelection.catalogEntityId)}
              >
                {labels.open3d} <span aria-hidden="true">↗</span>
              </button>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
