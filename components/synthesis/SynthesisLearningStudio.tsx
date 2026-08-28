"use client";

import {
  useMemo,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { MoleculeViewer } from "@/components/molecule-viewer/MoleculeViewer";
import { SmilesStructure } from "@/components/platform/SmilesStructure";
import {
  createSynthesisLearningStudioModel,
  type SynthesisLearningMaterial,
  type SynthesisLearningRoute,
  type SynthesisLearningStep,
} from "@/lib/application/synthesis-learning-studio";
import {
  SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
  type SynthesisLearningStructureAssetAvailability,
} from "@/lib/application/synthesis-learning-studio-controller";
import { getSynthesisStep3DGate } from "@/lib/application/synthesis-learning-evidence";
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import type { PublicAlphaSynthesisDraftGraph } from "@/lib/domain/public-alpha-synthesis-draft";
import type { SynthesisLearningStructureBundle } from "@/lib/domain/synthesis-learning-evidence";
import { useI18n, type Locale } from "@/lib/i18n";

import styles from "./SynthesisLearningStudio.module.css";

type StudioTab = "overview" | "explorer" | "steps" | "mechanism" | "references";
type StudioMode = "student" | "reference";
type StudioExplorerFocus =
  | { readonly kind: "target" }
  | {
      readonly kind: "step_output";
      readonly stepId: string;
      readonly materialId: string;
    };

export interface SynthesisLearningStudioProps {
  readonly selection: SynthesisCatalogSelection;
  readonly graphs: readonly PublicAlphaSynthesisDraftGraph[];
  readonly presentationMode?: "student" | "reviewer";
  readonly onOpenMoleculeFocus?: (moleculeId: string) => void;
  readonly structureAssetsByInchiKey?: ReadonlyMap<string, SynthesisLearningStructureBundle>;
  readonly variant?: "full" | "compact";
  readonly routeDetailLoadState?: "ready" | "unavailable";
  readonly structureAssetAvailability?:
    SynthesisLearningStructureAssetAvailability;
}

const copy = {
  tr: {
    eyebrow: "Sentez ve 3B Öğrenme",
    title: "Yapıdan kanıta, tek öğrenme stüdyosu.",
    boundary: "Operasyonel olmayan eğitim görünümü · uzman incelemesi bekliyor",
    overview: "Genel Bakış",
    explorer: "3B Keşif",
    steps: "Sentez Basamakları",
    mechanism: "Mekanizma",
    references: "Kaynaklar",
    student: "Studio Öğrenci Görünümü",
    reference: "Studio Referans Görünümü",
    quality: "Rota kalite sınıfı",
    complete: "Tam öğrenme rotası",
    substantive: "Bağlı, anlamlı kısmi rota",
    fragment: "Kaynak destekli fragment rota",
    candidate: "Yalnız aday kaynak",
    none: "Destekleyici kaynak çözümlenmedi",
    coverageUnavailable: "Sentez kapsamı kullanılamıyor",
    coverageUnavailableBody: "Sentez kapsam kaydı yüklenemedi. Kaynak bulunup bulunmadığına ilişkin bilimsel bir sonuç gösterilmiyor.",
    routeDetailUnavailable: "Rota ayrıntısı kullanılamıyor",
    routeDetailUnavailableBody: "Kapsam kaydı korunur; rota ayrıntısının yüklenememesi kaynak veya rota yokluğu olarak yorumlanmaz.",
    exactIdentity: "Kesin hedef kimliği",
    targetMolecule: "Hedef molekül",
    targetParent: "Hedef ana molekül",
    targetForm: "Hedef kimyasal form",
    routes: "Rota alternatifi",
    selectedRoute: "Seçili rota",
    startingMaterial: "Başlangıç materyali",
    targetIdentity: "Hedef kimliği",
    stepCount: "Gösterilen basamak",
    completeness: "Tamamlanma durumu",
    sourceType: "Kaynak türü",
    sourceYear: "Kaynak yılı",
    unresolvedYear: "Çözümlenmedi",
    resolvedSteps: "Gösterilebilir segment",
    gaps: "Açık boşluk",
    review: "Bilimsel inceleme",
    pending: "Uzman incelemesi bekliyor",
    candidateBody: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi.",
    noneBody: "Kaydedilen araştırma kapsamında destekleyici kaynak çözümlenmedi.",
    publicDraft: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR",
    compactPublicDraft: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR",
    notVerified: "Reviewed veya verified değildir. Uygulanabilirlik ve eksiksizlik doğrulanmamıştır.",
    assuranceBoundary: "Doğruluk, eksiksizlik, uygulanabilirlik ve yeniden üretilebilirlik uzman tarafından doğrulanmamıştır.",
    exactTarget3d: "Kesin kimlik kapısından geçen hesaplanmış hedef 3B konformeri",
    target3dBoundary: "Bu hesaplanmış 3B görünüm exact hedef kimliğine aittir; deneysel, kristal veya biyolojik olarak etkin konformasyon değildir.",
    target2dOnly: "Kesin hedefin kaynaklı 2B kaydı",
    target2dBoundary: "Bu hedef için serialized kimlik ve provenance kapılarından geçen hesaplanmış 3B varlık kabul edilmedi. Yalnız exact kimlikli 2B kayıt gösterilir; bu, bir konformerin var olmadığı iddiası değildir.",
    openSpatial: "Molekülü 3B odakta aç",
    routePicker: "Kaynak segmenti alternatifleri",
    route: "Taslak alternatif",
    stepPicker: "Rota basamakları",
    segment: "Kaynak segmenti",
    sourceOrder: "Kaynak reaksiyon sırası çözümlenmedi",
    teachingOrder: "Öğrenme görünümü sırası",
    inputs: "Kaynak girdileri",
    output: "Kaynak çıktısı",
    unresolvedTransformation: "Segment sırası, reaksiyon sınıfı ve bağ değişimleri henüz çözümlenmedi.",
    explicitGap: "Üst-akış boşluğu açık bırakıldı",
    reactionClass: "Reaksiyon sınıfı",
    routeType: "Rota türü",
    evidenceState: "Kanıt durumu",
    unresolvedStatus: "Çözümleme durumu",
    whatChanged: "Bu adımda ne değişti?",
    formedBond: "Oluşan bağ",
    brokenBond: "Kırılan bağ",
    changedGroup: "Değişen fonksiyonel grup",
    atomContinuity: "Atom sürekliliği",
    stereoConsequence: "Stereokimyasal sonuç",
    inspectProduct3d: "Bu ürünü 3B’de incele",
    conformerUnavailable: "3B konformer kullanılamıyor",
    computedProduct3dBoundary: "Hesaplanmış konformerdir; deneysel, kristal veya biyolojik olarak etkin konformasyon değildir.",
    routeBoundaryMaterial3d: "Hesaplanmış 3B konformer · exact kimlikli rota-sınırı materyali · ara ürün rolü uzman incelemesi bekliyor",
    stepOutputExplorer: "Basamak çıktısı 2B ↔ 3B odağı",
    stepOutput2dOnly: "Bu basamak çıktısı için provenance kapısından geçen exact kimlikli hesaplanmış 3B konformer yok; yalnız bağımsız 2B çizim gösterilir.",
    learningCheck: "Öğrenme görevi",
    learningTaskUnavailable: "Henüz yapılandırılmış bir öğrenme görevi üretilemez.",
    whatHappenedQuestion: "Ne oldu?",
    whyQuestion: "Neden gerçekleşti?",
    reactionFamilyQuestion: "Hangi reaksiyon ailesi?",
    targetFragmentQuestion: "Hangi hedef fragment oluştu veya taşındı?",
    advancedMechanism: "İleri Mekanizma",
    advancedMechanismUnavailable: "İleri mekanizma görünümü için molekül-özel veya kaynak destekli mekanizma kanıtı çözümlenmedi.",
    openAdvancedMechanism: "İleri mekanizmayı aç",
    closeAdvancedMechanism: "İleri mekanizmayı kapat",
    mechanismAssurance: "Mekanizma güvence sınıfı",
    targetContext: "Exact hedef 2B ↔ 3B bağlamı",
    intermediate3dMissing: "Bu materyal kimliği için kayıtlı provenance kapısından geçen kesin eşleşmeli hesaplanmış 3B varlık yoktur. Bu, bir konformerin var olmadığı iddiası değildir; bağımsız 2B çizim gösterilir.",
    structureAssetsLoading: "Exact 3B varlık manifesti yükleniyor; konformer varlığı hakkında henüz bilimsel sonuç gösterilmez.",
    structureAssetsTransportUnavailable: "3B varlık manifesti taşınamadı. Rota ayrıntıları korunur; bir konformerin var olup olmadığı hakkında sonuç çıkarılmaz.",
    structureAssetsProvenanceUnavailable: "3B varlık manifesti snapshot veya provenance kapısından geçemedi. Rota ayrıntıları korunur; bir konformerin var olup olmadığı hakkında sonuç çıkarılmaz.",
    structureAssetsPartial: "Bazı kesin rota-sınırı kimlikleri için hesaplanmış 3B varlık kayıtlıdır; diğerleri için yalnız bağımsız 2B çizim gösterilir.",
    mechanismNotResolved: "MEKANİZMA ÇÖZÜMLENMEDİ",
    mechanismBoundary: "Kaynak destekli bir dönüşüm segmenti tek başına elektron-itme mekanizmasını kanıtlamaz.",
    reactionFamily: "Reaksiyon ailesi",
    nucleophile: "Nükleofil",
    electrophile: "Elektrofil",
    leavingGroup: "Ayrılan grup",
    bondChange: "Bağ oluşumu / kırılması",
    functionalChange: "Fonksiyonel grup dönüşümü",
    stereoOutcome: "Rejiyo / stereokimyasal sonuç",
    unresolved: "Çözümlenmedi",
    misconception: "Yaygın yanılgı",
    misconceptionBody: "Bir reaktan ve ürün çiftinin bulunması, belirli bir mekanizmanın kaynakta raporlandığı anlamına gelmez.",
    exactLocator: "Kesin kaynak konumu",
    openSource: "ORD kaydını aç",
    license: "Lisans / yeniden kullanım",
    retrieved: "Kayıt tarihi",
    sourceScope: "Kaynak desteği",
    identityScope: "Kimlik kapsamı",
    formScope: "Form kapsamı",
    noReferences: "Bu kimlik için gösterilebilir exact kaynak konumu henüz çözümlenmedi.",
    technicalIds: "Teknik kayıt kimlikleri",
    rawIdentity: "Katalog kimliği",
    noRouteTitle: "Rota grafiği henüz kurulamadı",
  },
  en: {
    eyebrow: "3D & Synthesis Learning",
    title: "Structure and evidence in one learning studio.",
    boundary: "Non-operational teaching view · expert review pending",
    overview: "Overview",
    explorer: "3D Explorer",
    steps: "Synthesis Steps",
    mechanism: "Mechanism",
    references: "References",
    student: "Studio Student View",
    reference: "Studio Reference View",
    quality: "Route quality class",
    complete: "Complete learning route",
    substantive: "Connected substantive partial route",
    fragment: "Source-backed fragment route",
    candidate: "Candidate sources only",
    none: "No supporting source resolved",
    coverageUnavailable: "Synthesis coverage unavailable",
    coverageUnavailableBody: "The synthesis coverage record could not be loaded. No scientific conclusion about source availability is shown.",
    routeDetailUnavailable: "Route detail unavailable",
    routeDetailUnavailableBody: "The coverage record is preserved; failure to load route detail is not treated as evidence that no source or route exists.",
    exactIdentity: "Exact target identity",
    targetMolecule: "Target molecule",
    targetParent: "Target parent molecule",
    targetForm: "Target chemical form",
    routes: "Route alternatives",
    selectedRoute: "Selected route",
    startingMaterial: "Starting material",
    targetIdentity: "Target identity",
    stepCount: "Displayed steps",
    completeness: "Completeness",
    sourceType: "Source type",
    sourceYear: "Source year",
    unresolvedYear: "Unresolved",
    resolvedSteps: "Displayable segments",
    gaps: "Explicit gaps",
    review: "Scientific review",
    pending: "Expert review pending",
    candidateBody: "Sources identified; route extraction not yet resolved.",
    noneBody: "No supporting source was resolved in the recorded search scope.",
    publicDraft: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
    compactPublicDraft: "EVIDENCE-LINKED DRAFT — EXPERT REVIEW PENDING",
    notVerified: "This is not reviewed or verified. Applicability and completeness remain unverified.",
    assuranceBoundary: "Accuracy, completeness, applicability, and reproducibility have not been expert-verified.",
    exactTarget3d: "Computed target 3D conformer admitted by the exact-identity gate",
    target3dBoundary: "This computed 3D view belongs to the exact target identity; it is not an experimental, crystal, or biologically active conformation.",
    target2dOnly: "Sourced 2D record of the exact target",
    target2dBoundary: "No computed 3D asset passed the serialized-identity and provenance gates for this target. Only the exact-identity 2D record is shown; this is not a claim that no conformer exists.",
    openSpatial: "Open molecule in 3D focus",
    routePicker: "Source-segment alternatives",
    route: "Draft alternative",
    stepPicker: "Route steps",
    segment: "Source segment",
    sourceOrder: "Source reaction order unresolved",
    teachingOrder: "Learning-view position",
    inputs: "Source inputs",
    output: "Source output",
    unresolvedTransformation: "Segment order, reaction class, and bond changes remain unresolved.",
    explicitGap: "Upstream gap remains explicit",
    reactionClass: "Reaction class",
    routeType: "Route type",
    evidenceState: "Evidence state",
    unresolvedStatus: "Resolution state",
    whatChanged: "What changed in this step?",
    formedBond: "Formed bond",
    brokenBond: "Broken bond",
    changedGroup: "Changed functional group",
    atomContinuity: "Atom continuity",
    stereoConsequence: "Stereochemical consequence",
    inspectProduct3d: "Inspect this product in 3D",
    conformerUnavailable: "3D conformer unavailable",
    computedProduct3dBoundary: "This is a computed conformer, not an experimental, crystal, or biologically active conformation.",
    routeBoundaryMaterial3d: "Computed 3D conformer · exact-identity route-boundary material · intermediate role pending review",
    stepOutputExplorer: "Step-output 2D ↔ 3D focus",
    stepOutput2dOnly: "No exact-identity computed 3D conformer passed the provenance gate for this step output; only the independent 2D redraw is shown.",
    learningCheck: "Learning check",
    learningTaskUnavailable: "No structured learning task can be generated yet.",
    whatHappenedQuestion: "What happened?",
    whyQuestion: "Why did it happen?",
    reactionFamilyQuestion: "Which reaction family?",
    targetFragmentQuestion: "Which target fragment was formed or carried forward?",
    advancedMechanism: "Advanced Mechanism",
    advancedMechanismUnavailable: "No molecule-specific or source-backed mechanism evidence has been resolved for an advanced mechanism view.",
    openAdvancedMechanism: "Open advanced mechanism",
    closeAdvancedMechanism: "Close advanced mechanism",
    mechanismAssurance: "Mechanism assurance class",
    targetContext: "Exact-target 2D ↔ 3D context",
    intermediate3dMissing: "No exact computed 3D asset passed the recorded provenance gate for this material identity. This is not a claim that no conformer exists; the independent 2D redraw is shown.",
    structureAssetsLoading: "The exact 3D asset manifest is loading; no scientific conclusion about conformer existence is shown yet.",
    structureAssetsTransportUnavailable: "The 3D asset manifest could not be transported. Route detail remains available; no conclusion is made about whether a conformer exists.",
    structureAssetsProvenanceUnavailable: "The 3D asset manifest failed its snapshot or provenance gate. Route detail remains available; no conclusion is made about whether a conformer exists.",
    structureAssetsPartial: "Computed 3D assets are recorded for some exact route-boundary identities; the remaining identities stay on independent 2D redraws.",
    mechanismNotResolved: "MECHANISM NOT RESOLVED",
    mechanismBoundary: "A source-backed transformation segment does not by itself establish an electron-pushing mechanism.",
    reactionFamily: "Reaction family",
    nucleophile: "Nucleophile",
    electrophile: "Electrophile",
    leavingGroup: "Leaving group",
    bondChange: "Bond formation / cleavage",
    functionalChange: "Functional-group transformation",
    stereoOutcome: "Regio / stereochemical outcome",
    unresolved: "Unresolved",
    misconception: "Common misconception",
    misconceptionBody: "Finding a reactant/product pair does not mean a particular mechanism was reported by the source.",
    exactLocator: "Exact source locator",
    openSource: "Open ORD record",
    license: "License / reuse",
    retrieved: "Recorded",
    sourceScope: "Source support",
    identityScope: "Identity scope",
    formScope: "Form scope",
    noReferences: "No displayable exact source locator has yet been resolved for this identity.",
    technicalIds: "Technical record identifiers",
    rawIdentity: "Catalog identity",
    noRouteTitle: "A route graph has not yet been assembled",
  },
} as const;

const qualityLabel = (
  quality: ReturnType<typeof createSynthesisLearningStudioModel>["quality"],
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (quality === "complete_learning_route") return labels.complete;
  if (quality === "substantive_partial_route") return labels.substantive;
  if (quality === "fragmentary_route") return labels.fragment;
  if (quality === "candidate_only") return labels.candidate;
  if (quality === "coverage_unavailable") return labels.coverageUnavailable;
  return labels.none;
};

const targetLabel = (
  target: ReturnType<typeof createSynthesisLearningStudioModel>["targetTerminology"],
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (target === "target_parent_molecule") return labels.targetParent;
  if (target === "target_chemical_form") return labels.targetForm;
  return labels.targetMolecule;
};

const routeName = (route: SynthesisLearningRoute, index: number, locale: Locale) =>
  `${copy[locale].route} ${index + 1}`;

const structureAssetAvailabilityBody = (
  availability: SynthesisLearningStructureAssetAvailability,
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (availability.state === "loading") return labels.structureAssetsLoading;
  if (availability.state === "transport_unavailable") {
    return labels.structureAssetsTransportUnavailable;
  }
  if (availability.state === "provenance_unavailable") {
    return labels.structureAssetsProvenanceUnavailable;
  }
  if (availability.state === "partially_available") {
    return labels.structureAssetsPartial;
  }
  return labels.intermediate3dMissing;
};

const materialStructureAssetAvailabilityBody = (
  availability: SynthesisLearningStructureAssetAvailability,
  locale: Locale,
): string => {
  if (
    availability.state === "loading" ||
    availability.state === "transport_unavailable" ||
    availability.state === "provenance_unavailable"
  ) {
    return structureAssetAvailabilityBody(availability, locale);
  }
  return copy[locale].intermediate3dMissing;
};

function moveTab(
  event: KeyboardEvent<HTMLButtonElement>,
  ids: readonly string[],
  currentId: string,
  select: (id: string) => void,
) {
  const currentIndex = Math.max(0, ids.indexOf(currentId));
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % ids.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + ids.length) % ids.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = ids.length - 1;
  else return;
  event.preventDefault();
  select(ids[nextIndex] ?? currentId);
  const parent = event.currentTarget.parentElement;
  window.requestAnimationFrame(() => {
    parent?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  });
}

