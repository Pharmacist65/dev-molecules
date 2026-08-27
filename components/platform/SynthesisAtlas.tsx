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
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import { useI18n, type Locale } from "@/lib/i18n";

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
    candidateCoverage: "Aday kaynakların değerlendirmesi tamamlandı; henüz yayımlanabilir bir rota çözümlenmedi.",
    candidateLegacyCoverage: "Aday kaynaklar bulundu; değerlendirme sonuçlarının tamamlandığı henüz doğrulanamadı.",
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
  },
  en: {
    eyebrow: "Synthesis Atlas",
    catalogCoverage: "Synthesis evidence coverage",
    coverageOnlyTitle: "Synthesis-evidence status for {name}",
    directCoverage: "A direct source has been resolved; route details remain unpublished until scientific review and reuse permission are complete.",
    candidateCoverage: "Candidate-source assessment is complete; no publishable route has been resolved yet.",
    candidateLegacyCoverage: "Candidate sources were found, but completion of their assessment cannot yet be confirmed.",
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

type RouteDetailState =
  | { readonly kind: "coverage_only"; readonly routes: readonly [] }
  | { readonly kind: "loading"; readonly routes: readonly [] }
  | { readonly kind: "available"; readonly routes: readonly PublishedSynthesisRouteDetail[] }
  | { readonly kind: "unavailable"; readonly routes: readonly [] };

interface StoredRouteDetailState {
  readonly requestKey: string;
  readonly value: Exclude<RouteDetailState, { readonly kind: "loading" }>;
}

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

  if (!catalogSelection) return null;

  const closedMessage = coverage?.reportedRouteFoundPendingReview
    ? labels.reportedDetailWithheld
    : labels.routeDetailClosed;

  return (
    <section
      className={atlas.atlas}
      aria-labelledby="synthesis-atlas-heading"
      data-synthesis-atlas={routeDetail.kind === "available" ? "published-route" : "coverage-only"}
      data-synthesis-atlas-coverage-only={routeDetail.kind === "available" ? "false" : "true"}
      data-catalog-entity-id={catalogSelection.catalogEntityId}
      data-route-detail-gate="generated-artifact-required"
      data-presentation-mode={presentationMode}
    >
      <header className={atlas.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1 id="synthesis-atlas-heading">{catalogSelection.preferredName}</h1>
          <p>{catalogSelection.molecularFormula} · CID {catalogSelection.pubChemCid}</p>
        </div>
      </header>
      <CatalogCoverageBanner selection={catalogSelection} locale={locale} />
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
        <section
          className={atlas.coverageOnlyBoundary}
          data-route-detail-state={routeDetail.kind}
          role={routeDetail.kind === "loading" ? "status" : undefined}
        >
          <strong>
            {routeDetail.kind === "loading"
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
      )}
    </section>
  );
}
