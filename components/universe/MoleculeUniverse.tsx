"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { CatalogBrowseDrawer } from "@/components/catalog";
import {
  DEFAULT_MOLECULAR_SCENE_CAMERA,
  SharedMolecularScene,
  getActiveMolecularSceneContextCount,
  interpolateSceneCamera,
  zoomSceneCamera,
  type MolecularSceneAtom,
  type MolecularSceneCamera,
  type MolecularSceneComparisonAnalysis,
  type MolecularSceneMolecule,
  type MolecularScenePort,
  type MolecularSceneRepresentation,
  type MolecularSceneStatus,
} from "@/components/molecular-scene";
import { MoleculeStructurePreview } from "@/components/molecule-viewer";
import type {
  IndexedCatalogBrowsePage,
  IndexedCatalogHit,
} from "@/lib/application/catalog-expansion";
import { isDisplayableStructureNeighborScore } from "@/lib/application/catalog-expansion";
import {
  countExploreClusterLabelCollisions,
  resolveExploreClusterLabelLayout,
  type ExploreClusterLabelAvoidanceZone,
} from "@/lib/application/explore-cluster-layout";
import { selectExploreSceneSample } from "@/lib/application/explore-scene-sample";
import { selectViewportSceneCandidateIds } from "@/lib/application/explore-viewport";
import { STRUCTURE_GRAPH_COMPARISON_VERSION } from "@/lib/application/structure-comparison";
import { getStructureProvenancePresentation } from "@/lib/application/structure-presentation";
import {
  createCanonicalSmilesPathFingerprint,
  getExploreLodLevel,
  selectSceneMoleculeIds,
  tanimotoSimilarity,
  type ExploreLodLevel,
} from "@/lib/explore";
import {
  useI18n,
  type Locale,
  type TranslationKey,
  type Translator,
} from "@/lib/i18n";

import styles from "./MoleculeUniverse.module.css";

export type MoleculeEvidenceTone =
  | "verified"
  | "supported"
  | "pending"
  | "predicted"
  | "unknown";

export interface UniverseLens {
  id: string;
  label: string;
  description?: string;
  meaning?: string;
  doesNotMean?: string;
  verificationStatus?: string;
  projectionId?: string;
  algorithm?: string;
  algorithmVersion?: string;
  inputVersion?: string;
  inputHash?: string;
}

export interface UniverseMoleculeStructure {
  pubChemCid: number;
  threeDUrl?: string;
  twoDUrl?: string;
  sourceLabel?: string;
  sourceId?: string;
  sourceHref?: string;
  originLabel?: string;
  reviewStatus?: string;
  twoDSourceLabel?: string;
  twoDSourceId?: string;
  twoDSourceHref?: string;
  twoDOriginLabel?: string;
  twoDReviewStatus?: string;
}

export interface UniverseMolecule {
  id: string;
  name: string;
  canonicalSmiles?: string;
  formula?: string;
  category?: string;
  summary?: string;
  lensValues?: Readonly<Record<string, string>>;
  lensKeys?: Readonly<Record<string, string>>;
  lensAliases?: Readonly<Record<string, readonly string[]>>;
  coordinates?: Readonly<Record<string, { x: number; y: number }>>;
  evidenceLabel?: string;
  evidenceTone?: MoleculeEvidenceTone;
  accent?: string;
  studentProfile?: {
    systematicName?: string;
    functionalGroups: readonly string[];
    functionalGroupsStatus: "computed-unreviewed";
    scaffoldFamily: string;
    scaffoldDetail: string;
    drugClass: string;
    mechanismSummary: string;
    synthesisScope: string;
    nomenclatureLesson: string;
  };
  structuralNeighbors?: readonly {
    id: string;
    score: number;
  }[];
  structure?: UniverseMoleculeStructure;
  regulatoryProduct?: {
    applicationNumber: string;
    productNumber: string;
    brandName: string;
    activeIngredientName: string;
    chemicalFormId: string;
    marketingStatus: string;
    actionDate: string;
    sourceHref: string;
    verificationStatus: string;
    limitations: readonly string[];
  };
}

export type ExplorePresentationMode = "student" | "reviewer";

export interface UniverseIndexedCatalog {
  readonly search: (
    query: string,
    limit?: number,
  ) => Promise<readonly IndexedCatalogHit[]>;
  readonly browse: (
    offset?: number,
    limit?: number,
  ) => Promise<IndexedCatalogBrowsePage>;
  readonly resolveStableSlug: (
    stableSlug: string,
  ) => Promise<IndexedCatalogHit | null>;
  readonly hydrate: (entityId: string) => Promise<UniverseMolecule | null>;
}

export interface UniverseLearningActions {
  readonly synthesisMoleculeIds?: readonly string[];
  readonly taskMoleculeIds?: readonly string[];
  readonly onOpenSynthesis?: (molecule: UniverseMolecule) => void;
  readonly onOpenNomenclature?: (molecule: UniverseMolecule) => void;
  readonly onOpenTasks?: (molecule: UniverseMolecule) => void;
}

export interface MoleculeUniverseProps {
  molecules: readonly UniverseMolecule[];
  lenses?: readonly UniverseLens[];
  initialLensId?: string;
  initialSelectedId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  presentationMode?: ExplorePresentationMode;
  catalogRecordCount?: number;
  indexedCatalog?: UniverseIndexedCatalog;
  learningActions?: UniverseLearningActions;
  onMoleculeSelect?: (molecule: UniverseMolecule) => void;
}

type ExploreLevel = "universe" | "cluster" | "focus" | "compare";
type ViewerDimension = "2d" | "3d";
type InteractionMode = "rotate" | "pan";

interface SceneTelemetry {
  status: MolecularSceneStatus;
  loadedCount: number;
  activeContexts: number;
  cameraRevision: number;
  selectedAtom: MolecularSceneAtom | null;
  layoutMinimumGap: number | null;
  overlapCount: number;
  clippedMoleculeCount: number;
  labelAvoidanceZones: readonly ExploreClusterLabelAvoidanceZone[];
}

interface UniverseCluster {
  key: string;
  name: string;
  molecules: UniverseMolecule[];
  anchorPosition: { x: number; y: number };
  position: { x: number; y: number };
}

type ClusterStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--accent": string;
};

type ExploreStageStyle = CSSProperties & {
  "--explore-stage-viewport-height": string;
};

const DEFAULT_TELEMETRY: SceneTelemetry = {
  status: "idle",
  loadedCount: 0,
  activeContexts: 0,
  cameraRevision: 0,
  selectedAtom: null,
  layoutMinimumGap: null,
  overlapCount: 0,
  clippedMoleculeCount: 0,
  labelAvoidanceZones: [],
};
const DEFAULT_CAMERA_DISTANCE = Math.hypot(
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.x - DEFAULT_MOLECULAR_SCENE_CAMERA.target.x,
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.y - DEFAULT_MOLECULAR_SCENE_CAMERA.target.y,
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.z - DEFAULT_MOLECULAR_SCENE_CAMERA.target.z,
);
const STUDENT_UNIVERSE_CAMERA: MolecularSceneCamera = {
  ...DEFAULT_MOLECULAR_SCENE_CAMERA,
  position: { x: 0, y: 5.6, z: 21.2 },
  target: { x: 0, y: 0, z: 0 },
};

/**
 * Camera motion recomputes viewport ranking, but most frames retain exactly the
 * same visible membership. Reuse the previous array for that case so the scene
 * adapter does not mistake ranking-only churn for a molecular data change.
 */
function useStableIdMembership(ids: readonly string[]) {
  const membershipKey = [...ids]
    .sort()
    .map((id) => `${id.length}:${id}`)
    .join("|");

  // `ids` is deliberately represented by its collision-safe membership key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo<readonly string[]>(() => ids, [membershipKey]);
}

const STUDENT_UNIVERSE_ZOOM = cameraZoom(STUDENT_UNIVERSE_CAMERA);
const CURATED_OVERVIEW_FAR_ZOOM_RATIO = 0.93;
const UNIVERSE_REPRESENTATIVE_POOL_SIZE = 12;
const UNIVERSE_VISIBLE_SAMPLE_SIZE = 8;
const NARROW_UNIVERSE_VISIBLE_SAMPLE_SIZE = 6;
const CLUSTER_VISIBLE_SAMPLE_SIZE = 10;
const VIEWPORT_SELECTION_SETTLE_MS = 650;

const indexedCatalogCopy = {
  tr: {
    browse: "Tüm kataloğa göz at",
    results: "Tam katalog sonuçları",
    loading: "Katalog indeksi aranıyor…",
    hydrating: "Yapı kaydı yükleniyor…",
    typeMore: "Tam katalogda aramak için en az iki karakter yaz.",
    unavailable: "Katalog araması şu anda kullanılamıyor.",
    noResults: "Tam katalogda eşleşme bulunamadı.",
    previous: "Önceki",
    next: "Sonraki",
    resultMeta: "CID {cid} · {formula}",
    aliasPrefix: "Diğer adlar",
    pageSummary: "{shown} / {total} kayıt",
    sceneSample: "3B örneklem · {count} yapı",
    sceneSampleMore: "{shown} temsilî yapı · +{remaining} yapı bölgelerde",
    scaffoldDetail: "İskelet ayrıntısı",
    similarMolecules: "Yüklü penceredeki yapısal adaylar",
    similarMoleculesBoundary: "Yalnız yüklü kayıtlar ve bu eğitim fingerprint'i karşılaştırılır; biyolojik veya klinik benzerlik değildir.",
    noSimilarMolecules: "Bu yüklü pencerede %45 eşiğini geçen yapısal aday yok.",
    functionalMotifHints: "Fonksiyonel grup ipuçları · hesaplanmış, incelenmemiş",
    learningActions: "Bu yapıyla öğren",
    synthesis: "Sentez Atlası’nı aç",
    nomenclature: "Nomenklatür Akademisi’ni aç",
    tasks: "İlgili öğrenme görevlerini aç",
    commonCore: "Ortak yapısal çekirdek",
    commonCoreSummary: "{atoms} ortak ağır atom çevresi · {bonds} çekirdek bağı",
    commonCorePending: "Gerçek SDF grafikleri yüklenince ortak çekirdek işaretlenecek.",
    fingerprintSummary: "Yapı fingerprint benzerliği: {score}%",
    changedGroups: "Değişen atom / grup bölgesi",
    changedNone: "Bu konservatif maskede ek değişen ağır atom yok.",
    commonMask: "Ortak çekirdek",
    changedMask: "Değişen bölge",
    comparisonBoundary: "SDF yerel bağ çevresi maskesi; kesin maksimum ortak alt yapı veya etki benzerliği iddiası değildir.",
  },
  en: {
    browse: "Browse full catalog",
    results: "Full catalog results",
    loading: "Searching the catalog index…",
    hydrating: "Loading the structure record…",
    typeMore: "Type at least two characters to search the full catalog.",
    unavailable: "Catalog search is currently unavailable.",
    noResults: "No match was found in the full catalog.",
    previous: "Previous",
    next: "Next",
    resultMeta: "CID {cid} · {formula}",
    aliasPrefix: "Also known as",
    pageSummary: "{shown} / {total} records",
    sceneSample: "3D sample · {count} structures",
    sceneSampleMore: "{shown} representative structures · +{remaining} in regions",
    scaffoldDetail: "Scaffold detail",
    similarMolecules: "Structural candidates in the loaded window",
    similarMoleculesBoundary: "Only loaded records and this educational fingerprint are compared; this is not biological or clinical similarity.",
    noSimilarMolecules: "No structural candidate in the loaded window passes the 45% threshold.",
    functionalMotifHints: "Functional-group motif hints · computed, unreviewed",
    learningActions: "Learn with this structure",
    synthesis: "Open Synthesis Atlas",
    nomenclature: "Open Nomenclature Academy",
    tasks: "Open related learning tasks",
    commonCore: "Common structural core",
    commonCoreSummary: "{atoms} shared heavy-atom environments · {bonds} core bonds",
    commonCorePending: "The common core will be marked after the real SDF graphs load.",
    fingerprintSummary: "Structure fingerprint similarity: {score}%",
    changedGroups: "Changed atom / group region",
    changedNone: "No additional changed heavy atoms in this conservative mask.",
    commonMask: "Common core",
    changedMask: "Changed region",
    comparisonBoundary: "Local SDF bonding-environment mask; not an exact maximum common substructure or an activity-similarity claim.",
  },
} as const;

const interpolateIndexedCopy = (
  template: string,
  values: Readonly<Record<string, string | number>>,
) => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

export const DEFAULT_UNIVERSE_LENSES: readonly UniverseLens[] = [
  {
    id: "therapeutic",
    label: "Tedavi alanı",
    description: "Kaynak ve inceleme durumu taşıyan tedavi alanı kategorileri.",
    verificationStatus: "pending-review",
  },
  {
    id: "target",
    label: "Hedef ailesi",
    description: "İnceleme kontrollü hedef profili kategorileri.",
    verificationStatus: "pending-review",
  },
  {
    id: "scaffold",
    label: "Yapısal iskelet",
    description: "İnsan tarafından adlandırılmış iskelet aileleri.",
    verificationStatus: "pending-review",
  },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSearchValue(value: string, locale: Locale) {
  return value.trim().toLocaleLowerCase(locale);
}

function getLensValue(
  molecule: UniverseMolecule,
  lensId: string,
  unclassifiedLabel: string,
) {
  return molecule.lensValues?.[lensId] ?? molecule.category ?? unclassifiedLabel;
}

function normalizeClusterToken(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "") || "unclassified";
}