function MaterialCard({
  material,
  heading,
  locale,
  structureAssetAvailability,
}: {
  readonly material: SynthesisLearningMaterial;
  readonly heading: string;
  readonly locale: Locale;
  readonly structureAssetAvailability:
    SynthesisLearningStructureAssetAvailability;
}) {
  return (
    <article className={styles.materialCard} data-material-role={material.role}>
      <span>{heading}</span>
      <SmilesStructure
        className={styles.smiles}
        smiles={material.smiles}
        label={`${heading}: ${material.label}`}
      />
      <strong>{material.label}</strong>
      <small>{material.inchiKey}</small>
      {material.threeD === "unavailable" ? (
        <p>{materialStructureAssetAvailabilityBody(
          structureAssetAvailability,
          locale,
        )}</p>
      ) : null}
    </article>
  );
}

function TargetViewer({
  selection,
  structureAssets,
  locale,
  className,
}: {
  readonly selection: SynthesisCatalogSelection;
  readonly structureAssets: SynthesisLearningStructureBundle;
  readonly locale: Locale;
  readonly className?: string;
}) {
  const labels = copy[locale];
  const catalogTwoD = structureAssets.twoD.representation === "catalog_2d_record"
    ? structureAssets.twoD
    : null;
  const threeD = structureAssets.threeD;
  const hasAdmittedThreeD = threeD.status === "available" && Boolean(catalogTwoD);
  return (
    <div
      className={[styles.targetViewer, className].filter(Boolean).join(" ")}
      data-target-3d-state={hasAdmittedThreeD ? "available" : "2d_only"}
      data-target-3d-reason={threeD.status === "unavailable"
        ? threeD.reason
        : "exact_computed_conformer"}
    >
      <div className={styles.targetViewerIntro}>
        <span>{labels.targetContext}</span>
        <strong>{hasAdmittedThreeD
          ? labels.exactTarget3d
          : labels.target2dOnly}</strong>
        <p>{hasAdmittedThreeD
          ? labels.target3dBoundary
          : labels.target2dBoundary}</p>
      </div>
      {catalogTwoD ? (
        <MoleculeViewer
          className={styles.viewer}
          structureUrl={threeD.status === "available" ? threeD.publicPath : ""}
          twoDStructureUrl={catalogTwoD.publicPath}
          moleculeName={selection.preferredName}
          expectedPubChemCid={catalogTwoD.identity.pubChemCid}
          sourceLabel={threeD.status === "available"
            ? threeD.provenance.generator
            : labels.conformerUnavailable}
          originLabel={threeD.status === "available"
            ? threeD.origin
            : "computed-3d-conformer-unavailable"}
          sourceHref={threeD.status === "available" ? threeD.sourceUrl : undefined}
          twoDSourceLabel="PubChem 2D SDF"
          twoDOriginLabel={catalogTwoD.origin}
          twoDSourceHref={catalogTwoD.sourceUrl}
          initialDimension="2d"
          showHydrogensInitially={false}
        />
      ) : (
        <div className={styles.stepOutput2dOnly}>
          <SmilesStructure
            className={styles.smiles}
            smiles={selection.isomericSmiles ?? selection.canonicalSmiles}
            label={`${labels.target2dOnly}: ${selection.preferredName}`}
          />
          <strong>{selection.preferredName}</strong>
          <code>{selection.inchiKey}</code>
          <p>{labels.target2dBoundary}</p>
        </div>
      )}
    </div>
  );
}

function StepOutputExplorer({
  step,
  materialId,
  locale,
  structureAssetAvailability,
}: {
  readonly step: SynthesisLearningStep;
  readonly materialId: string;
  readonly locale: Locale;
  readonly structureAssetAvailability:
    SynthesisLearningStructureAssetAvailability;
}) {
  const labels = copy[locale];
  const material = step.outputs.find((output) => output.id === materialId) ?? null;
  const gate = getSynthesisStep3DGate(step, materialId);
  const catalogTwoD = material?.structureAssets.twoD.representation === "catalog_2d_record"
    ? material.structureAssets.twoD
    : null;
  const threeDAllowed = gate.state === "allowed" && Boolean(catalogTwoD);

  return (
    <div
      className={styles.stepOutputExplorer}
      data-explorer-focus="step-output"
      data-step-output-3d-state={threeDAllowed ? "allowed" : "2d_only"}
      data-step-output-3d-reason={gate.reason}
      data-target-fallback-used="false"
      data-step-output-material-role={material?.role ?? "unresolved"}
    >
      <div className={styles.targetViewerIntro}>
        <span>{labels.stepOutputExplorer}</span>
        <strong>{threeDAllowed
          ? material?.role === "route_intermediate"
            ? labels.routeBoundaryMaterial3d
            : labels.exactTarget3d
          : labels.conformerUnavailable}</strong>
        <p>{threeDAllowed
          ? material?.role === "route_intermediate"
            ? labels.computedProduct3dBoundary
            : `${labels.target3dBoundary} ${labels.computedProduct3dBoundary}`
          : material
            ? materialStructureAssetAvailabilityBody(
                structureAssetAvailability,
                locale,
              )
            : structureAssetAvailabilityBody(
                structureAssetAvailability,
                locale,
              )}</p>
      </div>
      {threeDAllowed && gate.state === "allowed" && catalogTwoD ? (
        <MoleculeViewer
          className={styles.viewer}
          structureUrl={gate.asset.publicPath}
          twoDStructureUrl={catalogTwoD.publicPath}
          moleculeName={material?.label ?? gate.inchiKey}
          expectedPubChemCid={gate.asset.identity.pubChemCid}
          sourceLabel={gate.asset.provenance.generator}
          originLabel={gate.asset.origin}
          sourceHref={gate.asset.sourceUrl}
          twoDSourceLabel="PubChem 2D SDF"
          twoDOriginLabel={catalogTwoD.origin}
          twoDSourceHref={catalogTwoD.sourceUrl}
          initialDimension="3d"
          showHydrogensInitially={false}
        />
      ) : material ? (
        <div className={styles.stepOutput2dOnly}>
          <SmilesStructure
            className={styles.smiles}
            smiles={material.smiles}
            label={`${labels.output}: ${material.label}`}
          />
          <strong>{material.label}</strong>
          <code>{material.inchiKey}</code>
          <p>{materialStructureAssetAvailabilityBody(
            structureAssetAvailability,
            locale,
          )}</p>
        </div>
      ) : (
        <div className={styles.stepOutput2dOnly}>
          <strong>{labels.conformerUnavailable}</strong>
          <p>{structureAssetAvailabilityBody(
            structureAssetAvailability,
            locale,
          )}</p>
        </div>
      )}
    </div>
  );
}