function getLensKey(
  molecule: UniverseMolecule,
  lensId: string,
  unclassifiedLabel: string,
) {
  return molecule.lensKeys?.[lensId]
    ?? normalizeClusterToken(getLensValue(molecule, lensId, unclassifiedLabel));
}

function acceptsClusterToken(
  molecule: UniverseMolecule,
  lensId: string,
  token: string,
  unclassifiedLabel: string,
) {
  return getLensKey(molecule, lensId, unclassifiedLabel) === token
    || getLensValue(molecule, lensId, unclassifiedLabel) === token
    || (molecule.lensAliases?.[lensId] ?? []).includes(token);
}

function moleculeMatchesSearch(
  molecule: UniverseMolecule,
  normalizedQuery: string,
  locale: Locale,
) {
  return [
    molecule.name,
    molecule.formula,
    molecule.category,
    molecule.summary,
    molecule.structure?.sourceLabel,
    molecule.structure?.sourceId,
    molecule.regulatoryProduct?.applicationNumber,
    molecule.regulatoryProduct?.brandName,
    molecule.regulatoryProduct?.activeIngredientName,
    ...Object.values(molecule.lensValues ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale)
    .includes(normalizedQuery);
}

const VERIFICATION_STATUS_KEYS: Readonly<Record<string, TranslationKey>> = {
  verified: "status.verified",
  "pending-review": "status.pendingReview",
  "expert-review-required": "status.expertReviewRequired",
  "educational-only": "status.educationalOnly",
  "source-verified": "status.sourceVerified",
  "source-supported": "status.sourceSupported",
  predicted: "status.predicted",
  unknown: "status.unknown",
  conflicting: "status.conflicting",
  rejected: "status.rejected",
};

function presentVerificationStatus(status: string | undefined, t: Translator) {
  if (!status) return t("common.notSpecified");
  const key = VERIFICATION_STATUS_KEYS[status];
  return key ? t(key) : t("status.unknown");
}

function getMoleculeSlug(id: string) {
  const separatorIndex = Math.max(id.lastIndexOf(":"), id.lastIndexOf("/"));
  return separatorIndex >= 0 ? id.slice(separatorIndex + 1) : id;
}

function writeExploreHash(hash: string) {
  if (typeof window === "undefined" || window.location.hash === hash) return;
  window.history.pushState(null, "", hash);
}

function cameraZoom(camera: MolecularSceneCamera) {
  const distance = Math.hypot(
    camera.position.x - camera.target.x,
    camera.position.y - camera.target.y,
    camera.position.z - camera.target.z,
  );
  return clamp(DEFAULT_CAMERA_DISTANCE / Math.max(distance, 0.01), 0.1, 4);
}

export function MoleculeUniverse({
  molecules,
  lenses: providedLenses,
  initialLensId,
  initialSelectedId,
  eyebrow,
  title,
  description,
  className,
  presentationMode = "student",
  catalogRecordCount,
  indexedCatalog,
  learningActions,
  onMoleculeSelect,
}: MoleculeUniverseProps) {
  const { locale, t } = useI18n();
  const catalogCopy = indexedCatalogCopy[locale];
  const localizedDefaultLenses = useMemo<readonly UniverseLens[]>(
    () => [
      {
        id: "therapeutic",
        label: t("explore.lens.therapeutic"),
        description: t("explore.lens.therapeuticDescription"),
        verificationStatus: "pending-review",
      },
      {
        id: "target",
        label: t("explore.lens.target"),
        description: t("explore.lens.targetDescription"),
        verificationStatus: "pending-review",
      },
      {
        id: "scaffold",
        label: t("explore.lens.scaffold"),
        description: t("explore.lens.scaffoldDescription"),
        verificationStatus: "pending-review",
      },
      {
        id: "structural-similarity",
        label: t("explore.lens.structuralSimilarity"),
        description: t("explore.lens.structuralSimilarityDescription"),
        verificationStatus: "source-supported",
      },
    ],
    [t],
  );
  const lenses = providedLenses ?? localizedDefaultLenses;
  const resolvedEyebrow = eyebrow ?? t("explore.eyebrow");
  const resolvedTitle = title ?? t("explore.defaultTitle");
  const resolvedDescription = description ?? t("explore.defaultDescription");
  const unclassifiedLabel = t("catalog.classification.unclassified");
  const headingId = useId();
  const searchId = useId();
  const lensDescriptionId = useId();
  const lensMeaningId = useId();
  const lensCaveatId = useId();
  const lensDrawerId = useId();
  const universeHeadingRef = useRef<HTMLHeadingElement>(null);
  const clusterHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);
  const compareHeadingRef = useRef<HTMLHeadingElement>(null);
  const exploreStageRef = useRef<HTMLDivElement>(null);
  const catalogButtonRef = useRef<HTMLButtonElement>(null);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const selectorRefs = useRef(new Map<string, HTMLButtonElement>());
  const scenePortRef = useRef<MolecularScenePort | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);
  const viewportSelectionTimerRef = useRef<number | null>(null);
  const pendingViewportSelectionCameraRef = useRef<MolecularSceneCamera>(
    STUDENT_UNIVERSE_CAMERA,
  );
  const indexedRequestRef = useRef(0);
  const onMoleculeSelectRef = useRef(onMoleculeSelect);
  const lastCameraRef = useRef<MolecularSceneCamera>(DEFAULT_MOLECULAR_SCENE_CAMERA);
  const universeCameraRef = useRef<MolecularSceneCamera>(STUDENT_UNIVERSE_CAMERA);
  const clusterCameraRef = useRef<MolecularSceneCamera>(DEFAULT_MOLECULAR_SCENE_CAMERA);
  const autoFitPendingRef = useRef(true);
  const lastFittedUniverseViewportKeyRef = useRef<string | null>(null);
  const [level, setLevel] = useState<ExploreLevel>("universe");
  const [query, setQuery] = useState("");
  const [indexedPanelOpen, setIndexedPanelOpen] = useState(false);
  const [indexedStatus, setIndexedStatus] = useState<
    "idle" | "loading" | "ready" | "hydrating" | "error"
  >("idle");
  const [indexedErrorMessage, setIndexedErrorMessage] = useState("");
  const [lensDrawerOpen, setLensDrawerOpen] = useState(false);
  const [lensId, setLensId] = useState(initialLensId ?? lenses[0]?.id ?? "therapeutic");
  const [clusterName, setClusterName] = useState<string | null>(null);
  const [clusterSelectedId, setClusterSelectedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? molecules[0]?.id ?? "");
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [compareMessage, setCompareMessage] = useState("");
  const [comparisonAnalysis, setComparisonAnalysis] =
    useState<MolecularSceneComparisonAnalysis | null>(null);
  const [sceneViewportAspect, setSceneViewportAspect] = useState(16 / 9);
  const [sceneFirstViewportHeight, setSceneFirstViewportHeight] = useState<number | null>(null);
  const [browserViewportKey, setBrowserViewportKey] = useState("initial");
  const [flightActive, setFlightActive] = useState(false);
  const [universeZoom, setUniverseZoom] = useState(STUDENT_UNIVERSE_ZOOM);
  const [universeNearZoomThreshold, setUniverseNearZoomThreshold] = useState(1.08);
  const [universePan, setUniversePan] = useState({ x: 0, y: 0 });
  const [sceneCamera, setSceneCamera] = useState<MolecularSceneCamera | undefined>(
    STUDENT_UNIVERSE_CAMERA,
  );
  const [viewportSelectionCamera, setViewportSelectionCamera] =
    useState<MolecularSceneCamera>(STUDENT_UNIVERSE_CAMERA);
  const [searchFitPendingId, setSearchFitPendingId] = useState<string | null>(null);
  const [representation, setRepresentation] =
    useState<MolecularSceneRepresentation>("ball-and-stick");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("rotate");
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [dimension, setDimension] = useState<ViewerDimension>("3d");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [telemetry, setTelemetry] = useState<SceneTelemetry>(DEFAULT_TELEMETRY);
  const universeVisibleSampleSize =
    sceneViewportAspect < 1.2
      ? NARROW_UNIVERSE_VISIBLE_SAMPLE_SIZE
      : UNIVERSE_VISIBLE_SAMPLE_SIZE;
  const sceneViewportKey = browserViewportKey;

  const cancelViewportSelectionUpdate = useCallback(() => {
    if (viewportSelectionTimerRef.current === null) return;
    window.clearTimeout(viewportSelectionTimerRef.current);
    viewportSelectionTimerRef.current = null;
  }, []);

  const commitViewportSelectionCamera = useCallback(
    (camera: MolecularSceneCamera) => {
      cancelViewportSelectionUpdate();
      pendingViewportSelectionCameraRef.current = camera;
      setViewportSelectionCamera(camera);
    },
    [cancelViewportSelectionUpdate],
  );

  const scheduleViewportSelectionCamera = useCallback(
    (camera: MolecularSceneCamera) => {
      pendingViewportSelectionCameraRef.current = camera;
      cancelViewportSelectionUpdate();
      viewportSelectionTimerRef.current = window.setTimeout(() => {
        viewportSelectionTimerRef.current = null;
        setViewportSelectionCamera(pendingViewportSelectionCameraRef.current);
      }, VIEWPORT_SELECTION_SETTLE_MS);
    },
    [cancelViewportSelectionUpdate],
  );

  const applyFittedUniverseCamera = useCallback(
    (fittedCamera: MolecularSceneCamera, viewportKey: string) => {
      const port = scenePortRef.current;
      if (!port) return;
      port.setCamera(fittedCamera);
      const fittedScreenBounds = port
        .getVisibleMoleculeScreenBounds()
        .map((bounds) => ({ ...bounds, id: bounds.moleculeId }));
      setTelemetry((current) => ({
        ...current,
        cameraRevision: current.cameraRevision + 1,
        labelAvoidanceZones: fittedScreenBounds,
      }));
      lastCameraRef.current = fittedCamera;
      setSceneCamera(fittedCamera);
      commitViewportSelectionCamera(fittedCamera);
      universeCameraRef.current = fittedCamera;
      const fittedZoom = cameraZoom(fittedCamera);
      setUniverseNearZoomThreshold(fittedZoom * CURATED_OVERVIEW_FAR_ZOOM_RATIO);
      setUniverseZoom(fittedZoom);
      setUniversePan({
        x: -fittedCamera.target.x * 18,
        y: fittedCamera.target.y * 18,
      });
      lastFittedUniverseViewportKeyRef.current = viewportKey;
    },
    [commitViewportSelectionCamera],
  );

  useEffect(() => {
    const updateBrowserViewportKey = () => {
      setBrowserViewportKey(
        `${window.innerWidth}:${window.innerHeight}:${window.devicePixelRatio || 1}`,
      );
    };
    updateBrowserViewportKey();
    window.addEventListener("resize", updateBrowserViewportKey);
    return () => window.removeEventListener("resize", updateBrowserViewportKey);
  }, []);

  useEffect(() => {
    if (level !== "universe") return undefined;
    const stage = exploreStageRef.current;
    if (!stage) return undefined;
    const updateFirstViewportHeight = () => {
      if (stage.dataset.level !== "universe") return;
      const top = Math.max(0, stage.getBoundingClientRect().top);
      const available = Math.max(160, Math.floor(window.innerHeight - top - 1));
      setSceneFirstViewportHeight((current) => current === available ? current : available);
    };
    const observer = new ResizeObserver(([entry]) => {
      if (stage.dataset.level !== "universe") return;
      const width = entry?.contentRect.width ?? 0;
      const height = entry?.contentRect.height ?? 0;
      if (width > 0 && height > 0) setSceneViewportAspect(width / height);
      updateFirstViewportHeight();
    });
    observer.observe(stage);
    updateFirstViewportHeight();
    window.addEventListener("resize", updateFirstViewportHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFirstViewportHeight);
    };
  }, [level]);

  useEffect(() => {
    if (
      level !== "universe"
      || telemetry.status !== "ready"
      || telemetry.loadedCount === 0
      || lastFittedUniverseViewportKeyRef.current === null
      || lastFittedUniverseViewportKeyRef.current === sceneViewportKey
    ) return undefined;

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (lastFittedUniverseViewportKeyRef.current === sceneViewportKey) return;
        const port = scenePortRef.current;
        if (!port) return;
        port.relayoutVisibleMolecules();
        const fittedCamera = port.fitVisibleMolecules();
        if (fittedCamera) applyFittedUniverseCamera(fittedCamera, sceneViewportKey);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    applyFittedUniverseCamera,
    level,
    sceneViewportKey,
    telemetry.loadedCount,
    telemetry.status,
  ]);

  const activeLens = lenses.find((lens) => lens.id === lensId) ?? lenses[0];
  const activeLensId = activeLens?.id ?? lensId;
  const normalizedQuery = normalizeSearchValue(query, locale);
  const visibleMolecules = useMemo(() => {
    if (!normalizedQuery) return [...molecules];
    return molecules.filter((molecule) =>
      moleculeMatchesSearch(molecule, normalizedQuery, locale),
    );
  }, [locale, molecules, normalizedQuery]);
  const mapMolecules = useMemo(
    () =>
      visibleMolecules.filter(
        (molecule) =>
          normalizedQuery.length > 0
          || getLensKey(molecule, activeLensId, unclassifiedLabel) !== "unclassified",
      ),
    [activeLensId, normalizedQuery, unclassifiedLabel, visibleMolecules],
  );
  const knownCatalogClassificationByCid = useMemo(() => {
    const labels = new Map<number, string>();
    for (const molecule of molecules) {
      const cid = molecule.structure?.pubChemCid;
      if (!cid) continue;
      const key = getLensKey(molecule, activeLensId, unclassifiedLabel);
      if (key === "unclassified") continue;
      const label = getLensValue(molecule, activeLensId, unclassifiedLabel).trim();
      if (!label || label === unclassifiedLabel) continue;
      const existing = labels.get(cid);
      // Conflicting labels fail closed instead of claiming two classifications.
      if (existing && existing !== label) labels.delete(cid);
      else if (!existing) labels.set(cid, label);
    }
    return labels;
  }, [activeLensId, molecules, unclassifiedLabel]);
  const classifyCatalogHit = useCallback(
    (hit: IndexedCatalogHit) => {
      const label = knownCatalogClassificationByCid.get(hit.pubChemCid);
      return label
        ? { status: "known" as const, label }
        : { status: "unclassified" as const, label: unclassifiedLabel };
    },
    [knownCatalogClassificationByCid, unclassifiedLabel],
  );
  const catalogBrowseNavigator = useMemo<UniverseIndexedCatalog | undefined>(() => {
    if (!indexedCatalog) return undefined;
    return {
      ...indexedCatalog,
      search: async (searchQuery, limit = 24) => {
        const direct = await indexedCatalog.search(searchQuery, limit);
        const normalized = normalizeSearchValue(searchQuery, locale);
        const classifiedMatches = normalized
          ? molecules
              .filter((molecule) => {
                const cid = molecule.structure?.pubChemCid;
                const label = cid ? knownCatalogClassificationByCid.get(cid) : undefined;
                return Boolean(label && normalizeSearchValue(label, locale).includes(normalized));
              })
              .sort((left, right) => left.name.localeCompare(right.name, locale))
          : [];
        const supplemental = (
          await Promise.all(
            classifiedMatches.map((molecule) => indexedCatalog.search(molecule.name, 1)),
          )
        ).flat();
        const unique = new Map<string, IndexedCatalogHit>();
        for (const hit of [...direct, ...supplemental]) {
          if (!unique.has(hit.id)) unique.set(hit.id, hit);
        }
        return [...unique.values()].slice(0, limit);
      },
    };
  }, [indexedCatalog, knownCatalogClassificationByCid, locale, molecules]);

  const clusters = useMemo<UniverseCluster[]>(() => {
    const grouped = new Map<
      string,
      { readonly name: string; readonly molecules: UniverseMolecule[] }
    >();
    for (const molecule of mapMolecules) {
      const name = getLensValue(molecule, activeLensId, unclassifiedLabel);
      const key = getLensKey(molecule, activeLensId, unclassifiedLabel);
      const existing = grouped.get(key);
      grouped.set(key, {
        name: existing?.name ?? name,
        molecules: [...(existing?.molecules ?? []), molecule],
      });
    }
    const rawClusters = [...grouped.entries()]
      .sort(([, left], [, right]) => left.name.localeCompare(right.name, locale))
      .flatMap(([key, group]) => {
        const { name, molecules: groupedMolecules } = group;
        const coordinates = groupedMolecules
          .map((molecule) => molecule.coordinates?.[activeLensId])
          .filter((coordinate): coordinate is { x: number; y: number } => Boolean(coordinate));
        // A missing projection is never replaced by a decorative/scientific-looking grid.
        if (coordinates.length === 0) return [];
        const anchorPosition = {
          x: coordinates.reduce((total, item) => total + item.x, 0) / coordinates.length,
          y: coordinates.reduce((total, item) => total + item.y, 0) / coordinates.length,
        };
        return [{
          key,
          name,
          molecules: groupedMolecules,
          anchorPosition,
          position: anchorPosition,
        }];
      });
    const labelPositions = resolveExploreClusterLabelLayout(
      rawClusters.map((cluster) => ({
        id: cluster.key,
        x: cluster.anchorPosition.x,
        y: cluster.anchorPosition.y,
      })),
      sceneViewportAspect,
      [],
    );
    const positionByKey = new Map(labelPositions.map((item) => [item.id, item]));
    return rawClusters.map((cluster) => ({
      ...cluster,
      position: positionByKey.get(cluster.key) ?? cluster.anchorPosition,
    }));
  }, [activeLensId, locale, mapMolecules, sceneViewportAspect, unclassifiedLabel]);
  const unprojectedMoleculeCount = mapMolecules.filter(
    (molecule) => !molecule.coordinates?.[activeLensId],
  ).length;

  const selectedMolecule =
    molecules.find((molecule) => molecule.id === selectedId) ?? molecules[0];
  const selectedSimilarMolecules = useMemo(
    () =>
      selectedMolecule?.structuralNeighbors
        ?.filter((neighbor) => isDisplayableStructureNeighborScore(neighbor.score))
        ?.flatMap((neighbor) => {
          const molecule = molecules.find((candidate) => candidate.id === neighbor.id);
          return molecule ? [{ molecule, score: neighbor.score }] : [];
        })
        .slice(0, 4) ?? [],
    [molecules, selectedMolecule],
  );
  const searchFocusedId =
    level === "universe" && normalizedQuery && visibleMolecules.length === 1
      ? (visibleMolecules[0]?.id ?? null)
      : null;
  const selectedClusterName = selectedMolecule
    ? getLensValue(selectedMolecule, activeLensId, unclassifiedLabel)
    : null;
  const effectiveClusterName = level === "focus" ? selectedClusterName : clusterName;
  const clusterMolecules = useMemo(
    () =>
      effectiveClusterName
        ? mapMolecules.filter(
            (molecule) =>
              getLensValue(molecule, activeLensId, unclassifiedLabel) === effectiveClusterName,
          )
        : [],
    [activeLensId, effectiveClusterName, mapMolecules, unclassifiedLabel],
  );
  const effectiveClusterSelectedId =
    clusterSelectedId && clusterMolecules.some((molecule) => molecule.id === clusterSelectedId)
      ? clusterSelectedId
      : (clusterMolecules[0]?.id ?? null);
  const comparisonMolecules = useMemo(
    () => compareIds.flatMap((id) => {
      const molecule = molecules.find((candidate) => candidate.id === id);
      return molecule ? [molecule] : [];
    }),
    [compareIds, molecules],
  );
  const comparisonGroupId = useMemo(
    () =>
      comparisonMolecules.length >= 2
        ? `compare:${comparisonMolecules.map((molecule) => molecule.id).sort().join("|")}`
        : null,
    [comparisonMolecules],
  );
  const comparisonFingerprintScore = useMemo(() => {
    const fingerprints = comparisonMolecules.flatMap((molecule) =>
      molecule.canonicalSmiles
        ? [createCanonicalSmilesPathFingerprint(molecule.canonicalSmiles)]
        : [],
    );
    if (fingerprints.length !== comparisonMolecules.length || fingerprints.length < 2) {
      return null;
    }
    const scores: number[] = [];
    for (let left = 0; left < fingerprints.length; left += 1) {
      for (let right = left + 1; right < fingerprints.length; right += 1) {
        const leftFingerprint = fingerprints[left];
        const rightFingerprint = fingerprints[right];
        if (leftFingerprint && rightFingerprint) {
          scores.push(tanimotoSimilarity(leftFingerprint, rightFingerprint));
        }
      }
    }
    return scores.length > 0
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100)
      : null;
  }, [comparisonMolecules]);
  const activeComparisonAnalysis =
    comparisonAnalysis?.groupId === comparisonGroupId ? comparisonAnalysis : null;
  const commonComparisonScaffold = useMemo(() => {
    const families = new Set(
      comparisonMolecules
        .map((molecule) => molecule.studentProfile?.scaffoldFamily)
        .filter((value): value is string => Boolean(value)),
    );
    return families.size === 1 ? [...families][0] : null;
  }, [comparisonMolecules]);
  const normalizedUniverseLodZoom = searchFocusedId
    ? Math.max(universeZoom, universeNearZoomThreshold)
    : universeZoom;
  const lodLevel: ExploreLodLevel =
    level === "compare"
      ? "cluster"
      : level === "universe"
        ? normalizedUniverseLodZoom >= universeNearZoomThreshold
          ? "near"
          : "far"
        : getExploreLodLevel(level, universeZoom);
  const sceneLevel =
    lodLevel === "focus" ? "focus" : lodLevel === "cluster" ? "cluster" : "universe";

  const sceneMolecules = useMemo<readonly MolecularSceneMolecule[]>(() => {
    const activeCluster = clusters.find((cluster) => cluster.name === effectiveClusterName);
    const center = activeCluster?.anchorPosition ?? { x: 50, y: 50 };
    return molecules.flatMap((molecule) => {
      const structure = molecule.structure;
      const structureUrl = structure?.threeDUrl;
      if (!structure || !structureUrl) return [];
      const coordinate = molecule.coordinates?.[activeLensId];
      if (level !== "focus" && !coordinate) return [];
      const compareIndex = compareIds.indexOf(molecule.id);
      const position =
        level === "focus"
          ? { x: 0, y: 0, z: 0 }
          : level === "compare" && compareIndex >= 0
            ? {
                x: (compareIndex - (compareIds.length - 1) / 2) * 7.4,
                y: compareIndex % 2 === 0 ? 0.65 : -0.65,
                z: 0,
              }
          : level === "cluster" && coordinate
            ? {
                x: (coordinate.x - center.x) * 1.15,
                y: (center.y - coordinate.y) * 0.88,
                z: 0,
              }
            : coordinate
              ? {
                  x: (coordinate.x - 50) * 0.42,
                  y: (50 - coordinate.y) * 0.3,
                  z: 0,
                }
              : undefined;
      return [{
        id: molecule.id,
        name: molecule.name,
        structureUrl,
        position,
        scale: level === "focus" ? 1 : level === "compare" ? 0.72 : level === "cluster" ? 0.62 : 0.45,
        structureOrigin: structure.originLabel,
        expectedPubChemCid: structure.pubChemCid,
        comparison:
          level === "compare" && comparisonGroupId
            ? {
                groupId: comparisonGroupId,
                method: STRUCTURE_GRAPH_COMPARISON_VERSION,
              }
            : undefined,
      }];
    });
  }, [activeLensId, clusters, compareIds, comparisonGroupId, effectiveClusterName, level, molecules]);
  const eligibleIds = useMemo(
    () => new Set(sceneMolecules.map((molecule) => molecule.id)),
    [sceneMolecules],
  );
  const structureAvailableIds = useMemo(
    () =>
      new Set(
        molecules
          .filter((molecule) => Boolean(molecule.structure?.threeDUrl))
          .map((molecule) => molecule.id),
      ),
    [molecules],
  );
  const sceneMoleculeById = useMemo(
    () => new Map(sceneMolecules.map((molecule) => [molecule.id, molecule])),
    [sceneMolecules],
  );
  const universeRepresentativeIds = useMemo(
    () =>
      selectExploreSceneSample({
        candidates: mapMolecules.flatMap((molecule) => {
          const sceneMolecule = sceneMoleculeById.get(molecule.id);
          const coordinate = molecule.coordinates?.[activeLensId];
          if (!sceneMolecule?.position || !coordinate) return [];
          return [{
            id: molecule.id,
            clusterKey: getLensKey(molecule, activeLensId, unclassifiedLabel),
            projectedPosition: sceneMolecule.position,
          }];
        }),
        limit: UNIVERSE_REPRESENTATIVE_POOL_SIZE,
      }),
    [activeLensId, mapMolecules, sceneMoleculeById, unclassifiedLabel],
  );
  const clusterRepresentativeIds = useMemo(
    () =>
      selectExploreSceneSample({
        candidates: clusterMolecules.flatMap((molecule) => {
          const sceneMolecule = sceneMoleculeById.get(molecule.id);
          if (!sceneMolecule?.position) return [];
          return [{
            id: molecule.id,
            clusterKey: getLensKey(molecule, activeLensId, unclassifiedLabel),
            projectedPosition: sceneMolecule.position,
          }];
        }),
        limit: CLUSTER_VISIBLE_SAMPLE_SIZE,
        requiredId: effectiveClusterSelectedId,
      }),
    [
      activeLensId,
      clusterMolecules,
      effectiveClusterSelectedId,
      sceneMoleculeById,
      unclassifiedLabel,
    ],
  );
  const representativeIds = level === "cluster"
    ? clusterRepresentativeIds
    : universeRepresentativeIds;
  const representativeIdSet = useMemo(
    () => new Set(representativeIds),
    [representativeIds],
  );
  const intendedSceneCandidates = useMemo(
    () =>
      level === "focus"
        ? selectedMolecule
          ? [selectedMolecule]
          : []
        : level === "compare"
          ? comparisonMolecules
        : level === "cluster"
          ? clusterMolecules.filter((molecule) => representativeIdSet.has(molecule.id))
          : mapMolecules.filter((molecule) => representativeIdSet.has(molecule.id)),
    [
      clusterMolecules,
      comparisonMolecules,
      level,
      mapMolecules,
      representativeIdSet,
      selectedMolecule,
    ],
  );
  const candidateIds = useMemo(() => {
    const intendedIds = intendedSceneCandidates
      .map((molecule) => molecule.id)
      .filter((id) => eligibleIds.has(id));
    if (level === "focus" || level === "compare" || lodLevel === "far") {
      return intendedIds;
    }
    const intendedIdSet = new Set(intendedIds);
    const projected = sceneMolecules.filter((molecule) => intendedIdSet.has(molecule.id));
    const viewportIds = selectViewportSceneCandidateIds({
      candidates: projected.flatMap((molecule) =>
        molecule.position
          ? [{
              id: molecule.id,
              groupKey: getLensKey(
                molecules.find((candidate) => candidate.id === molecule.id) ?? {
                  id: molecule.id,
                  name: molecule.name,
                },
                activeLensId,
                unclassifiedLabel,
              ),
              position: molecule.position,
            }]
          : [],
      ),
      camera: viewportSelectionCamera,
      viewportAspect: sceneViewportAspect,
      limit:
        level === "cluster"
          ? CLUSTER_VISIBLE_SAMPLE_SIZE
          : universeVisibleSampleSize,
      minimumPerGroup: level === "universe" ? 2 : 1,
      maximumPerGroup: level === "universe" ? 4 : CLUSTER_VISIBLE_SAMPLE_SIZE,
      maximumGroups:
        level === "universe"
          ? Math.max(1, Math.floor(universeVisibleSampleSize / 2))
          : 1,
    });
    const emphasizedId = level === "cluster" ? effectiveClusterSelectedId : null;
    return emphasizedId && intendedIdSet.has(emphasizedId) && !viewportIds.includes(emphasizedId)
      ? [emphasizedId, ...viewportIds].slice(0, CLUSTER_VISIBLE_SAMPLE_SIZE)
      : viewportIds;
  }, [
    effectiveClusterSelectedId,
    activeLensId,
    eligibleIds,
    intendedSceneCandidates,
    level,
    lodLevel,
    viewportSelectionCamera,
    sceneMolecules,
    sceneViewportAspect,
    molecules,
    unclassifiedLabel,
    universeVisibleSampleSize,
  ]);
  const requestedSceneIds = useMemo(
    () =>
      selectSceneMoleculeIds({
        level: lodLevel,
        candidateIds,
        focusedMoleculeId: selectedMolecule?.id ?? null,
        maxNearMolecules:
          level === "cluster"
            ? CLUSTER_VISIBLE_SAMPLE_SIZE
            : universeVisibleSampleSize,
      }),
    [candidateIds, level, lodLevel, selectedMolecule?.id, universeVisibleSampleSize],
  );
  const computedSceneVisibleIds = useMemo(
    () => (dimension === "2d" ? [] : requestedSceneIds),
    [dimension, requestedSceneIds],
  );
  const sceneVisibleIds = useStableIdMembership(computedSceneVisibleIds);
  const activeLabelAvoidanceZones = useMemo(() => {
    const visible = new Set(sceneVisibleIds);
    return telemetry.labelAvoidanceZones.filter((zone) => visible.has(zone.id));
  }, [sceneVisibleIds, telemetry.labelAvoidanceZones]);
  const displayedClusters = useMemo(() => {
    // Region labels exist only in Universe. A Cluster/Focus transition can
    // briefly retain the previous scene bounds; never run the Universe label
    // solver against those hidden, route-specific bounds.
    if (level !== "universe") return clusters;
    const boundsByMoleculeId = new Map(
      activeLabelAvoidanceZones.map((zone) => [zone.id, zone] as const),
    );
    const anchors = clusters.map((cluster) => {
      const bounds = cluster.molecules.flatMap((molecule) => {
        const zone = boundsByMoleculeId.get(molecule.id);
        return zone ? [zone] : [];
      });
      return {
        id: cluster.key,
        x: bounds.length > 0
          ? bounds.reduce((sum, zone) => sum + zone.x, 0) / bounds.length
          : cluster.anchorPosition.x,
        y: bounds.length > 0
          ? bounds.reduce((sum, zone) => sum + zone.y, 0) / bounds.length
          : cluster.anchorPosition.y,
      };
    });
    const zones = activeLabelAvoidanceZones.length > 0
      ? activeLabelAvoidanceZones
      : anchors;
    const positions = resolveExploreClusterLabelLayout(
      anchors,
      sceneViewportAspect,
      zones,
    );
    const positionByKey = new Map(positions.map((position) => [position.id, position]));
    return clusters.map((cluster) => ({
      ...cluster,
      position: positionByKey.get(cluster.key) ?? cluster.position,
    }));
  }, [activeLabelAvoidanceZones, clusters, level, sceneViewportAspect]);
  const labelCollisionCount = useMemo(
    () => countExploreClusterLabelCollisions(
      displayedClusters.map((cluster) => ({
        id: cluster.key,
        x: cluster.position.x,
        y: cluster.position.y,
      })),
      sceneViewportAspect,
      activeLabelAvoidanceZones,
    ),
    [activeLabelAvoidanceZones, displayedClusters, sceneViewportAspect],
  );
  const selectedStructureMissing =
    level === "focus" &&
    (dimension === "3d"
      ? !selectedMolecule?.structure?.threeDUrl
      : !selectedMolecule?.structure?.twoDUrl);
  const unavailableSceneMolecules =
    dimension === "3d" && lodLevel !== "far"
      ? intendedSceneCandidates.filter(
          (molecule) => !structureAvailableIds.has(molecule.id),
        )
      : [];
  const unprojectedSceneMolecules =
    dimension === "3d" && lodLevel !== "far" && level !== "focus"
      ? intendedSceneCandidates.filter(
          (molecule) => !molecule.coordinates?.[activeLensId],
        )
      : [];
  const activeSceneGapCount =
    unavailableSceneMolecules.length + unprojectedSceneMolecules.length;
  const effectiveSceneStatus: MolecularSceneStatus = selectedStructureMissing
    ? "error"
    : activeSceneGapCount > 0 && telemetry.status !== "loading"
      ? telemetry.loadedCount > 0
        ? "partial"
        : "error"
      : telemetry.status;
  const effectiveLoadedCount = selectedStructureMissing ? 0 : telemetry.loadedCount;
  const structureOrigin =
    level === "focus"
      ? dimension === "2d"
        ? (selectedMolecule?.structure?.twoDOriginLabel ?? "not-specified")
        : (selectedMolecule?.structure?.originLabel ?? "not-specified")
      : sceneVisibleIds.length > 0
        ? "multiple-sourced-structures"
        : "not-loaded-at-far-lod";
  const rootClassName = className ? `${styles.universe} ${className}` : styles.universe;
  const lensNarrativeIds = `${lensDescriptionId} ${lensMeaningId} ${lensCaveatId}`;

  function changeLens(nextLensId: string) {
    setLensId(nextLensId);
    setLevel("universe");
    setClusterName(null);
    setClusterSelectedId(null);
    setUniverseZoom(STUDENT_UNIVERSE_ZOOM);
    setUniversePan({ x: 0, y: 0 });
    setSceneCamera(STUDENT_UNIVERSE_CAMERA);
    universeCameraRef.current = STUDENT_UNIVERSE_CAMERA;
    setUniverseNearZoomThreshold(1.08);
    autoFitPendingRef.current = true;
    commitViewportSelectionCamera(STUDENT_UNIVERSE_CAMERA);
    setCompareIds([]);
    setCompareMessage("");
    setDimension("3d");
    writeExploreHash("#universe");
  }

  function flyToCamera(destination: MolecularSceneCamera, duration = 420) {
    if (cameraAnimationRef.current !== null) {
      window.cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
    commitViewportSelectionCamera(destination);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lastCameraRef.current = destination;
      setSceneCamera(destination);
      setFlightActive(false);
      return;
    }

    const origin = lastCameraRef.current;
    let startedAt: number | null = null;
    setFlightActive(true);
    const advance = (now: number) => {
      startedAt ??= now;
      const linear = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - (1 - linear) ** 3;
      const camera = interpolateSceneCamera(origin, destination, eased);
      lastCameraRef.current = camera;
      setSceneCamera(camera);
      if (linear < 1) {
        cameraAnimationRef.current = window.requestAnimationFrame(advance);
        return;
      }
      cameraAnimationRef.current = null;
      setFlightActive(false);
    };
    cameraAnimationRef.current = window.requestAnimationFrame(advance);
  }

  function enterCluster(name: string) {
    const firstMolecule = visibleMolecules.find(
      (molecule) =>
        getLensValue(molecule, activeLensId, unclassifiedLabel) === name,
    );
    setClusterName(name);
    setClusterSelectedId(firstMolecule?.id ?? null);
    if (firstMolecule) setSelectedId(firstMolecule.id);
    if (level === "universe") universeCameraRef.current = lastCameraRef.current;
    clusterCameraRef.current = DEFAULT_MOLECULAR_SCENE_CAMERA;
    autoFitPendingRef.current = true;
    setUniversePan({ x: 0, y: 0 });
    setLevel("cluster");
    setDimension("3d");
    // Keep the live Universe camera until the real SDF bounds are available;
    // the ready callback then flies directly to the fitted cluster camera.
    setSceneCamera(lastCameraRef.current);
    const clusterToken = firstMolecule
      ? getLensKey(firstMolecule, activeLensId, unclassifiedLabel)
      : normalizeClusterToken(name);
    writeExploreHash(
      `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(clusterToken)}`,
    );
  }

  function toggleComparisonMolecule(molecule: UniverseMolecule) {
    setCompareMessage("");
    setCompareIds((current) => {
      if (current.includes(molecule.id)) {
        if (level === "compare" && current.length <= 2) {
          setCompareMessage(t("explore.compareNeedsTwo"));
          return current;
        }
        return current.filter((id) => id !== molecule.id);
      }
      if (current.length >= 4) {
        setCompareMessage(t("explore.compareLimit"));
        return current;
      }
      return [...current, molecule.id];
    });
  }

  function openComparison() {
    if (comparisonMolecules.length < 2) {
      setCompareMessage(t("explore.compareNeedsTwo"));
      return;
    }
    setCompareMessage("");
    if (comparisonMolecules[0]) setSelectedId(comparisonMolecules[0].id);
    if (level === "cluster") clusterCameraRef.current = lastCameraRef.current;
    setLevel("compare");
    setDimension("3d");
    flyToCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    writeExploreHash(
      `#compare/${comparisonMolecules
        .map((molecule) => encodeURIComponent(getMoleculeSlug(molecule.id)))
        .join(",")}`,
    );
  }

  function openMolecule(molecule: UniverseMolecule, animateFlight = false) {
    if (level === "universe") universeCameraRef.current = lastCameraRef.current;
    if (level === "cluster") clusterCameraRef.current = lastCameraRef.current;
    setSelectedId(molecule.id);
    setClusterName(getLensValue(molecule, activeLensId, unclassifiedLabel));
    setLevel("focus");
    if (animateFlight) flyToCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    else {
      cancelViewportSelectionUpdate();
      setSceneCamera(undefined);
    }
    setDimension("3d");
    setInspectorOpen(true);
    setTelemetry((current) => ({ ...current, selectedAtom: null }));
    writeExploreHash(`#molecule/${encodeURIComponent(getMoleculeSlug(molecule.id))}`);
    onMoleculeSelect?.(molecule);
  }

  async function selectIndexedResult(record: IndexedCatalogHit) {
    if (!indexedCatalog) return;
    indexedRequestRef.current += 1;
    setIndexedStatus("hydrating");
    setIndexedErrorMessage("");
    try {
      const molecule = await indexedCatalog.hydrate(record.id);
      if (!molecule) {
        setIndexedStatus("error");
        throw new Error("Catalog entity could not be hydrated.");
      }
      setQuery("");
      setIndexedPanelOpen(false);
      setIndexedStatus("ready");
      openMolecule(molecule, true);
    } catch (error) {
      setIndexedErrorMessage(error instanceof Error ? error.message : "Catalog hydration failed.");
      setIndexedStatus("error");
      throw error;
    }
  }

  function selectClusterMolecule(molecule: UniverseMolecule) {
    setClusterSelectedId(molecule.id);
    setSelectedId(molecule.id);
    setTelemetry((current) => ({ ...current, selectedAtom: null }));
    onMoleculeSelect?.(molecule);
  }

  function updateQuery(nextQuery: string) {
    const nextNormalizedQuery = normalizeSearchValue(nextQuery, locale);
    const nextMatches = nextNormalizedQuery
      ? molecules.filter((molecule) =>
          moleculeMatchesSearch(molecule, nextNormalizedQuery, locale),
        )
      : [];
    const nextSearchFitId = nextMatches.length === 1 ? nextMatches[0]?.id ?? null : null;
    setQuery(nextQuery);
    setSearchFitPendingId(nextSearchFitId);
    if (nextSearchFitId) {
      cancelViewportSelectionUpdate();
      setSceneCamera(undefined);
      return;
    }
    if (nextQuery.trim()) return;
    setUniverseZoom(STUDENT_UNIVERSE_ZOOM);
    setUniversePan({ x: 0, y: 0 });
    flyToCamera(STUDENT_UNIVERSE_CAMERA);
  }

  function showUniverse() {
    const destination = universeCameraRef.current;
    setLevel("universe");
    setClusterName(null);
    setClusterSelectedId(null);
    setUniverseZoom(cameraZoom(destination));
    setUniversePan({
      x: -destination.target.x * 18,
      y: destination.target.y * 18,
    });
    setDimension("3d");
    flyToCamera(destination);
    writeExploreHash("#universe");
    window.requestAnimationFrame(() => universeHeadingRef.current?.focus());
  }

  function showCluster() {
    if (
      !selectedClusterName
      || !clusters.some((cluster) => cluster.name === selectedClusterName)
    ) return showUniverse();
    setClusterName(selectedClusterName);
    setClusterSelectedId(selectedMolecule?.id ?? null);
    setUniversePan({ x: 0, y: 0 });
    setLevel("cluster");
    setDimension("3d");
    flyToCamera(clusterCameraRef.current);
    const clusterToken = selectedMolecule
      ? getLensKey(selectedMolecule, activeLensId, unclassifiedLabel)
      : normalizeClusterToken(selectedClusterName);
    writeExploreHash(
      `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(clusterToken)}`,
    );
  }

  function navigateSelectors(
    event: KeyboardEvent<HTMLButtonElement>,
    ids: readonly string[],
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % ids.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = ids.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextId = ids[nextIndex];
    if (nextId) selectorRefs.current.get(nextId)?.focus();
  }

  function applyCamera(nextCamera: MolecularSceneCamera) {
    lastCameraRef.current = nextCamera;
    setSceneCamera(nextCamera);
    if (level === "universe" || level === "cluster") {
      scheduleViewportSelectionCamera(nextCamera);
    }
    if (level === "universe") universeCameraRef.current = nextCamera;
    if (level === "cluster") clusterCameraRef.current = nextCamera;
    if (level === "universe") {
      setUniverseZoom(cameraZoom(nextCamera));
      setUniversePan({
        x: -nextCamera.target.x * 18,
        y: nextCamera.target.y * 18,
      });
    }
    setTelemetry((current) => ({ ...current, cameraRevision: current.cameraRevision + 1 }));
  }

  function resetCamera() {
    if (
      level === "focus" &&
      selectedMolecule &&
      eligibleIds.has(selectedMolecule.id)
    ) {
      scenePortRef.current?.focusMolecule(selectedMolecule.id);
      const resetCameraState = scenePortRef.current?.getCameraState();
      if (resetCameraState) {
        lastCameraRef.current = resetCameraState;
        setSceneCamera(resetCameraState);
      }
      setTelemetry((current) => ({ ...current, cameraRevision: current.cameraRevision + 1 }));
      return;
    }
    const fitted = scenePortRef.current?.fitVisibleMolecules();
    const resetState = fitted
      ?? (level === "universe" ? STUDENT_UNIVERSE_CAMERA : DEFAULT_MOLECULAR_SCENE_CAMERA);
    if (level === "universe" && fitted) {
      setUniverseNearZoomThreshold(
        cameraZoom(fitted) * CURATED_OVERVIEW_FAR_ZOOM_RATIO,
      );
    }
    applyCamera(resetState);
    if (level === "universe" || level === "cluster") {
      commitViewportSelectionCamera(resetState);
    }
  }

  function changeDimension(nextDimension: ViewerDimension) {
    setDimension(nextDimension);
    if (nextDimension !== "2d") return;
    scenePortRef.current?.highlightAtom(null);
    setTelemetry((current) => ({ ...current, selectedAtom: null }));
  }

  function closeInspectorAndRestoreFocus() {
    setInspectorOpen(false);
    window.requestAnimationFrame(() => inspectorToggleRef.current?.focus());
  }

  useEffect(() => {
    onMoleculeSelectRef.current = onMoleculeSelect;
  }, [onMoleculeSelect]);

  useEffect(() => {
    let disposed = false;
    let hashRequestRevision = 0;

    const enterHashMolecule = (molecule: UniverseMolecule) => {
      setSelectedId(molecule.id);
      setClusterSelectedId(molecule.id);
      setClusterName(getLensValue(molecule, activeLensId, unclassifiedLabel));
      setLevel("focus");
      cancelViewportSelectionUpdate();
      setSceneCamera(undefined);
      setDimension("3d");
      setInspectorOpen(true);
      setTelemetry((current) => ({ ...current, selectedAtom: null }));
      onMoleculeSelectRef.current?.(molecule);
    };

    const enterHashUniverse = () => {
      const restoredCamera = universeCameraRef.current;
      setLevel("universe");
      setClusterName(null);
      setClusterSelectedId(null);
      setDimension("3d");
      setUniverseZoom(cameraZoom(restoredCamera));
      setUniversePan({
        x: -restoredCamera.target.x * 18,
        y: restoredCamera.target.y * 18,
      });
      setSceneCamera(restoredCamera);
      commitViewportSelectionCamera(restoredCamera);
    };

    const normalizeUnavailableEntityHash = (errorMessage?: string) => {
      window.history.replaceState(null, "", "#universe");
      setIndexedStatus(errorMessage ? "error" : "ready");
      setIndexedErrorMessage(errorMessage ?? "");
      setIndexedPanelOpen(Boolean(errorMessage));
      setCompareIds([]);
      setCompareMessage("");
      enterHashUniverse();
    };

    async function syncFromHash() {
      const requestRevision = hashRequestRevision + 1;
      hashRequestRevision = requestRevision;
      const hash = window.location.hash;
      const isStale = () =>
        disposed ||
        requestRevision !== hashRequestRevision ||
        window.location.hash !== hash;

      if (hash.startsWith("#molecule/")) {
        let slug: string;
        try {
          slug = decodeURIComponent(hash.slice("#molecule/".length));
        } catch {
          normalizeUnavailableEntityHash();
          return;
        }
        const residentMolecule = molecules.find(
          (candidate) => candidate.id === slug || getMoleculeSlug(candidate.id) === slug,
        );
        if (residentMolecule) {
          enterHashMolecule(residentMolecule);
          return;
        }
        // The initial scene window is intentionally bounded. Wait for the
        // compact full-catalog index instead of treating a non-resident record
        // as unavailable or hydrating unrelated shards.
        if (!indexedCatalog) return;

        setIndexedStatus("hydrating");
        setIndexedErrorMessage("");
        try {
          const record = await indexedCatalog.resolveStableSlug(slug);
          if (isStale()) return;
          if (!record) {
            normalizeUnavailableEntityHash();
            return;
          }
          const hydratedMolecule = await indexedCatalog.hydrate(record.id);
          if (isStale()) return;
          if (!hydratedMolecule) {
            normalizeUnavailableEntityHash();
            return;
          }
          setIndexedStatus("ready");
          enterHashMolecule(hydratedMolecule);
          if (record.stableSlug !== slug) {
            window.history.replaceState(
              null,
              "",
              `#molecule/${encodeURIComponent(record.stableSlug)}`,
            );
          }
        } catch (error) {
          if (isStale()) return;
          normalizeUnavailableEntityHash(
            error instanceof Error ? error.message : "Catalog permalink hydration failed.",
          );
        }
        return;
      }
      if (hash.startsWith("#compare/")) {
        const rawSlugs = hash.slice("#compare/".length).split(",");
        if (rawSlugs.length < 2 || rawSlugs.length > 4 || rawSlugs.some((value) => !value)) {
          normalizeUnavailableEntityHash();
          return;
        }
        const decodedSlugs: string[] = [];
        try {
          for (const value of rawSlugs) decodedSlugs.push(decodeURIComponent(value));
        } catch {
          normalizeUnavailableEntityHash();
          return;
        }
        const uniqueSlugs = [...new Set(decodedSlugs)];
        if (uniqueSlugs.length < 2) {
          normalizeUnavailableEntityHash();
          return;
        }

        const residentBySlug = new Map<string, UniverseMolecule>();
        const unresolvedSlugs: string[] = [];
        for (const slug of uniqueSlugs) {
          const molecule = molecules.find(
            (candidate) => candidate.id === slug || getMoleculeSlug(candidate.id) === slug,
          );
          if (molecule) residentBySlug.set(slug, molecule);
          else unresolvedSlugs.push(slug);
        }
        if (unresolvedSlugs.length > 0 && !indexedCatalog) return;

        setIndexedStatus(unresolvedSlugs.length > 0 ? "hydrating" : "ready");
        setIndexedErrorMessage("");
        try {
          const resolvedHits = indexedCatalog
            ? await Promise.all(
                unresolvedSlugs.map((slug) => indexedCatalog.resolveStableSlug(slug)),
              )
            : [];
          if (isStale()) return;
          if (resolvedHits.some((hit) => !hit)) {
            normalizeUnavailableEntityHash();
            return;
          }
          const exactHits = resolvedHits.flatMap((hit) => (hit ? [hit] : []));
          const hydrated = indexedCatalog
            ? await Promise.all(
                exactHits.map((hit) => indexedCatalog.hydrate(hit.id)),
              )
            : [];
          if (isStale()) return;
          if (hydrated.some((molecule) => !molecule)) {
            normalizeUnavailableEntityHash();
            return;
          }
          for (let index = 0; index < unresolvedSlugs.length; index += 1) {
            const slug = unresolvedSlugs[index];
            const molecule = hydrated[index];
            if (slug && molecule) residentBySlug.set(slug, molecule);
          }
        } catch (error) {
          if (isStale()) return;
          normalizeUnavailableEntityHash(
            error instanceof Error
              ? error.message
              : "Catalog compare permalink hydration failed.",
          );
          return;
        }

        const selected: UniverseMolecule[] = [];
        const selectedIds = new Set<string>();
        for (const slug of uniqueSlugs) {
          const molecule = residentBySlug.get(slug);
          if (!molecule || selectedIds.has(molecule.id)) continue;
          selected.push(molecule);
          selectedIds.add(molecule.id);
        }
        if (selected.length < 2 || selected.length > 4) {
          normalizeUnavailableEntityHash();
          return;
        }
        setIndexedStatus("ready");
        setIndexedPanelOpen(false);
        setCompareMessage("");
        setCompareIds(selected.map((molecule) => molecule.id));
        setSelectedId(selected[0]!.id);
        setClusterName(getLensValue(selected[0]!, activeLensId, unclassifiedLabel));
        setLevel("compare");
        setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
        commitViewportSelectionCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
        setDimension("3d");
        setTelemetry((current) => ({ ...current, selectedAtom: null }));
        return;
      }
      if (hash.startsWith("#cluster/")) {
        const [, encodedLens = "", encodedCluster = ""] = hash.split("/");
        try {
          const nextLensId = decodeURIComponent(encodedLens);
          const nextLens = lenses.find((lens) => lens.id === nextLensId);
          const nextClusterName = decodeURIComponent(encodedCluster);
          if (!nextLens || !nextClusterName) {
            normalizeUnavailableEntityHash();
            return;
          }
          const nextClusterMolecules = molecules.filter(
            (molecule) =>
              acceptsClusterToken(
                molecule,
                nextLens.id,
                nextClusterName,
                unclassifiedLabel,
              ),
          );
          const firstProjectedMolecule = nextClusterMolecules.find(
            (molecule) => Boolean(molecule.coordinates?.[nextLens.id]),
          );
          if (!firstProjectedMolecule) {
            normalizeUnavailableEntityHash();
            return;
          }
          const canonicalClusterName = getLensValue(
            firstProjectedMolecule,
            nextLens.id,
            unclassifiedLabel,
          );
          const canonicalClusterToken = getLensKey(
            firstProjectedMolecule,
            nextLens.id,
            unclassifiedLabel,
          );
          setLensId(nextLens.id);
          setClusterName(canonicalClusterName);
          setClusterSelectedId(firstProjectedMolecule.id);
          setSelectedId(firstProjectedMolecule.id);
          setLevel("cluster");
          clusterCameraRef.current = DEFAULT_MOLECULAR_SCENE_CAMERA;
          autoFitPendingRef.current = true;
          setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
          commitViewportSelectionCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
          setDimension("3d");
          setUniversePan({ x: 0, y: 0 });
          window.history.replaceState(
            null,
            "",
            `#cluster/${encodeURIComponent(nextLens.id)}/${encodeURIComponent(canonicalClusterToken)}`,
          );
        } catch {
          normalizeUnavailableEntityHash();
        }
        return;
      }
      enterHashUniverse();
    }
    const handleLocationChange = () => void syncFromHash();
    const frame = window.requestAnimationFrame(handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      disposed = true;
      hashRequestRevision += 1;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, [
    activeLensId,
    cancelViewportSelectionUpdate,
    commitViewportSelectionCamera,
    indexedCatalog,
    lenses,
    molecules,
    unclassifiedLabel,
  ]);

  useEffect(() => {
    if (level !== "cluster" || !selectedMolecule) return;
    const localizedClusterName = getLensValue(
      selectedMolecule,
      activeLensId,
      unclassifiedLabel,
    );
    const canonicalClusterToken = getLensKey(
      selectedMolecule,
      activeLensId,
      unclassifiedLabel,
    );
    const canonicalHash = `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(canonicalClusterToken)}`;
    if (
      localizedClusterName === clusterName
      && window.location.hash === canonicalHash
    ) return;
    const frame = window.requestAnimationFrame(() => {
      if (localizedClusterName !== clusterName) setClusterName(localizedClusterName);
      if (window.location.hash !== canonicalHash) {
        window.history.replaceState(null, "", canonicalHash);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeLensId, clusterName, level, locale, selectedMolecule, unclassifiedLabel]);

  const focusHeadingSelectionId = level === "focus" ? selectedId : null;

  useEffect(() => {
    if (sceneCamera) lastCameraRef.current = sceneCamera;
  }, [sceneCamera]);

  useEffect(
    () => () => {
      if (cameraAnimationRef.current !== null) {
        window.cancelAnimationFrame(cameraAnimationRef.current);
      }
      cancelViewportSelectionUpdate();
    },
    [cancelViewportSelectionUpdate],
  );

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (indexedPanelOpen) {
        setIndexedPanelOpen(false);
        return;
      }
      if (query) return updateQuery("");
      if (level === "focus") showCluster();
      else if (level === "compare") showCluster();
      else if (level === "cluster") showUniverse();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  useEffect(() => {
    if (level === "universe") return;
    const frame = window.requestAnimationFrame(() => {
      if (level === "cluster") clusterHeadingRef.current?.focus();
      else if (level === "compare") compareHeadingRef.current?.focus();
      else focusHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveClusterName, focusHeadingSelectionId, level]);

  const levelAnnouncement =
    level === "universe"
      ? t("explore.universeAnnouncement", { count: clusters.length })
      : level === "cluster"
        ? t("explore.clusterAnnouncement", {
            name: effectiveClusterName ?? t("explore.level.cluster"),
            count: clusterMolecules.length,
          })
        : level === "compare"
          ? t("explore.compareSelected", { count: comparisonMolecules.length })
          : t("explore.focusAnnouncement", {
            name: selectedMolecule?.name ?? t("explore.level.focus"),
          });
  const provenanceBanner = getStructureProvenancePresentation({
    dimension,
    origin:
      dimension === "2d"
        ? selectedMolecule?.structure?.twoDOriginLabel
        : selectedMolecule?.structure?.originLabel,
    sourceLabel:
      dimension === "2d"
        ? selectedMolecule?.structure?.twoDSourceLabel
        : selectedMolecule?.structure?.sourceLabel,
    sourceId:
      dimension === "2d"
        ? selectedMolecule?.structure?.twoDSourceId
        : selectedMolecule?.structure?.sourceId,
  }, locale);
  const threeDProvenance = getStructureProvenancePresentation({
    dimension: "3d",
    origin: selectedMolecule?.structure?.originLabel,
    sourceLabel: selectedMolecule?.structure?.sourceLabel,
    sourceId: selectedMolecule?.structure?.sourceId,
  }, locale);
  const twoDProvenance = getStructureProvenancePresentation({
    dimension: "2d",
    origin: selectedMolecule?.structure?.twoDOriginLabel,
    sourceLabel: selectedMolecule?.structure?.twoDSourceLabel,
    sourceId: selectedMolecule?.structure?.twoDSourceId,
  }, locale);
  const threeDControlsDisabled =
    dimension === "2d" ||
    selectedStructureMissing ||
    (level === "focus" && telemetry.status === "error");
  const activeSceneScopeCount = level === "cluster"
    ? clusterMolecules.length
    : level === "universe"
      ? mapMolecules.length
      : sceneVisibleIds.length;
  const remainingSceneScopeCount = Math.max(
    0,
    activeSceneScopeCount - sceneVisibleIds.length,
  );

  return (
    <section
      className={rootClassName}
      aria-labelledby={headingId}
      data-explore-level={level}
      data-presentation-mode={presentationMode}
    >
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <p className={styles.eyebrow}>{resolvedEyebrow}</p>
          <h2 ref={universeHeadingRef} id={headingId} tabIndex={-1}>{resolvedTitle}</h2>
          <p className={styles.description}>{resolvedDescription}</p>
        </div>
        <div className={styles.headerSummary} aria-label={t("explore.atlasSummary")}>
          <span>
            {interpolateIndexedCopy(catalogCopy.sceneSample, {
              count: sceneVisibleIds.length,
            })}
          </span>
          <span>{t("explore.clusterCount", { count: clusters.length })}</span>
          <span>
            <strong>
              {level === "universe"
                ? t("explore.level.universe")
                : level === "cluster"
                  ? t("explore.level.cluster")
                  : level === "compare"
                    ? t("explore.level.compare")
                    : t("explore.level.focus")}
            </strong>
          </span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div
          className={styles.searchField}
          data-indexed-search={indexedCatalog ? indexedStatus : "disabled"}
          data-indexed-error={presentationMode === "reviewer" ? indexedErrorMessage : undefined}
        >
          <div className={styles.searchLabelRow}>
            <label htmlFor={searchId}>{t("explore.searchLabel")}</label>
            {indexedCatalog ? (
              <button
                ref={catalogButtonRef}
                type="button"
                aria-expanded={indexedPanelOpen}
                onClick={() => {
                  setIndexedPanelOpen(true);
                }}
              >
                {catalogCopy.browse}
              </button>
            ) : null}
          </div>
          <div className={styles.searchControl}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder={t("explore.searchPlaceholder")}
              autoComplete="off"
              onChange={(event) => updateQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => updateQuery("")}
              >
                {t("common.clear")}
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.lensPanel} data-open={lensDrawerOpen ? "true" : "false"}>
          <button
            type="button"
            className={styles.lensDisclosureButton}
            aria-expanded={lensDrawerOpen}
            aria-controls={lensDrawerId}
            onClick={() => setLensDrawerOpen((current) => !current)}
          >
            <span>{t("explore.lensLabel")}</span>
            <strong>{activeLens?.label ?? t("explore.lensLabel")}</strong>
            <i aria-hidden="true">{lensDrawerOpen ? "−" : "+"}</i>
          </button>
          {lensDrawerOpen ? (
            <div
              id={lensDrawerId}
              className={styles.lensDrawer}
              role="region"
              aria-label={t("explore.lensLabel")}
            >
              <div className={styles.lensButtons} role="group" aria-label={t("explore.lensLabel")} aria-describedby={lensNarrativeIds}>
                {lenses.map((lens) => (
                  <button
                    key={lens.id}
                    type="button"
                    className={styles.lensButton}
                    aria-pressed={lens.id === activeLensId}
                    onClick={() => {
                      changeLens(lens.id);
                      setLensDrawerOpen(false);
                    }}
                  >
                    {lens.label}
                  </button>
                ))}
              </div>
              <div
                className={styles.lensNarrative}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-lens-announcement={activeLensId}
              >
                <span id={lensDescriptionId} className={styles.lensDescription}>
                  {activeLens?.description ?? t("explore.lens.categoricalPlacement")}
                </span>
                <span id={lensMeaningId} className={styles.lensMeaning}>
                  <strong>{t("explore.lens.represents")}</strong>{" "}
                  {activeLens?.meaning ?? t("explore.lens.categoricalPlacement")}
                </span>
                <span id={lensCaveatId} className={styles.lensCaveat}>
                  <strong>{t("explore.lens.doesNotRepresent")}</strong>{" "}
                  {activeLens?.doesNotMean ?? t("explore.lens.caveat")}
                </span>
              </div>
              {presentationMode === "student" ? (
                <span className={styles.studentHint}>{t("explore.studentHint")}</span>
              ) : null}
              {presentationMode === "reviewer" && (activeLens?.algorithmVersion || activeLens?.inputHash) ? (
                <span className={styles.lensTechnical}>
                  {activeLens.algorithm ?? t("explore.lens.projection")} ·{" "}
                  {activeLens.algorithmVersion ?? t("explore.lens.versionMissing")} ·{" "}
                  {activeLens.inputHash ?? t("explore.lens.inputHashMissing")}
                </span>
              ) : null}
              {presentationMode === "reviewer" && unprojectedMoleculeCount > 0 ? (
                <span className={styles.lensTechnical} role="status">
                  {t("explore.lens.unprojected", { count: unprojectedMoleculeCount })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {catalogBrowseNavigator ? (
        <CatalogBrowseDrawer
          open={indexedPanelOpen}
          onOpenChange={setIndexedPanelOpen}
          navigator={catalogBrowseNavigator}
          catalogRecordCount={catalogRecordCount}
          sceneSampleCount={sceneVisibleIds.length}
          locale={locale}
          classify={classifyCatalogHit}
          returnFocusRef={catalogButtonRef}
          onSelect={selectIndexedResult}
        />
      ) : null}

      <nav className={styles.breadcrumb} aria-label={t("explore.breadcrumbLabel")}>
        <button type="button" onClick={showUniverse} aria-current={level === "universe" ? "page" : undefined}>
          {t("explore.level.universe")}
        </button>
        {level !== "universe" && effectiveClusterName ? <><span>/</span><button type="button" onClick={() => enterCluster(effectiveClusterName)} aria-current={level === "cluster" ? "page" : undefined}>{effectiveClusterName}</button></> : null}
        {level === "compare" ? <><span>/</span><span aria-current="page">{t("explore.level.compare")}</span></> : null}
        {level === "focus" && selectedMolecule ? <><span>/</span><span aria-current="page">{selectedMolecule.name}</span></> : null}
        <p>{activeLens?.label}</p>
      </nav>

      <p className={styles.srOnly} aria-live="polite">{levelAnnouncement}</p>
      {presentationMode === "reviewer" ? (
        <ul className={styles.srOnly} aria-label={t("explore.evidenceStatuses")} data-reviewer-only="true">
          {visibleMolecules.map((molecule) => (
            <li key={molecule.id}>
              {molecule.name}: {molecule.evidenceLabel ?? t("explore.evidenceStatusMissing")}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={exploreStageRef}
        className={styles.exploreStage}
        data-level={level}
        data-flight={flightActive ? "active" : "idle"}
        style={
          level === "universe" && sceneFirstViewportHeight !== null
            ? {
                "--explore-stage-viewport-height": `${sceneFirstViewportHeight}px`,
              } as ExploreStageStyle
            : undefined
        }
      >
        <div
          className={styles.sceneTelemetry}
          data-lod-level={lodLevel}
          data-active-webgl-contexts={telemetry.activeContexts}
          data-visible-count={effectiveLoadedCount}
          data-visible-molecule-count={effectiveLoadedCount}
          data-scene-sample-count={sceneVisibleIds.length}
          data-layout-minimum-gap={telemetry.layoutMinimumGap ?? 0}
          data-overlap-count={telemetry.overlapCount}
          data-clipped-molecule-count={telemetry.clippedMoleculeCount}
          data-visible-label-count={level === "universe" ? clusters.length : 0}
          data-label-collision-count={level === "universe" ? labelCollisionCount : 0}
          data-selected-molecule={
            level === "focus"
              ? selectedMolecule?.id ?? ""
              : level === "compare"
                ? compareIds.join(",")
              : level === "cluster"
                ? effectiveClusterSelectedId ?? ""
                : ""
          }
          data-structure-origin={structureOrigin}
          data-camera-revision={telemetry.cameraRevision}
          data-selected-atom={telemetry.selectedAtom ? `${telemetry.selectedAtom.moleculeId}:${telemetry.selectedAtom.atomIndex}` : "none"}
          data-representation={representation}
          data-hydrogens={showHydrogens ? "visible" : "hidden"}
          data-scene-status={effectiveSceneStatus}
          data-visible-molecules={sceneVisibleIds.join(",")}
        >
          <SharedMolecularScene
            className={dimension === "2d" ? styles.sceneHidden : styles.sharedScene}
            molecules={sceneMolecules}
            visibleMoleculeIds={sceneVisibleIds}
            levelOfDetail={sceneLevel}
            focusedMoleculeId={
              dimension === "3d"
                ? level === "focus"
                  ? selectedMolecule && eligibleIds.has(selectedMolecule.id)
                    ? selectedMolecule.id
                    : null
                  : searchFocusedId && eligibleIds.has(searchFocusedId)
                    ? searchFocusedId
                    : null
                : null
            }
            emphasizedMoleculeId={
              dimension === "3d" &&
              level === "cluster" &&
              effectiveClusterSelectedId &&
              eligibleIds.has(effectiveClusterSelectedId)
                ? effectiveClusterSelectedId
                : null
            }
            representation={representation}
            showHydrogens={showHydrogens}
            camera={
              searchFocusedId && searchFitPendingId === searchFocusedId
                ? undefined
                : sceneCamera
            }
            interactionMode={level === "universe" || level === "compare" ? "pan" : interactionMode}
            ariaLabel={
              level === "focus"
                ? t("explore.focusSceneAria", {
                    name: selectedMolecule?.name ?? t("explore.level.focus"),
                  })
                : level === "compare"
                  ? t("explore.compareSubtitle")
                  : t("explore.sceneAria")
            }
            onSceneReady={(port) => {
              scenePortRef.current = port;
              setTelemetry((current) => ({
                ...current,
                activeContexts: getActiveMolecularSceneContextCount(),
              }));
            }}
            onMoleculeBoundsChange={(screenBounds) => {
              setTelemetry((current) => ({
                ...current,
                labelAvoidanceZones: screenBounds.map((bounds) => ({
                  ...bounds,
                  id: bounds.moleculeId,
                })),
              }));
            }}
            onStatusChange={(detail) => {
              const layout = scenePortRef.current?.getLayoutMetrics();
              const screenBounds = scenePortRef.current
                ?.getVisibleMoleculeScreenBounds()
                .map((bounds) => ({ ...bounds, id: bounds.moleculeId })) ?? [];
              setTelemetry((current) => ({
                ...current,
                status: detail.status,
                loadedCount: detail.loadedMoleculeCount,
                layoutMinimumGap: layout?.minimumGap ?? null,
                overlapCount: layout?.overlapCount ?? 0,
                clippedMoleculeCount: layout?.clippedMoleculeCount ?? 0,
                labelAvoidanceZones: screenBounds,
              }));
              if (
                detail.status !== "ready"
                || detail.loadedMoleculeCount === 0
                || !autoFitPendingRef.current
                || (level !== "universe" && level !== "cluster")
              ) return;
              autoFitPendingRef.current = false;
              const rawFittedCamera = scenePortRef.current?.fitVisibleMolecules();
              if (!rawFittedCamera) return;
              const fittedCamera = rawFittedCamera;
              if (level === "universe") {
                applyFittedUniverseCamera(fittedCamera, sceneViewportKey);
              } else {
                clusterCameraRef.current = fittedCamera;
                flyToCamera(fittedCamera, 360);
              }
            }}
            onComparisonAnalysis={setComparisonAnalysis}
            onCameraChange={(camera) => {
              lastCameraRef.current = camera;
              if (level === "universe" || level === "cluster") {
                scheduleViewportSelectionCamera(camera);
              }
              if (level === "universe") universeCameraRef.current = camera;
              if (level === "cluster") clusterCameraRef.current = camera;
              if (searchFocusedId && searchFitPendingId === searchFocusedId) {
                setSceneCamera(camera);
                setSearchFitPendingId(null);
              }
              if (level === "universe") {
                setUniverseZoom(cameraZoom(camera));
                setUniversePan({
                  x: -camera.target.x * 18,
                  y: camera.target.y * 18,
                });
              }
              setTelemetry((current) => ({ ...current, cameraRevision: current.cameraRevision + 1 }));
            }}
            onAtomSelect={(atom) => {
              setTelemetry((current) => ({ ...current, selectedAtom: atom }));
              if (level !== "cluster" || !atom) return;
              const molecule = molecules.find((candidate) => candidate.id === atom.moleculeId);
              if (molecule) selectClusterMolecule(molecule);
            }}
          />

          {level === "focus" && dimension === "2d" && selectedMolecule?.structure?.twoDUrl ? (
            <div className={styles.twoDStage} data-structure-origin={selectedMolecule.structure.twoDOriginLabel ?? "database-2d-record"}>
              <MoleculeStructurePreview
                structureUrl={selectedMolecule.structure.twoDUrl}
                moleculeName={selectedMolecule.name}
                expectedPubChemCid={selectedMolecule.structure.pubChemCid}
                showHydrogens={showHydrogens}
              />
            </div>
          ) : null}

          {selectedStructureMissing ? (
            <div className={styles.missingStructure} role="alert">
              <strong>{t("explore.missingStructureTitle")}</strong>
              <p>{t("explore.missingStructureBody")}</p>
            </div>
          ) : null}

          {level !== "focus" && activeSceneGapCount > 0 ? (
            <div
              className={styles.structureGapStatus}
              role={effectiveLoadedCount === 0 ? "alert" : "status"}
            >
              {unavailableSceneMolecules.length > 0 ? (
                <div>
                  <strong>
                    {t("explore.missing3dRecords", {
                      count: unavailableSceneMolecules.length,
                    })}
                  </strong>
                  <span>
                    {t("explore.noInventedGeometry", {
                      names: unavailableSceneMolecules
                        .map((molecule) => molecule.name)
                        .join(", "),
                    })}
                  </span>
                </div>
              ) : null}
              {unprojectedSceneMolecules.length > 0 ? (
                <div>
                  <strong>
                    {t("explore.missingProjectionRecords", {
                      count: unprojectedSceneMolecules.length,
                    })}
                  </strong>
                  <span>
                    {t("explore.noInventedPlacement", {
                      names: unprojectedSceneMolecules
                        .map((molecule) => molecule.name)
                        .join(", "),
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {level === "universe" ? (
            <div className={styles.clusterLayer} data-near={lodLevel === "near" ? "true" : "false"}>
              {lodLevel === "far" ? (
                <div
                  className={styles.farClusterWorld}
                  style={{
                    transform: `translate3d(${universePan.x}px, ${universePan.y}px, 0) scale(${universeZoom})`,
                  }}
                >
                  {clusters.map((cluster, index) => {
                    const selectorId = `cluster:${cluster.name}`;
                    return (
                      <button
                        key={cluster.name}
                        ref={(node) => { if (node) selectorRefs.current.set(selectorId, node); else selectorRefs.current.delete(selectorId); }}
                        type="button"
                        className={styles.clusterGlyph}
                        style={{ "--x": `${cluster.position.x}%`, "--y": `${cluster.position.y}%`, "--accent": cluster.molecules[0]?.accent ?? "#8be1c4" } as ClusterStyle}
                        aria-label={t("explore.clusterAria", {
                          name: cluster.name,
                          count: cluster.molecules.length,
                        })}
                        onClick={() => enterCluster(cluster.name)}
                        onKeyDown={(event) => navigateSelectors(event, clusters.map((item) => `cluster:${item.name}`), index)}
                      >
                        <i aria-hidden="true"><b /><b /><b /></i>
                        <span>
                          <strong>{cluster.name}</strong>
                          <small>
                            {t("explore.moleculeCount", {
                              visible: cluster.molecules.length,
                              total: cluster.molecules.length,
                            })}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.nearClusterWorld}>
                  <ul className={styles.nearClusterRegions} aria-label={t("explore.clusterNearNavigation")}>
                    {displayedClusters.map((cluster, index) => {
                      const selectorId = `cluster:${cluster.name}`;
                      return (
                        <li
                          key={cluster.name}
                          style={{
                            "--x": `${cluster.position.x}%`,
                            "--y": `${cluster.position.y}%`,
                            "--accent": cluster.molecules[0]?.accent ?? "#8be1c4",
                          } as ClusterStyle}
                        >
                          <button
                            ref={(node) => { if (node) selectorRefs.current.set(selectorId, node); else selectorRefs.current.delete(selectorId); }}
                            type="button"
                            aria-label={t("explore.clusterAria", {
                              name: cluster.name,
                              count: cluster.molecules.length,
                            })}
                            onClick={() => enterCluster(cluster.name)}
                            onKeyDown={(event) => navigateSelectors(event, displayedClusters.map((item) => `cluster:${item.name}`), index)}
                          >
                            <span aria-hidden="true" />
                            <strong>{cluster.name}</strong>
                            <small>{cluster.molecules.length}</small>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className={styles.universeCamera} role="group" aria-label={t("explore.universeZoom")}>
                <button type="button" aria-label={t("explore.zoomOut")} onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, 180))}>−</button>
                <output>{Math.round(universeZoom * 100)}%</output>
                <button type="button" aria-label={t("explore.zoomIn")} onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, -180))}>+</button>
                <button type="button" onClick={resetCamera}>{t("explore.center")}</button>
              </div>
              <p className={styles.lodStatus}>
                {lodLevel === "far"
                  ? t("explore.lodFar")
                  : remainingSceneScopeCount > 0
                    ? interpolateIndexedCopy(catalogCopy.sceneSampleMore, {
                        shown: sceneVisibleIds.length,
                        remaining: remainingSceneScopeCount,
                      })
                    : t("explore.lodNear", { count: sceneVisibleIds.length })}
              </p>
            </div>
          ) : null}

          {level === "cluster" ? (
            <div className={styles.clusterOverlay}>
              <header>
                <p>{activeLens?.label} / {t("explore.level.cluster")}</p>
                <h3 ref={clusterHeadingRef} tabIndex={-1}>
                  {effectiveClusterName ?? t("explore.level.cluster")}
                </h3>
                <span>
                  {presentationMode === "reviewer"
                    ? `${t("explore.educationalClassification")} · ${presentVerificationStatus(activeLens?.verificationStatus, t)}`
                    : t("explore.compareSelectionHint")}
                </span>
              </header>
              <div className={styles.compareToolbar}>
                <div>
                  <strong>{t("explore.compare")}</strong>
                  <span>{compareMessage || t("explore.compareSelectionHint")}</span>
                </div>
                <button
                  type="button"
                  disabled={comparisonMolecules.length < 2}
                  onClick={openComparison}
                >
                  {t("explore.compareSelected", { count: comparisonMolecules.length })}
                </button>
              </div>
              {clusterMolecules.length > 0 ? (
                <ul
                  className={styles.moleculeSelectors}
                  aria-label={t("explore.clusterMoleculesAria", {
                    name: effectiveClusterName ?? t("explore.level.cluster"),
                  })}
                >
                  {clusterMolecules.map((molecule, index) => {
                    const selectorId = `molecule:${molecule.id}`;
                    const isSelected = molecule.id === effectiveClusterSelectedId;
                    return (
                      <li
                        key={molecule.id}
                        data-selected={isSelected ? "true" : "false"}
                        data-compare={compareIds.includes(molecule.id) ? "true" : "false"}
                      >
                        <button
                          ref={(node) => { if (node) selectorRefs.current.set(selectorId, node); else selectorRefs.current.delete(selectorId); }}
                          type="button"
                          className={styles.moleculeSelectButton}
                          aria-label={t("explore.selectMoleculeAria", { name: molecule.name })}
                          aria-pressed={isSelected}
                          onClick={() => selectClusterMolecule(molecule)}
                          onKeyDown={(event) => navigateSelectors(event, clusterMolecules.map((item) => `molecule:${item.id}`), index)}
                        >
                          <strong>{molecule.name}</strong>
                          <small>{molecule.formula ?? t("explore.formulaMissing")}</small>
                          <i data-tone={molecule.evidenceTone ?? "unknown"} />
                        </button>
                        <button
                          type="button"
                          className={styles.moleculeFocusButton}
                          aria-label={t("explore.openFocusAria", { name: molecule.name })}
                          onClick={() => openMolecule(molecule)}
                        >
                          {t("explore.level.focus")}
                        </button>
                        <button
                          type="button"
                          className={styles.compareSelectButton}
                          aria-pressed={compareIds.includes(molecule.id)}
                          aria-label={
                            compareIds.includes(molecule.id)
                              ? t("explore.removeFromCompare", { name: molecule.name })
                              : t("explore.addToCompare", { name: molecule.name })
                          }
                          onClick={() => toggleComparisonMolecule(molecule)}
                        >
                          {compareIds.includes(molecule.id) ? "✓" : "+"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.emptyState}>
                  <strong>{t("explore.noMatches")}</strong>
                  <button type="button" onClick={() => setQuery("")}>
                    {t("explore.clearSearch")}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {level === "compare" ? (
            <div className={styles.compareOverlay}>
              <header>
                <div>
                  <p>{activeLens?.label} / {t("explore.level.compare")}</p>
                  <h3 ref={compareHeadingRef} tabIndex={-1}>{t("explore.compareTitle")}</h3>
                  <span>{t("explore.compareSubtitle")}</span>
                </div>
                <button type="button" onClick={showCluster}>{t("explore.backToRegion")}</button>
              </header>
              <div
                className={styles.compareScaffold}
                data-graph-comparison={activeComparisonAnalysis ? "ready" : "loading"}
              >
                <span>{catalogCopy.commonCore}</span>
                <strong>
                  {activeComparisonAnalysis
                    ? interpolateIndexedCopy(catalogCopy.commonCoreSummary, {
                        atoms: activeComparisonAnalysis.commonCoreAtomCount,
                        bonds: activeComparisonAnalysis.commonCoreBondCount,
                      })
                    : catalogCopy.commonCorePending}
                </strong>
                {comparisonFingerprintScore !== null ? (
                  <small>
                    {interpolateIndexedCopy(catalogCopy.fingerprintSummary, {
                      score: comparisonFingerprintScore,
                    })}
                  </small>
                ) : null}
                <div className={styles.compareMaskLegend} aria-label={catalogCopy.commonCore}>
                  <span data-mask="common">{catalogCopy.commonMask}</span>
                  <span data-mask="changed">{catalogCopy.changedMask}</span>
                </div>
                <small>{catalogCopy.comparisonBoundary}</small>
                {commonComparisonScaffold ? (
                  <small>{t("explore.compareCommonScaffold")}: {commonComparisonScaffold}</small>
                ) : null}
              </div>
              <ul className={styles.compareCards}>
                {comparisonMolecules.map((molecule) => {
                  const changedMask = activeComparisonAnalysis?.masks.find(
                    (mask) => mask.moleculeId === molecule.id,
                  );
                  const changedElements = changedMask
                    ? Object.entries(changedMask.changedElements)
                        .map(([element, count]) => `${element}×${count}`)
                        .join(" · ")
                    : "";
                  return (
                  <li key={molecule.id} style={{ "--accent": molecule.accent ?? "#8be1c4" } as CSSProperties}>
                    <span>{molecule.formula ?? t("explore.formulaMissing")}</span>
                    <strong>{molecule.name}</strong>
                    <small>{molecule.studentProfile?.scaffoldFamily ?? getLensValue(molecule, "scaffold", unclassifiedLabel)}</small>
                    {changedMask ? (
                      <p>
                        <span>{catalogCopy.changedGroups}</span>
                        {changedElements || catalogCopy.changedNone}
                      </p>
                    ) : null}
                    <div>
                      <button type="button" onClick={() => openMolecule(molecule)}>{t("explore.openPassport")}</button>
                      <button
                        type="button"
                        aria-label={t("explore.removeFromCompare", { name: molecule.name })}
                        onClick={() => toggleComparisonMolecule(molecule)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
              {compareMessage ? <p className={styles.compareMessage} role="status">{compareMessage}</p> : null}
            </div>
          ) : null}

          {level === "focus" && selectedMolecule ? (
            <div className={styles.focusOverlay} data-inspector={inspectorOpen ? "open" : "closed"}>
              <header className={styles.focusHeader}>
                <div>
                  <p>
                    {t("explore.level.focus")} /{" "}
                    {selectedMolecule.formula ?? t("explore.formulaMissing")}
                  </p>
                  <h3 ref={focusHeadingRef} tabIndex={-1}>{selectedMolecule.name}</h3>
                </div>
                <div className={styles.focusActions}>
                  <button type="button" onClick={showCluster}>
                    {t("explore.backToCluster")}
                  </button>
                  <button
                    ref={inspectorToggleRef}
                    type="button"
                    aria-expanded={inspectorOpen}
                    aria-controls="molecule-focus-inspector"
                    onClick={() => setInspectorOpen((current) => !current)}
                  >
                    {inspectorOpen
                      ? t("explore.closeInfoPanel")
                      : t("explore.openInfoPanel")}
                  </button>
                </div>
              </header>
              <div className={styles.focusControls}>
                <div role="group" aria-label={t("explore.dimension")}><button type="button" aria-pressed={dimension === "3d"} onClick={() => changeDimension("3d")}>{t("viewer.dimension3dShort")}</button><button type="button" aria-pressed={dimension === "2d"} disabled={!selectedMolecule.structure?.twoDUrl} onClick={() => changeDimension("2d")}>{t("viewer.dimension2dShort")}</button></div>
                <div role="group" aria-label={t("explore.representation")}><button type="button" disabled={threeDControlsDisabled} aria-pressed={representation === "ball-and-stick"} onClick={() => setRepresentation("ball-and-stick")}>{t("explore.ballAndStick")}</button><button type="button" disabled={threeDControlsDisabled} aria-pressed={representation === "space-filling"} onClick={() => setRepresentation("space-filling")}>{t("explore.spaceFilling")}</button></div>
                <div role="group" aria-label={t("explore.cameraTool")}><button type="button" disabled={threeDControlsDisabled} aria-pressed={interactionMode === "rotate"} onClick={() => setInteractionMode("rotate")}>{t("explore.rotate")}</button><button type="button" disabled={threeDControlsDisabled} aria-pressed={interactionMode === "pan"} onClick={() => setInteractionMode("pan")}>{t("explore.pan")}</button></div>
                <button type="button" disabled={selectedStructureMissing} aria-pressed={showHydrogens} onClick={() => setShowHydrogens((current) => !current)}>{showHydrogens ? t("explore.hydrogensOn") : t("explore.hydrogensOff")}</button>
                <div role="group" aria-label={t("explore.zoomControls")}><button type="button" disabled={threeDControlsDisabled} aria-label={t("explore.zoomOut")} onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, 180))}>−</button><button type="button" disabled={threeDControlsDisabled} aria-label={t("explore.zoomIn")} onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, -180))}>+</button><button type="button" disabled={threeDControlsDisabled} onClick={resetCamera}>{t("explore.center")}</button></div>
              </div>
              <div className={styles.provenanceBanner} data-dimension={dimension}>
                {presentationMode === "reviewer" ? (
                  <>
                    <strong>{provenanceBanner.heading}</strong>
                    <span>{provenanceBanner.note}</span>
                  </>
                ) : (
                  <>
                    <strong>{t("explore.passport")}</strong>
                    <span>{t("explore.studentBoundary")}</span>
                  </>
                )}
              </div>
              {inspectorOpen ? (
                <aside
                  id="molecule-focus-inspector"
                  className={styles.inspector}
                  aria-label={t("explore.infoPanelAria", { name: selectedMolecule.name })}
                >
                  <div className={styles.inspectorTop}>
                    <span data-tone={selectedMolecule.evidenceTone ?? "unknown"}>
                      <i />
                      {presentationMode === "reviewer"
                        ? selectedMolecule.evidenceLabel ?? t("explore.evidenceStatusMissing")
                        : t("explore.passport")}
                    </span>
                    <button
                      type="button"
                      aria-label={t("explore.closeInfoPanel")}
                      onClick={closeInspectorAndRestoreFocus}
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  <p className={styles.inspectorKicker}>
                    {presentationMode === "reviewer"
                      ? t("explore.reviewerDetails")
                      : t("explore.passport")}
                  </p>
                  <h4>{selectedMolecule.name}</h4>
                  <p className={styles.formula}>
                    {selectedMolecule.formula ?? t("explore.formulaMissing")}
                  </p>
                  <p className={styles.summary}>
                    {selectedMolecule.summary ?? t("explore.summaryMissing")}
                  </p>
                  <dl className={styles.passportGrid}>
                    <div>
                      <dt>{t("explore.systematicName")}</dt>
                      <dd>{selectedMolecule.studentProfile?.systematicName ?? t("common.notSpecified")}</dd>
                    </div>
                    <div>
                      <dt>{catalogCopy.functionalMotifHints}</dt>
                      <dd>{selectedMolecule.studentProfile?.functionalGroups.join(" · ") || t("common.notSpecified")}</dd>
                    </div>
                    <div>
                      <dt>{t("explore.scaffoldFamily")}</dt>
                      <dd>{selectedMolecule.studentProfile?.scaffoldFamily ?? t("common.notSpecified")}</dd>
                    </div>
                    <div>
                      <dt>{catalogCopy.scaffoldDetail}</dt>
                      <dd>{selectedMolecule.studentProfile?.scaffoldDetail ?? t("common.notSpecified")}</dd>
                    </div>
                    <div>
                      <dt>{t("explore.drugClass")}</dt>
                      <dd>{selectedMolecule.studentProfile?.drugClass ?? t("common.notSpecified")}</dd>
                    </div>
                  </dl>
                  <section className={styles.similarMolecules} data-neighbor-scope="resident-window">
                    <span>{catalogCopy.similarMolecules}</span>
                    <p>{catalogCopy.similarMoleculesBoundary}</p>
                    {selectedSimilarMolecules.length > 0 ? (
                      <ul>
                        {selectedSimilarMolecules.map(({ molecule, score }) => (
                          <li key={molecule.id}>
                            <button type="button" onClick={() => openMolecule(molecule, true)}>
                              <strong>{molecule.name}</strong>
                              <small>{molecule.formula ?? t("explore.formulaMissing")}</small>
                              {presentationMode === "reviewer" ? <em>{score.toFixed(3)}</em> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <small>{catalogCopy.noSimilarMolecules}</small>}
                  </section>
                  <section className={styles.learningLinks}>
                    <div><span>{t("explore.mechanismLesson")}</span><p>{selectedMolecule.studentProfile?.mechanismSummary ?? t("common.notSpecified")}</p></div>
                    <div><span>{t("explore.synthesisLesson")}</span><p>{selectedMolecule.studentProfile?.synthesisScope ?? t("common.notSpecified")}</p></div>
                    <div><span>{t("explore.nomenclatureLesson")}</span><p>{selectedMolecule.studentProfile?.nomenclatureLesson ?? t("common.notSpecified")}</p></div>
                  </section>
                  {learningActions && (
                    learningActions.onOpenNomenclature ||
                    (learningActions.onOpenSynthesis && learningActions.synthesisMoleculeIds?.includes(selectedMolecule.id)) ||
                    (learningActions.onOpenTasks && learningActions.taskMoleculeIds?.includes(selectedMolecule.id))
                  ) ? (
                    <section className={styles.passportActions}>
                      <span>{catalogCopy.learningActions}</span>
                      <div>
                        {learningActions.onOpenSynthesis && learningActions.synthesisMoleculeIds?.includes(selectedMolecule.id) ? (
                          <button type="button" onClick={() => learningActions.onOpenSynthesis?.(selectedMolecule)}>
                            {catalogCopy.synthesis}
                          </button>
                        ) : null}
                        {learningActions.onOpenNomenclature ? (
                          <button type="button" onClick={() => learningActions.onOpenNomenclature?.(selectedMolecule)}>
                            {catalogCopy.nomenclature}
                          </button>
                        ) : null}
                        {learningActions.onOpenTasks && learningActions.taskMoleculeIds?.includes(selectedMolecule.id) ? (
                          <button type="button" onClick={() => learningActions.onOpenTasks?.(selectedMolecule)}>
                            {catalogCopy.tasks}
                          </button>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                  {presentationMode === "reviewer" ? (
                    <>
                      {selectedMolecule.regulatoryProduct ? (
                        <section className={styles.regulatoryEvidence} aria-label={t("explore.regulatoryEvidenceAria")}>
                          <p>{t("explore.regulatoryConnection")}</p>
                          <strong>{selectedMolecule.regulatoryProduct.brandName}</strong>
                          <span>
                            <a href={selectedMolecule.regulatoryProduct.sourceHref} target="_blank" rel="noreferrer">
                              {selectedMolecule.regulatoryProduct.applicationNumber} /{" "}
                              {t("explore.productNumber", { number: selectedMolecule.regulatoryProduct.productNumber })}
                            </a>
                            {" · "}{selectedMolecule.regulatoryProduct.activeIngredientName}
                          </span>
                          <small>
                            {t("explore.linkedThrough", { form: selectedMolecule.regulatoryProduct.chemicalFormId })}{" · "}
                            ORIG/1/AP {selectedMolecule.regulatoryProduct.actionDate} ·{" "}
                            {presentVerificationStatus(selectedMolecule.regulatoryProduct.verificationStatus, t)}
                          </small>
                        </section>
                      ) : null}
                      <dl className={styles.provenanceList}>
                        <div><dt>{t("explore.source3d")}</dt><dd>{selectedMolecule.structure?.sourceHref ? <a href={selectedMolecule.structure.sourceHref} target="_blank" rel="noreferrer">{selectedMolecule.structure.sourceLabel ?? t("common.source")}</a> : selectedMolecule.structure?.sourceLabel ?? t("common.notSpecified")}</dd></div>
                        <div><dt>{t("explore.origin3d")}</dt><dd>{threeDProvenance.heading}</dd></div>
                        <div><dt>{t("explore.integrity3d")}</dt><dd>{presentVerificationStatus(selectedMolecule.structure?.reviewStatus, t)}</dd></div>
                      </dl>
                      <dl className={styles.provenanceList}>
                        <div><dt>{t("explore.source2d")}</dt><dd>{selectedMolecule.structure?.twoDSourceHref ? <a href={selectedMolecule.structure.twoDSourceHref} target="_blank" rel="noreferrer">{selectedMolecule.structure.twoDSourceLabel ?? t("common.source")}</a> : selectedMolecule.structure?.twoDSourceLabel ?? t("common.notSpecified")}</dd></div>
                        <div><dt>{t("explore.origin2d")}</dt><dd>{twoDProvenance.heading}</dd></div>
                        <div><dt>{t("explore.integrity2d")}</dt><dd>{presentVerificationStatus(selectedMolecule.structure?.twoDReviewStatus, t)}</dd></div>
                      </dl>
                      <dl className={styles.lensValues}>{lenses.map((lens) => <div key={lens.id} data-active={lens.id === activeLensId ? "true" : "false"}><dt>{lens.label}</dt><dd>{getLensValue(selectedMolecule, lens.id, unclassifiedLabel)}</dd></div>)}</dl>
                    </>
                  ) : (
                    <details className={styles.sourcesDrawer}>
                      <summary>{t("explore.sourcesDrawer")}</summary>
                      <a href={selectedMolecule.structure?.sourceHref} target="_blank" rel="noreferrer">
                        {selectedMolecule.structure?.sourceLabel ?? t("common.source")}
                      </a>
                      {selectedMolecule.regulatoryProduct ? (
                        <a href={selectedMolecule.regulatoryProduct.sourceHref} target="_blank" rel="noreferrer">
                          {selectedMolecule.regulatoryProduct.brandName}
                        </a>
                      ) : null}
                    </details>
                  )}
                  {telemetry.selectedAtom ? <p className={styles.atomSelection}>{t("explore.selectedAtom")} <strong>{telemetry.selectedAtom.element}{telemetry.selectedAtom.atomIndex + 1}</strong></p> : null}
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <span><kbd>Esc</kbd> {t("explore.keyboardBack")}</span>
        <span><kbd>←</kbd><kbd>→</kbd> {t("explore.keyboardNavigate")}</span>
        <span>{activeLens?.doesNotMean ?? t("explore.lens.caveat")}</span>
      </footer>
    </section>
  );
}

export default MoleculeUniverse;