function StepPanel({
  id,
  labelledBy,
  step,
  route,
  selection,
  targetStructureAssets,
  locale,
  structureAssetAvailability,
  onOpenOutputInExplorer,
}: {
  readonly id: string;
  readonly labelledBy: string;
  readonly step: SynthesisLearningStep;
  readonly route: SynthesisLearningRoute;
  readonly selection: SynthesisCatalogSelection;
  readonly targetStructureAssets: SynthesisLearningStructureBundle;
  readonly locale: Locale;
  readonly structureAssetAvailability:
    SynthesisLearningStructureAssetAvailability;
  readonly onOpenOutputInExplorer: (materialId: string) => void;
}) {
  const labels = copy[locale];
  const [advancedMechanismOpen, setAdvancedMechanismOpen] = useState(false);
  const output3dGates = step.outputs.map((material) => ({
    material,
    gate: getSynthesisStep3DGate(step, material.id),
  }));
  const allowedOutput = output3dGates.find(({ gate }) => gate.state === "allowed") ?? null;
  const admittedFactIds = new Set(step.quizGate.admittedFactIds);
  const admittedFacts = step.structuredFacts.filter((fact) => admittedFactIds.has(fact.id));
  const factValue = (...kinds: readonly SynthesisLearningStep["structuredFacts"][number]["kind"][]) =>
    admittedFacts.find((fact) => kinds.includes(fact.kind))?.value ?? labels.unresolved;
  const learningTaskState = step.quizGate.state === "eligible" && admittedFacts.length > 0
    ? "eligible"
    : "unavailable";
  const advancedMechanismEligible = step.mechanism.assurance !== "mechanism_not_resolved";
  return (
    <section
      id={id}
      className={styles.stepPanel}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-synthesis-step-panel={step.id}
      data-selected="true"
      data-source-reaction-order="unresolved"
    >
      <header className={styles.stepHeader}>
        <div>
          <span>{labels.teachingOrder} {step.displayOrder}</span>
          <h3>{labels.segment} {String(step.displayOrder).padStart(2, "0")}</h3>
        </div>
        <strong>{labels.sourceOrder}</strong>
      </header>
      <div className={styles.reactionCanvas}>
        <div className={styles.materials}>
          {step.inputs.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              heading={labels.inputs}
              locale={locale}
              structureAssetAvailability={structureAssetAvailability}
            />
          ))}
        </div>
        <div className={styles.reactionArrow} aria-label={labels.unresolvedTransformation}>
          <span aria-hidden="true">→</span>
          <strong>{labels.unresolvedTransformation}</strong>
        </div>
        <div className={styles.materials}>
          {step.outputs.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              heading={labels.output}
              locale={locale}
              structureAssetAvailability={structureAssetAvailability}
            />
          ))}
        </div>
      </div>
      <dl className={styles.stepFacts}>
        <div><dt>{labels.reactionClass}</dt><dd>{step.reactionClass}</dd></div>
        <div><dt>{labels.routeType}</dt><dd>{route.routeType.replaceAll("_", " ")}</dd></div>
        <div><dt>{labels.evidenceState}</dt><dd>{step.evidenceState.replaceAll("_", " ")}</dd></div>
        <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
        <div><dt>{labels.unresolvedStatus}</dt><dd>{labels.unresolved}</dd></div>
      </dl>
      <section className={styles.changeLedger}>
        <header>
          <h4>{labels.whatChanged}</h4>
          <button
            type="button"
            data-step-output-3d-state={allowedOutput?.gate.state ?? "2d_only"}
            data-step-output-3d-reason={allowedOutput?.gate.reason
              ?? output3dGates[0]?.gate.reason
              ?? "no_step_output"}
            disabled={allowedOutput?.gate.state !== "allowed"}
            onClick={() => {
              if (!allowedOutput || allowedOutput.gate.state !== "allowed") return;
              onOpenOutputInExplorer(allowedOutput.material.id);
            }}
          >
            {allowedOutput?.gate.state !== "allowed"
              ? labels.conformerUnavailable
              : labels.inspectProduct3d}
          </button>
        </header>
        <dl>
          {[
            labels.formedBond,
            labels.brokenBond,
            labels.changedGroup,
            labels.atomContinuity,
            labels.stereoConsequence,
          ].map((label) => <div key={label}><dt>{label}</dt><dd>{labels.unresolved}</dd></div>)}
        </dl>
      </section>
      <section
        className={styles.learningCheck}
        data-learning-task-state={learningTaskState}
        data-llm-chemistry-fact-generation="false"
      >
        <header>
          <span>{labels.learningCheck}</span>
          <strong>{learningTaskState === "unavailable"
            ? labels.learningTaskUnavailable
            : labels.learningCheck}</strong>
        </header>
        <dl>
          <div><dt>{labels.whatHappenedQuestion}</dt><dd>{factValue("changed_functional_group", "formed_bond")}</dd></div>
          <div><dt>{labels.whyQuestion}</dt><dd>{labels.unresolved}</dd></div>
          <div><dt>{labels.reactionFamilyQuestion}</dt><dd>{factValue("reaction_class")}</dd></div>
          <div><dt>{labels.targetFragmentQuestion}</dt><dd>{factValue("scaffold_contribution", "target_form_relation")}</dd></div>
        </dl>
      </section>
      <aside
        className={styles.advancedMechanism}
        data-mechanism-state={step.mechanism.assurance === "mechanism_not_resolved"
          ? "unresolved"
          : "available"}
        data-advanced-mechanism-state={advancedMechanismEligible ? "eligible" : "unavailable"}
        data-mechanism-assurance={step.mechanism.assurance}
        data-mechanism-visualization-state={step.mechanism.visualizationState}
      >
        <div>
          <strong>{labels.advancedMechanism}</strong>
          <p>{advancedMechanismEligible
            ? labels.mechanismBoundary
            : labels.advancedMechanismUnavailable}</p>
        </div>
        <button
          type="button"
          disabled={!advancedMechanismEligible}
          aria-expanded={advancedMechanismEligible && advancedMechanismOpen}
          onClick={() => setAdvancedMechanismOpen((open) => !open)}
        >
          {advancedMechanismOpen
            ? labels.closeAdvancedMechanism
            : labels.openAdvancedMechanism}
        </button>
        {advancedMechanismEligible && advancedMechanismOpen ? (
          <dl>
            <div><dt>{labels.mechanismAssurance}</dt><dd>{step.mechanism.assurance}</dd></div>
            <div><dt>{labels.reactionFamily}</dt><dd>{step.mechanism.reactionFamily ?? labels.unresolved}</dd></div>
            <div><dt>{labels.nucleophile}</dt><dd>{step.mechanism.nucleophile ?? labels.unresolved}</dd></div>
            <div><dt>{labels.electrophile}</dt><dd>{step.mechanism.electrophile ?? labels.unresolved}</dd></div>
            <div><dt>{labels.leavingGroup}</dt><dd>{step.mechanism.leavingGroup ?? labels.unresolved}</dd></div>
            <div><dt>{labels.stereoOutcome}</dt><dd>{step.mechanism.regioOrStereochemicalOutcome ?? labels.unresolved}</dd></div>
          </dl>
        ) : null}
      </aside>
      <TargetViewer
        selection={selection}
        structureAssets={targetStructureAssets}
        locale={locale}
        className={styles.stepTargetViewer}
      />
      <footer className={styles.inlineReference}>
        <div>
          <span>{labels.exactLocator}</span>
          <code>{step.reference.locator}</code>
        </div>
        <a href={step.reference.url} target="_blank" rel="noreferrer">
          {labels.openSource} <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </section>
  );
}

export function SynthesisLearningStudio({
  selection,
  graphs,
  presentationMode = "student",
  onOpenMoleculeFocus,
  structureAssetsByInchiKey,
  variant = "full",
  routeDetailLoadState = "ready",
  structureAssetAvailability =
    SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
}: SynthesisLearningStudioProps) {
  const { locale } = useI18n();
  const accessibilityId = useId().replaceAll(":", "");
  const labels = copy[locale];
  const model = useMemo(
    () => createSynthesisLearningStudioModel(selection, graphs, {
      structureAssetsByInchiKey,
    }),
    [graphs, selection, structureAssetsByInchiKey],
  );
  const [activeTab, setActiveTab] = useState<StudioTab>(
    model.routes.length > 0 ? "steps" : "overview",
  );
  const [mode, setMode] = useState<StudioMode>(
    presentationMode === "reviewer" ? "reference" : "student",
  );
  const [routeId, setRouteId] = useState(model.routes[0]?.id ?? "");
  const selectedRoute = model.routes.find((route) => route.id === routeId) ?? model.routes[0] ?? null;
  const [stepId, setStepId] = useState(selectedRoute?.steps[0]?.id ?? "");
  const [explorerFocus, setExplorerFocus] = useState<StudioExplorerFocus>({ kind: "target" });
  const explorerTabRef = useRef<HTMLButtonElement>(null);
  const selectedStep = selectedRoute?.steps.find((step) => step.id === stepId)
    ?? selectedRoute?.steps[0]
    ?? null;
  const selectedRouteIndex = selectedRoute ? model.routes.indexOf(selectedRoute) : -1;
  const selectedStepIndex = selectedRoute && selectedStep
    ? selectedRoute.steps.indexOf(selectedStep)
    : -1;
  const routePanelId = `${accessibilityId}-route-panel`;
  const routeTabId = (index: number) => `${accessibilityId}-route-tab-${index}`;
  const stepPanelId = `${accessibilityId}-step-panel`;
  const stepTabId = (index: number) => `${accessibilityId}-step-tab-${index}`;
  const explorerStep = explorerFocus.kind === "step_output"
    ? model.routes.flatMap((route) => route.steps).find(
        (step) => step.id === explorerFocus.stepId,
      ) ?? null
    : null;

  const focusStepOutput = (step: SynthesisLearningStep | undefined) => {
    if (!step || explorerFocus.kind !== "step_output") return;
    setExplorerFocus({
      kind: "step_output",
      stepId: step.id,
      materialId: step.outputs[0]?.id ?? "",
    });
  };

  const selectRoute = (nextRouteId: string) => {
    const nextRoute = model.routes.find((route) => route.id === nextRouteId);
    const nextStep = nextRoute?.steps[0];
    setRouteId(nextRouteId);
    setStepId(nextStep?.id ?? "");
    focusStepOutput(nextStep);
  };

  const selectStep = (nextStepId: string) => {
    const nextStep = selectedRoute?.steps.find((step) => step.id === nextStepId);
    setStepId(nextStepId);
    focusStepOutput(nextStep);
  };

  const references = useMemo(() => {
    const byLocator = new Map<string, SynthesisLearningStep["reference"]>();
    for (const route of model.routes) {
      for (const step of route.steps) byLocator.set(step.reference.locator, step.reference);
    }
    return [...byLocator.values()];
  }, [model.routes]);
  const tabs: readonly { readonly id: StudioTab; readonly label: string }[] = [
    { id: "overview", label: labels.overview },
    { id: "explorer", label: labels.explorer },
    { id: "steps", label: labels.steps },
    { id: "mechanism", label: labels.mechanism },
    { id: "references", label: labels.references },
  ];
  const coverageUnavailable = selection.coverageLoadState !== "ready" ||
    model.quality === "coverage_unavailable";
  const routeDetailUnavailable = routeDetailLoadState === "unavailable";
  const statusTitle = routeDetailUnavailable
    ? labels.routeDetailUnavailable
    : coverageUnavailable
      ? labels.coverageUnavailable
      : labels.noRouteTitle;
  const statusBody = routeDetailUnavailable
    ? labels.routeDetailUnavailableBody
    : coverageUnavailable
      ? labels.coverageUnavailableBody
      : model.quality === "candidate_only"
        ? labels.candidateBody
        : labels.noneBody;

  return (
    <section
      className={`${styles.studio} ${variant === "compact" ? styles.compact : ""}`}
      data-synthesis-learning-studio="true"
      data-synthesis-learning-studio-variant={variant}
      data-synthesis-catalog-coverage={selection.catalogEntityId}
      data-coverage-load-state={selection.coverageLoadState}
      data-coverage-surface-state={coverageUnavailable ? "coverage_unavailable" : model.surfaceState}
      data-route-detail-load-state={routeDetailLoadState}
      data-structure-asset-availability={structureAssetAvailability.state}
      data-structure-asset-availability-reason={
        structureAssetAvailability.reason
      }
      data-global-conformer-absence-claimed="false"
      data-route-quality={routeDetailUnavailable
        ? "route_detail_unavailable"
        : coverageUnavailable
          ? "coverage_unavailable"
          : model.quality}
      data-total-unresolved-gap-count={model.unresolvedGapCount}
      data-computed-3d-identity-count={model.capabilityCounts.materialsWithCatalogComputed3D}
      data-source-supported-mechanism-count={model.capabilityCounts.sourceSupportedMechanisms}
      data-reaction-class-educational-mechanism-count={model.capabilityCounts.reactionClassEducationalMechanisms}
      data-mapped-molecule-specific-mechanism-count={model.capabilityCounts.mappedMoleculeSpecificMechanisms}
      data-structured-learning-task-count={model.capabilityCounts.structuredLearningTasks}
      data-review-state={model.reviewStatus}
      data-verified-scientific-claim="false"
      data-operational-details="excluded"
    >
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{labels.eyebrow}</span>
          <h2>{labels.title}</h2>
          <p>{labels.boundary}</p>
          <div className={styles.heroIdentity}>
            <span>{labels.exactIdentity}</span>
            <strong>{selection.preferredName}</strong>
            <code>{selection.inchiKey}</code>
          </div>
        </div>
        <div className={styles.modeSwitch} role="group" aria-label={labels.reference}>
          <button type="button" aria-pressed={mode === "student"} onClick={() => setMode("student")}>{labels.student}</button>
          <button type="button" aria-pressed={mode === "reference"} onClick={() => setMode("reference")}>{labels.reference}</button>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={labels.eyebrow}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`synthesis-studio-tab-${tab.id}`}
            ref={tab.id === "explorer" ? explorerTabRef : undefined}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`synthesis-studio-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => moveTab(event, tabs.map((item) => item.id), activeTab, (id) => setActiveTab(id as StudioTab))}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id="synthesis-studio-panel-overview"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-overview"
        hidden={activeTab !== "overview"}
      >
        <div className={styles.overviewGrid}>
          <article className={styles.identityCard}>
            <span>{targetLabel(model.targetTerminology, locale)}</span>
            <strong className={styles.identityName}>{selection.preferredName}</strong>
            <p>{selection.molecularFormula} · CID {selection.pubChemCid}</p>
            <dl>
              <div><dt>{labels.exactIdentity}</dt><dd><code>{selection.inchiKey}</code></dd></div>
              <div><dt>{labels.formScope}</dt><dd>{model.targetIdentity.chemicalFormKind}</dd></div>
            </dl>
            {mode === "reference" ? (
              <details className={styles.technical} open>
                <summary>{labels.technicalIds}</summary>
                <code>{labels.rawIdentity}: {selection.catalogEntityId}</code>
              </details>
            ) : null}
          </article>
          <article className={styles.qualityCard}>
            <span>{labels.quality}</span>
            <h3>{routeDetailUnavailable
              ? labels.routeDetailUnavailable
              : coverageUnavailable
                ? labels.coverageUnavailable
                : qualityLabel(model.quality, locale)}</h3>
            {model.routes.length > 0 && !routeDetailUnavailable ? (
              <p><strong>{variant === "compact" ? labels.compactPublicDraft : labels.publicDraft}</strong><br />{labels.notVerified}</p>
            ) : (
              <p><strong>{statusTitle}</strong><br />{statusBody}</p>
            )}
            <p>{labels.assuranceBoundary}</p>
            {structureAssetAvailability.state === "loading" ||
            structureAssetAvailability.state === "partially_available" ||
            structureAssetAvailability.state === "scientifically_absent" ||
            structureAssetAvailability.state === "transport_unavailable" ||
            structureAssetAvailability.state === "provenance_unavailable" ? (
              <p
                data-structure-asset-availability-message={
                  structureAssetAvailability.state
                }
              >
                {structureAssetAvailabilityBody(
                  structureAssetAvailability,
                  locale,
                )}
              </p>
            ) : null}
            <dl>
              <div><dt>{labels.routes}</dt><dd>{model.knownRouteCount}</dd></div>
              <div><dt>{labels.selectedRoute}</dt><dd>{selectedRoute ? routeName(selectedRoute, model.routes.indexOf(selectedRoute), locale) : labels.unresolved}</dd></div>
              <div><dt>{labels.resolvedSteps}</dt><dd>{model.resolvedStepCount}</dd></div>
              <div><dt>{labels.gaps}</dt><dd>{model.unresolvedGapCount}</dd></div>
              <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
            </dl>
            {references[0] ? (
              <a href={references[0].url} target="_blank" rel="noreferrer">
                {labels.openSource} <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </article>
        </div>
      </section>

      <section
        id="synthesis-studio-panel-explorer"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-explorer"
        hidden={activeTab !== "explorer"}
      >
        {explorerFocus.kind === "step_output" ? (
          explorerStep ? (
            <StepOutputExplorer
              step={explorerStep}
              materialId={explorerFocus.materialId}
              locale={locale}
              structureAssetAvailability={structureAssetAvailability}
            />
          ) : (
            <article
              className={styles.emptyState}
              data-explorer-focus="step-output"
              data-step-output-3d-state="2d_only"
              data-target-fallback-used="false"
            >
              <span>{labels.stepOutputExplorer}</span>
              <h3>{labels.conformerUnavailable}</h3>
              <p>{structureAssetAvailabilityBody(
                structureAssetAvailability,
                locale,
              )}</p>
            </article>
          )
        ) : (
          <TargetViewer
            selection={selection}
            structureAssets={model.targetStructureAssets}
            locale={locale}
          />
        )}
      </section>

      <section
        id="synthesis-studio-panel-steps"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-steps"
        hidden={activeTab !== "steps"}
      >
        {selectedRoute ? (
          <>
            <div className={styles.routePicker} role="tablist" aria-label={labels.routePicker}>
              {model.routes.map((route, index) => (
                <button
                  key={route.id}
                  id={routeTabId(index)}
                  type="button"
                  role="tab"
                  aria-controls={routePanelId}
                  data-route-id={route.id}
                  aria-selected={route.id === selectedRoute.id}
                  tabIndex={route.id === selectedRoute.id ? 0 : -1}
                  onClick={() => selectRoute(route.id)}
                  onKeyDown={(event) => moveTab(
                    event,
                    model.routes.map((item) => item.id),
                    selectedRoute.id,
                    selectRoute,
                  )}
                >
                  <strong>{routeName(route, index, locale)}</strong>
                  <span>{route.routeType.replaceAll("_", " ")} · {route.steps.length}</span>
                </button>
              ))}
            </div>
            <section
              id={routePanelId}
              role="tabpanel"
              aria-labelledby={routeTabId(selectedRouteIndex)}
            >
              <dl className={styles.routeFacts}>
                <div><dt>{labels.routeType}</dt><dd>{selectedRoute.routeType.replaceAll("_", " ")}</dd></div>
                <div><dt>{labels.startingMaterial}</dt><dd>{selectedRoute.startingMaterialLabel}</dd></div>
                <div><dt>{labels.targetIdentity}</dt><dd><code>{selection.inchiKey}</code></dd></div>
                <div><dt>{labels.stepCount}</dt><dd>{selectedRoute.steps.length}</dd></div>
                <div><dt>{labels.completeness}</dt><dd>{selectedRoute.completeness.replaceAll("_", " ")}</dd></div>
                <div><dt>{labels.sourceType}</dt><dd>ORD</dd></div>
                <div><dt>{labels.sourceYear}</dt><dd>{selectedRoute.sourceYear ?? labels.unresolvedYear}</dd></div>
                <div><dt>{labels.explicitGap}</dt><dd>{selectedRoute.unresolvedGapCount}</dd></div>
                <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
                <div><dt>{labels.sourceOrder}</dt><dd>{labels.unresolved}</dd></div>
              </dl>
              <div className={styles.stepPicker} role="tablist" aria-label={labels.stepPicker}>
                {selectedRoute.steps.map((step, index) => (
                  <button
                    key={step.id}
                    id={stepTabId(index)}
                    type="button"
                    role="tab"
                    aria-controls={stepPanelId}
                    aria-selected={step.id === selectedStep?.id}
                    tabIndex={step.id === selectedStep?.id ? 0 : -1}
                    onClick={() => selectStep(step.id)}
                    onKeyDown={(event) => moveTab(
                      event,
                      selectedRoute.steps.map((item) => item.id),
                      selectedStep?.id ?? "",
                      selectStep,
                    )}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.relationship === "target_forming_segment" ? targetLabel(model.targetTerminology, locale) : labels.segment}</strong>
                  </button>
                ))}
              </div>
              {selectedStep ? (
                <StepPanel
                  id={stepPanelId}
                  labelledBy={stepTabId(selectedStepIndex)}
                  step={selectedStep}
                  route={selectedRoute}
                  selection={selection}
                  targetStructureAssets={model.targetStructureAssets}
                  locale={locale}
                  structureAssetAvailability={structureAssetAvailability}
                  onOpenOutputInExplorer={(materialId) => {
                    setExplorerFocus({
                      kind: "step_output",
                      stepId: selectedStep.id,
                      materialId,
                    });
                    setActiveTab("explorer");
                    window.requestAnimationFrame(() => explorerTabRef.current?.focus());
                  }}
                />
              ) : null}
            </section>
          </>
        ) : (
          <article className={styles.emptyState}>
            <span>{labels.quality}</span>
            <h3>{statusTitle}</h3>
            <p>{statusBody}</p>
          </article>
        )}
      </section>

      <section
        id="synthesis-studio-panel-mechanism"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-mechanism"
        hidden={activeTab !== "mechanism"}
      >
        {model.routes.length > 0 ? (
          <article className={styles.mechanismPanel} data-mechanism-state="unresolved">
            <header>
              <span>{labels.mechanism}</span>
              <h3>{labels.mechanismNotResolved}</h3>
              <p>{labels.mechanismBoundary}</p>
            </header>
            <dl>
              {[labels.reactionFamily, labels.nucleophile, labels.electrophile, labels.leavingGroup, labels.bondChange, labels.functionalChange, labels.stereoOutcome].map((label) => (
                <div key={label}><dt>{label}</dt><dd>{labels.unresolved}</dd></div>
              ))}
            </dl>
            <aside><strong>{labels.misconception}</strong><p>{labels.misconceptionBody}</p></aside>
          </article>
        ) : (
          <article className={styles.emptyState}>
            <span>{labels.mechanism}</span>
            <h3>{statusTitle}</h3>
            <p>{statusBody}</p>
          </article>
        )}
      </section>

      <section
        id="synthesis-studio-panel-references"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-references"
        hidden={activeTab !== "references"}
      >
        {references.length > 0 ? (
          <ol className={styles.referenceList}>
            {references.map((reference) => (
              <li key={reference.id}>
                <div>
                  <span>ORD</span>
                  <strong>{reference.label}</strong>
                  <code>{labels.exactLocator}: {reference.locator}</code>
                </div>
                <dl>
                  <div><dt>{labels.license}</dt><dd>{reference.licenseState}</dd></div>
                  <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
                  <div><dt>{labels.retrieved}</dt><dd>{reference.retrievedAt.slice(0, 10)}</dd></div>
                </dl>
                <a href={reference.url} target="_blank" rel="noreferrer">{labels.openSource} <span aria-hidden="true">↗</span></a>
                {mode === "reference" ? <code>{reference.id}</code> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.noReferences}>
            {routeDetailUnavailable || coverageUnavailable
              ? statusBody
              : labels.noReferences}
          </p>
        )}
      </section>

      <footer className={styles.footer}>
        <dl>
          <div><dt>{labels.sourceScope}</dt><dd>{model.sourceStatus}</dd></div>
          <div><dt>{labels.identityScope}</dt><dd>{labels.exactIdentity}</dd></div>
          <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
        </dl>
        {onOpenMoleculeFocus &&
        model.targetStructureAssets.threeD.status === "available" ? (
          <button type="button" onClick={() => onOpenMoleculeFocus(selection.catalogEntityId)}>
            {labels.openSpatial} <span aria-hidden="true">↗</span>
          </button>
        ) : null}
      </footer>
    </section>
  );
}

export default SynthesisLearningStudio;
