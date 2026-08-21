"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  DEFAULT_MOLECULAR_SCENE_CAMERA,
  SharedMolecularScene,
  getActiveMolecularSceneContextCount,
  zoomSceneCamera,
  type MolecularSceneAtom,
  type MolecularSceneCamera,
  type MolecularScenePort,
  type MolecularSceneRepresentation,
  type MolecularSceneStatus,
} from "@/components/molecular-scene";
import { MoleculeStructurePreview } from "@/components/molecule-viewer";
import { getStructureProvenancePresentation } from "@/lib/application/structure-presentation";
import {
  getExploreLodLevel,
  selectSceneMoleculeIds,
  type ExploreLodLevel,
} from "@/lib/explore";

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
  formula?: string;
  category?: string;
  summary?: string;
  lensValues?: Readonly<Record<string, string>>;
  coordinates?: Readonly<Record<string, { x: number; y: number }>>;
  evidenceLabel?: string;
  evidenceTone?: MoleculeEvidenceTone;
  accent?: string;
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

export interface MoleculeUniverseProps {
  molecules: readonly UniverseMolecule[];
  lenses?: readonly UniverseLens[];
  initialLensId?: string;
  initialSelectedId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  onMoleculeSelect?: (molecule: UniverseMolecule) => void;
}

type ExploreLevel = "universe" | "cluster" | "focus";
type ViewerDimension = "2d" | "3d";
type InteractionMode = "rotate" | "pan";

interface SceneTelemetry {
  status: MolecularSceneStatus;
  loadedCount: number;
  activeContexts: number;
  cameraRevision: number;
  selectedAtom: MolecularSceneAtom | null;
  hoveredAtom: MolecularSceneAtom | null;
}

interface UniverseCluster {
  name: string;
  molecules: UniverseMolecule[];
  position: { x: number; y: number };
}

type ClusterStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--accent": string;
};

const DEFAULT_TELEMETRY: SceneTelemetry = {
  status: "idle",
  loadedCount: 0,
  activeContexts: 0,
  cameraRevision: 0,
  selectedAtom: null,
  hoveredAtom: null,
};
const DEFAULT_CAMERA_DISTANCE = Math.hypot(
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.x - DEFAULT_MOLECULAR_SCENE_CAMERA.target.x,
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.y - DEFAULT_MOLECULAR_SCENE_CAMERA.target.y,
  DEFAULT_MOLECULAR_SCENE_CAMERA.position.z - DEFAULT_MOLECULAR_SCENE_CAMERA.target.z,
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

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function getLensValue(molecule: UniverseMolecule, lensId: string) {
  return molecule.lensValues?.[lensId] ?? molecule.category ?? "Sınıflandırılmamış";
}

function moleculeMatchesSearch(molecule: UniverseMolecule, normalizedQuery: string) {
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
    .toLocaleLowerCase("tr-TR")
    .includes(normalizedQuery);
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
  return clamp(DEFAULT_CAMERA_DISTANCE / Math.max(distance, 0.01), 0.45, 4);
}

export function MoleculeUniverse({
  molecules,
  lenses = DEFAULT_UNIVERSE_LENSES,
  initialLensId,
  initialSelectedId,
  eyebrow = "MOLECULE UNIVERSE",
  title = "Moleküllerin içinde gezinin.",
  description = "Kaynaklı yapıları tek bir moleküler sahnede keşfedin.",
  className,
  onMoleculeSelect,
}: MoleculeUniverseProps) {
  const headingId = useId();
  const searchId = useId();
  const lensDescriptionId = useId();
  const lensMeaningId = useId();
  const lensCaveatId = useId();
  const universeHeadingRef = useRef<HTMLHeadingElement>(null);
  const clusterHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const selectorRefs = useRef(new Map<string, HTMLButtonElement>());
  const scenePortRef = useRef<MolecularScenePort | null>(null);
  const onMoleculeSelectRef = useRef(onMoleculeSelect);
  const lastCameraRef = useRef<MolecularSceneCamera>(DEFAULT_MOLECULAR_SCENE_CAMERA);
  const [level, setLevel] = useState<ExploreLevel>("universe");
  const [query, setQuery] = useState("");
  const [lensId, setLensId] = useState(initialLensId ?? lenses[0]?.id ?? "therapeutic");
  const [clusterName, setClusterName] = useState<string | null>(null);
  const [clusterSelectedId, setClusterSelectedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? molecules[0]?.id ?? "");
  const [universeZoom, setUniverseZoom] = useState(1);
  const [universePan, setUniversePan] = useState({ x: 0, y: 0 });
  const [sceneCamera, setSceneCamera] = useState<MolecularSceneCamera | undefined>(
    DEFAULT_MOLECULAR_SCENE_CAMERA,
  );
  const [searchFitPendingId, setSearchFitPendingId] = useState<string | null>(null);
  const [representation, setRepresentation] =
    useState<MolecularSceneRepresentation>("ball-and-stick");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("rotate");
  const [showHydrogens, setShowHydrogens] = useState(true);
  const [dimension, setDimension] = useState<ViewerDimension>("3d");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [telemetry, setTelemetry] = useState<SceneTelemetry>(DEFAULT_TELEMETRY);

  const activeLens = lenses.find((lens) => lens.id === lensId) ?? lenses[0];
  const activeLensId = activeLens?.id ?? lensId;
  const normalizedQuery = normalizeSearchValue(query);
  const visibleMolecules = useMemo(() => {
    if (!normalizedQuery) return [...molecules];
    return molecules.filter((molecule) =>
      moleculeMatchesSearch(molecule, normalizedQuery),
    );
  }, [molecules, normalizedQuery]);

  const clusters = useMemo<UniverseCluster[]>(() => {
    const grouped = new Map<string, UniverseMolecule[]>();
    for (const molecule of visibleMolecules) {
      const name = getLensValue(molecule, activeLensId);
      grouped.set(name, [...(grouped.get(name) ?? []), molecule]);
    }
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "tr"))
      .flatMap(([name, groupedMolecules]) => {
        const coordinates = groupedMolecules
          .map((molecule) => molecule.coordinates?.[activeLensId])
          .filter((coordinate): coordinate is { x: number; y: number } => Boolean(coordinate));
        // A missing projection is never replaced by a decorative/scientific-looking grid.
        if (coordinates.length === 0) return [];
        return [{
          name,
          molecules: groupedMolecules,
          position: {
            x: coordinates.reduce((total, item) => total + item.x, 0) / coordinates.length,
            y: coordinates.reduce((total, item) => total + item.y, 0) / coordinates.length,
          },
        }];
      });
  }, [activeLensId, visibleMolecules]);
  const unprojectedMoleculeCount = visibleMolecules.filter(
    (molecule) => !molecule.coordinates?.[activeLensId],
  ).length;

  const selectedMolecule =
    molecules.find((molecule) => molecule.id === selectedId) ?? molecules[0];
  const searchFocusedId =
    level === "universe" && normalizedQuery && visibleMolecules.length === 1
      ? (visibleMolecules[0]?.id ?? null)
      : null;
  const selectedClusterName = selectedMolecule
    ? getLensValue(selectedMolecule, activeLensId)
    : null;
  const effectiveClusterName = level === "focus" ? selectedClusterName : clusterName;
  const clusterMolecules = useMemo(
    () =>
      effectiveClusterName
        ? visibleMolecules.filter(
            (molecule) => getLensValue(molecule, activeLensId) === effectiveClusterName,
          )
        : [],
    [activeLensId, effectiveClusterName, visibleMolecules],
  );
  const effectiveClusterSelectedId =
    clusterSelectedId && clusterMolecules.some((molecule) => molecule.id === clusterSelectedId)
      ? clusterSelectedId
      : (clusterMolecules[0]?.id ?? null);
  const lodLevel: ExploreLodLevel = getExploreLodLevel(
    level,
    searchFocusedId ? Math.max(universeZoom, 1.08) : universeZoom,
  );
  const sceneLevel = lodLevel === "focus" ? "focus" : lodLevel === "cluster" ? "cluster" : "universe";

  const sceneMolecules = useMemo(() => {
    const activeCluster = clusters.find((cluster) => cluster.name === effectiveClusterName);
    const center = activeCluster?.position ?? { x: 50, y: 50 };
    return molecules.flatMap((molecule) => {
      const structure = molecule.structure;
      const structureUrl = structure?.threeDUrl;
      if (!structure || !structureUrl) return [];
      const coordinate = molecule.coordinates?.[activeLensId];
      if (level !== "focus" && !coordinate) return [];
      const position =
        level === "focus"
          ? { x: 0, y: 0, z: 0 }
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
        scale: level === "focus" ? 1 : level === "cluster" ? 0.62 : 0.45,
        structureOrigin: structure.originLabel,
        expectedPubChemCid: structure.pubChemCid,
      }];
    });
  }, [activeLensId, clusters, effectiveClusterName, level, molecules]);
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
  const intendedSceneCandidates = useMemo(
    () =>
      level === "focus"
        ? selectedMolecule
          ? [selectedMolecule]
          : []
        : level === "cluster"
          ? clusterMolecules
          : visibleMolecules,
    [clusterMolecules, level, selectedMolecule, visibleMolecules],
  );
  const candidateIds = useMemo(
    () => intendedSceneCandidates.map((molecule) => molecule.id).filter((id) => eligibleIds.has(id)),
    [eligibleIds, intendedSceneCandidates],
  );
  const requestedSceneIds = useMemo(
    () =>
      selectSceneMoleculeIds({
        level: lodLevel,
        candidateIds,
        focusedMoleculeId: selectedMolecule?.id ?? null,
      }),
    [candidateIds, lodLevel, selectedMolecule?.id],
  );
  const sceneVisibleIds = useMemo(
    () => (dimension === "2d" ? [] : requestedSceneIds),
    [dimension, requestedSceneIds],
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
    setUniverseZoom(1);
    setUniversePan({ x: 0, y: 0 });
    setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    setDimension("3d");
    writeExploreHash("#universe");
  }

  function enterCluster(name: string) {
    const firstMolecule = visibleMolecules.find(
      (molecule) => getLensValue(molecule, activeLensId) === name,
    );
    setClusterName(name);
    setClusterSelectedId(firstMolecule?.id ?? null);
    if (firstMolecule) setSelectedId(firstMolecule.id);
    setUniversePan({ x: 0, y: 0 });
    setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    setLevel("cluster");
    setDimension("3d");
    writeExploreHash(`#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(name)}`);
  }

  function openMolecule(molecule: UniverseMolecule) {
    setSelectedId(molecule.id);
    setClusterName(getLensValue(molecule, activeLensId));
    setLevel("focus");
    setSceneCamera(undefined);
    setDimension("3d");
    setInspectorOpen(true);
    setTelemetry((current) => ({ ...current, selectedAtom: null }));
    writeExploreHash(`#molecule/${encodeURIComponent(getMoleculeSlug(molecule.id))}`);
    onMoleculeSelect?.(molecule);
  }

  function selectClusterMolecule(molecule: UniverseMolecule) {
    setClusterSelectedId(molecule.id);
    setSelectedId(molecule.id);
    setTelemetry((current) => ({ ...current, selectedAtom: null }));
    onMoleculeSelect?.(molecule);
  }

  function updateQuery(nextQuery: string) {
    const nextNormalizedQuery = normalizeSearchValue(nextQuery);
    const nextMatches = nextNormalizedQuery
      ? molecules.filter((molecule) =>
          moleculeMatchesSearch(molecule, nextNormalizedQuery),
        )
      : [];
    const nextSearchFitId = nextMatches.length === 1 ? nextMatches[0]?.id ?? null : null;
    setQuery(nextQuery);
    setSearchFitPendingId(nextSearchFitId);
    if (nextSearchFitId) {
      setSceneCamera(undefined);
      return;
    }
    if (nextQuery.trim()) return;
    setUniverseZoom(1);
    setUniversePan({ x: 0, y: 0 });
    setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
  }

  function showUniverse() {
    setLevel("universe");
    setClusterName(null);
    setClusterSelectedId(null);
    setUniverseZoom(1);
    setUniversePan({ x: 0, y: 0 });
    setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    setDimension("3d");
    writeExploreHash("#universe");
    window.requestAnimationFrame(() => universeHeadingRef.current?.focus());
  }

  function showCluster() {
    if (!selectedClusterName) return showUniverse();
    setClusterName(selectedClusterName);
    setClusterSelectedId(selectedMolecule?.id ?? null);
    setUniversePan({ x: 0, y: 0 });
    setLevel("cluster");
    setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    setDimension("3d");
    writeExploreHash(
      `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(selectedClusterName)}`,
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
    applyCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    if (level === "universe") setUniverseZoom(1);
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
    function syncFromHash() {
      const hash = window.location.hash;
      if (hash.startsWith("#molecule/")) {
        let slug: string;
        try {
          slug = decodeURIComponent(hash.slice("#molecule/".length));
        } catch {
          return;
        }
        const molecule = molecules.find(
          (candidate) => candidate.id === slug || getMoleculeSlug(candidate.id) === slug,
        );
        if (!molecule) return;
        setSelectedId(molecule.id);
        setClusterSelectedId(molecule.id);
        setClusterName(getLensValue(molecule, activeLensId));
        setLevel("focus");
        setSceneCamera(undefined);
        setDimension("3d");
        onMoleculeSelectRef.current?.(molecule);
        return;
      }
      if (hash.startsWith("#cluster/")) {
        const [, encodedLens = "", encodedCluster = ""] = hash.split("/");
        try {
          const nextLensId = decodeURIComponent(encodedLens);
          if (lenses.some((lens) => lens.id === nextLensId)) setLensId(nextLensId);
          setClusterName(decodeURIComponent(encodedCluster));
          setClusterSelectedId(null);
          setLevel("cluster");
          setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
          setDimension("3d");
          setUniversePan({ x: 0, y: 0 });
        } catch {
          // Malformed external hashes cannot create product or scientific state.
        }
        return;
      }
      setLevel("universe");
      setClusterName(null);
      setClusterSelectedId(null);
      setDimension("3d");
      setUniverseZoom(1);
      setUniversePan({ x: 0, y: 0 });
      setSceneCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    }
    const frame = window.requestAnimationFrame(syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", syncFromHash);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [activeLensId, lenses, molecules]);

  const focusHeadingSelectionId = level === "focus" ? selectedId : null;

  useEffect(() => {
    if (sceneCamera) lastCameraRef.current = sceneCamera;
  }, [sceneCamera]);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (query) return updateQuery("");
      if (level === "focus") showCluster();
      else if (level === "cluster") showUniverse();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  useEffect(() => {
    if (level === "universe") return;
    const frame = window.requestAnimationFrame(() => {
      if (level === "cluster") clusterHeadingRef.current?.focus();
      else focusHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveClusterName, focusHeadingSelectionId, level]);

  const levelAnnouncement =
    level === "universe"
      ? `Universe görünümü. ${clusters.length} küme.`
      : level === "cluster"
        ? `${effectiveClusterName ?? "Küme"} cluster görünümü. ${clusterMolecules.length} molekül.`
        : `${selectedMolecule?.name ?? "Molekül"} focus görünümü.`;
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
  });
  const threeDControlsDisabled =
    dimension === "2d" ||
    selectedStructureMissing ||
    (level === "focus" && telemetry.status === "error");

  return (
    <section className={rootClassName} aria-labelledby={headingId} data-explore-level={level}>
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 ref={universeHeadingRef} id={headingId} tabIndex={-1}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.headerSummary} aria-label="Atlas özeti">
          <span><strong>{visibleMolecules.length}</strong> / {molecules.length} molekül</span>
          <span><strong>{clusters.length}</strong> küme</span>
          <span><strong>{level === "universe" ? "Universe" : level === "cluster" ? "Cluster" : "Focus"}</strong></span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchField}>
          <label htmlFor={searchId}>Molekül ara</label>
          <div className={styles.searchControl}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder="İsim, formül, grup veya kaynak"
              autoComplete="off"
              onChange={(event) => updateQuery(event.target.value)}
            />
            {query ? <button type="button" className={styles.clearButton} onClick={() => updateQuery("")}>Temizle</button> : null}
          </div>
        </div>
        <div className={styles.lensPanel}>
          <span className={styles.controlLabel}>Kümelenme lensi</span>
          <div className={styles.lensButtons} role="group" aria-label="Kümelenme lensi" aria-describedby={lensNarrativeIds}>
            {lenses.map((lens) => (
              <button key={lens.id} type="button" className={styles.lensButton} aria-pressed={lens.id === activeLensId} onClick={() => changeLens(lens.id)}>
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
              {activeLens?.description ?? "Kategorik yerleşim"}
            </span>
            <span id={lensMeaningId} className={styles.lensMeaning}>
              <strong>Temsil ettiği:</strong> {activeLens?.meaning ?? "Kategorik katalog yerleşimi."}
            </span>
            <span id={lensCaveatId} className={styles.lensCaveat}>
              <strong>Temsil etmediği:</strong> {activeLens?.doesNotMean ?? "Yerleşim bilimsel yakınlık veya doğrulanmış etki hükmü değildir."}
            </span>
          </div>
          {activeLens?.algorithmVersion || activeLens?.inputHash ? (
            <span className={styles.lensTechnical}>
              {activeLens.algorithm ?? "projection"} · {activeLens.algorithmVersion ?? "sürüm belirtilmedi"} · {activeLens.inputHash ?? "girdi özeti belirtilmedi"}
            </span>
          ) : null}
          {unprojectedMoleculeCount > 0 ? (
            <span className={styles.lensTechnical} role="status">
              {unprojectedMoleculeCount} kayıt için bu lensin projeksiyonu yok; sahnede konum uydurulmadı.
            </span>
          ) : null}
        </div>
      </div>

      <nav className={styles.breadcrumb} aria-label="Explore görünüm yolu">
        <button type="button" onClick={showUniverse} aria-current={level === "universe" ? "page" : undefined}>Universe</button>
        {level !== "universe" && effectiveClusterName ? <><span>/</span><button type="button" onClick={() => enterCluster(effectiveClusterName)} aria-current={level === "cluster" ? "page" : undefined}>{effectiveClusterName}</button></> : null}
        {level === "focus" && selectedMolecule ? <><span>/</span><span aria-current="page">{selectedMolecule.name}</span></> : null}
        <p>{activeLens?.label}</p>
      </nav>

      <p className={styles.srOnly} aria-live="polite">{levelAnnouncement}</p>
      <ul className={styles.srOnly} aria-label="Molekül kanıt durumları">
        {visibleMolecules.map((molecule) => <li key={molecule.id}>{molecule.name}: {molecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}</li>)}
      </ul>

      <div className={styles.exploreStage} data-level={level}>
        <div
          className={styles.sceneTelemetry}
          data-lod-level={lodLevel}
          data-active-webgl-contexts={telemetry.activeContexts}
          data-visible-count={effectiveLoadedCount}
          data-selected-molecule={
            level === "focus"
              ? selectedMolecule?.id ?? ""
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
            interactionMode={level === "universe" ? "pan" : interactionMode}
            ariaLabel={level === "focus" ? `${selectedMolecule?.name ?? "Molekül"} etkileşimli 3B yapısı` : "Tek bağlamlı 3B moleküler Explore sahnesi"}
            onSceneReady={(port) => {
              scenePortRef.current = port;
              setTelemetry((current) => ({
                ...current,
                activeContexts: getActiveMolecularSceneContextCount(),
              }));
            }}
            onStatusChange={(detail) => setTelemetry((current) => ({ ...current, status: detail.status, loadedCount: detail.loadedMoleculeCount }))}
            onCameraChange={(camera) => {
              lastCameraRef.current = camera;
              setSceneCamera(camera);
              if (searchFocusedId && searchFitPendingId === searchFocusedId) {
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
            onAtomHover={(atom) => setTelemetry((current) => ({ ...current, hoveredAtom: atom }))}
          />

          {level === "focus" && dimension === "2d" && selectedMolecule?.structure?.twoDUrl ? (
            <div className={styles.twoDStage} data-structure-origin={selectedMolecule.structure.twoDOriginLabel ?? "database-2d-record"}>
              <MoleculeStructurePreview structureUrl={selectedMolecule.structure.twoDUrl} moleculeName={selectedMolecule.name} showHydrogens={showHydrogens} />
            </div>
          ) : null}

          {selectedStructureMissing ? (
            <div className={styles.missingStructure} role="alert">
              <strong>Doğrulanabilir yapı bulunamadı</strong>
              <p>Sahte veya tahmini atom ve bağ geometrisi üretilmedi.</p>
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
                    {unavailableSceneMolecules.length} kayıt için doğrulanabilir 3B yapı yok
                  </strong>
                  <span>
                    {unavailableSceneMolecules.map((molecule) => molecule.name).join(", ")}. Sahte geometri üretilmedi.
                  </span>
                </div>
              ) : null}
              {unprojectedSceneMolecules.length > 0 ? (
                <div>
                  <strong>
                    {unprojectedSceneMolecules.length} kayıt için aktif lens projeksiyonu yok
                  </strong>
                  <span>
                    {unprojectedSceneMolecules.map((molecule) => molecule.name).join(", ")}. Bilimsel görünen konum uydurulmadı.
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
                        aria-label={`${cluster.name} kümesi, ${cluster.molecules.length} molekül`}
                        onClick={() => enterCluster(cluster.name)}
                        onKeyDown={(event) => navigateSelectors(event, clusters.map((item) => `cluster:${item.name}`), index)}
                      >
                        <i aria-hidden="true"><b /><b /><b /></i>
                        <span><strong>{cluster.name}</strong><small>{cluster.molecules.length} molekül</small></span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <ul className={styles.nearClusterNavigation} aria-label="Yakın LOD küme seçimi">
                  {clusters.map((cluster, index) => {
                    const selectorId = `cluster:${cluster.name}`;
                    return (
                      <li key={cluster.name}>
                        <button
                          ref={(node) => { if (node) selectorRefs.current.set(selectorId, node); else selectorRefs.current.delete(selectorId); }}
                          type="button"
                          aria-label={`${cluster.name} kümesi, ${cluster.molecules.length} molekül`}
                          onClick={() => enterCluster(cluster.name)}
                          onKeyDown={(event) => navigateSelectors(event, clusters.map((item) => `cluster:${item.name}`), index)}
                        >
                          {cluster.name} <small>{cluster.molecules.length}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {lodLevel === "near" && telemetry.hoveredAtom ? (
                <output className={styles.moleculeHoverLabel} aria-live="polite">
                  {telemetry.hoveredAtom.moleculeName} · {telemetry.hoveredAtom.element}{telemetry.hoveredAtom.atomIndex + 1}
                </output>
              ) : null}
              <div className={styles.universeCamera} role="group" aria-label="Universe yakınlaştırma">
                <button type="button" aria-label="Uzaklaştır" onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, 180))}>−</button>
                <output>{Math.round(universeZoom * 100)}%</output>
                <button type="button" aria-label="Yakınlaştır" onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, -180))}>+</button>
                <button type="button" onClick={resetCamera}>Ortala</button>
              </div>
              <p className={styles.lodStatus}>{lodLevel === "far" ? "Uzak LOD · yapı dosyaları henüz yüklenmedi" : `${sceneVisibleIds.length} kaynaklı SDF 3B kaydı · tek WebGL bağlamı`}</p>
            </div>
          ) : null}

          {level === "cluster" ? (
            <div className={styles.clusterOverlay}>
              <header><p>{activeLens?.label} / CLUSTER</p><h3 ref={clusterHeadingRef} tabIndex={-1}>{effectiveClusterName ?? "Küme"}</h3><span>Eğitim sınıflandırması · {activeLens?.verificationStatus ?? "inceleme durumu belirtilmedi"}</span></header>
              {clusterMolecules.length > 0 ? (
                <ul className={styles.moleculeSelectors} aria-label={`${effectiveClusterName} molekülleri`}>
                  {clusterMolecules.map((molecule, index) => {
                    const selectorId = `molecule:${molecule.id}`;
                    const isSelected = molecule.id === effectiveClusterSelectedId;
                    return (
                      <li key={molecule.id} data-selected={isSelected ? "true" : "false"}>
                        <button
                          ref={(node) => { if (node) selectorRefs.current.set(selectorId, node); else selectorRefs.current.delete(selectorId); }}
                          type="button"
                          className={styles.moleculeSelectButton}
                          aria-label={`${molecule.name} molekülünü seç`}
                          aria-pressed={isSelected}
                          onClick={() => selectClusterMolecule(molecule)}
                          onKeyDown={(event) => navigateSelectors(event, clusterMolecules.map((item) => `molecule:${item.id}`), index)}
                        >
                          <strong>{molecule.name}</strong>
                          <small>{molecule.formula ?? "Formül belirtilmedi"}</small>
                          <i data-tone={molecule.evidenceTone ?? "unknown"} />
                        </button>
                        <button
                          type="button"
                          className={styles.moleculeFocusButton}
                          aria-label={`${molecule.name}, focus görünümünü aç`}
                          onClick={() => openMolecule(molecule)}
                        >
                          Focus
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <div className={styles.emptyState}><strong>Eşleşen molekül yok</strong><button type="button" onClick={() => setQuery("")}>Aramayı temizle</button></div>}
            </div>
          ) : null}

          {level === "focus" && selectedMolecule ? (
            <div className={styles.focusOverlay} data-inspector={inspectorOpen ? "open" : "closed"}>
              <header className={styles.focusHeader}>
                <div><p>MOLECULE FOCUS / {selectedMolecule.formula ?? "FORMÜL BELİRTİLMEDİ"}</p><h3 ref={focusHeadingRef} tabIndex={-1}>{selectedMolecule.name}</h3></div>
                <div className={styles.focusActions}><button type="button" onClick={showCluster}>Kümeye dön</button><button ref={inspectorToggleRef} type="button" aria-expanded={inspectorOpen} aria-controls="molecule-focus-inspector" onClick={() => setInspectorOpen((current) => !current)}>{inspectorOpen ? "Bilgi panelini kapat" : "Bilgi panelini aç"}</button></div>
              </header>
              <div className={styles.focusControls}>
                <div role="group" aria-label="Boyut"><button type="button" aria-pressed={dimension === "3d"} onClick={() => changeDimension("3d")}>3B</button><button type="button" aria-pressed={dimension === "2d"} disabled={!selectedMolecule.structure?.twoDUrl} onClick={() => changeDimension("2d")}>2B</button></div>
                <div role="group" aria-label="Gösterim"><button type="button" disabled={threeDControlsDisabled} aria-pressed={representation === "ball-and-stick"} onClick={() => setRepresentation("ball-and-stick")}>Top + çubuk</button><button type="button" disabled={threeDControlsDisabled} aria-pressed={representation === "space-filling"} onClick={() => setRepresentation("space-filling")}>Uzay dolgu</button></div>
                <div role="group" aria-label="Kamera aracı"><button type="button" disabled={threeDControlsDisabled} aria-pressed={interactionMode === "rotate"} onClick={() => setInteractionMode("rotate")}>Döndür</button><button type="button" disabled={threeDControlsDisabled} aria-pressed={interactionMode === "pan"} onClick={() => setInteractionMode("pan")}>Kaydır</button></div>
                <button type="button" disabled={selectedStructureMissing} aria-pressed={showHydrogens} onClick={() => setShowHydrogens((current) => !current)}>H {showHydrogens ? "açık" : "kapalı"}</button>
                <div role="group" aria-label="Yakınlaştırma"><button type="button" disabled={threeDControlsDisabled} aria-label="Uzaklaştır" onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, 180))}>−</button><button type="button" disabled={threeDControlsDisabled} aria-label="Yakınlaştır" onClick={() => applyCamera(zoomSceneCamera(lastCameraRef.current, -180))}>+</button><button type="button" disabled={threeDControlsDisabled} onClick={resetCamera}>Ortala</button></div>
              </div>
              <div className={styles.provenanceBanner} data-dimension={dimension}>
                <strong>{provenanceBanner.heading}</strong>
                <span>{provenanceBanner.note}</span>
              </div>
              {inspectorOpen ? (
                <aside id="molecule-focus-inspector" className={styles.inspector} aria-label={`${selectedMolecule.name} bilgi paneli`}>
                  <div className={styles.inspectorTop}><span data-tone={selectedMolecule.evidenceTone ?? "unknown"}><i />{selectedMolecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}</span><button type="button" aria-label="Bilgi panelini kapat" onClick={closeInspectorAndRestoreFocus}>Kapat</button></div>
                  <p className={styles.inspectorKicker}>SECONDARY INSPECTOR</p><h4>{selectedMolecule.name}</h4><p className={styles.formula}>{selectedMolecule.formula ?? "Formül belirtilmedi"}</p><p className={styles.summary}>{selectedMolecule.summary ?? "Eğitim özeti eklenmedi."}</p>
                  {selectedMolecule.regulatoryProduct ? (
                    <section className={styles.regulatoryEvidence} aria-label="FDA ürün ve form kanıtı">
                      <p>FDA ÜRÜN/FORM BAĞLANTISI</p>
                      <strong>{selectedMolecule.regulatoryProduct.brandName}</strong>
                      <span>
                        <a href={selectedMolecule.regulatoryProduct.sourceHref} target="_blank" rel="noreferrer">
                          {selectedMolecule.regulatoryProduct.applicationNumber} / ürün {selectedMolecule.regulatoryProduct.productNumber}
                        </a>
                        {" · "}{selectedMolecule.regulatoryProduct.activeIngredientName}
                      </span>
                      <small>
                        {selectedMolecule.regulatoryProduct.chemicalFormId} üzerinden bağlı · ORIG/1/AP {selectedMolecule.regulatoryProduct.actionDate} · {selectedMolecule.regulatoryProduct.verificationStatus}
                      </small>
                    </section>
                  ) : null}
                  <dl className={styles.provenanceList}>
                    <div><dt>3B kaynak</dt><dd>{selectedMolecule.structure?.sourceHref ? <a href={selectedMolecule.structure.sourceHref} target="_blank" rel="noreferrer">{selectedMolecule.structure.sourceLabel ?? "Kaynak"}</a> : selectedMolecule.structure?.sourceLabel ?? "Belirtilmedi"}</dd></div>
                    <div><dt>3B köken</dt><dd>{selectedMolecule.structure?.originLabel ?? "Belirtilmedi"}</dd></div>
                    <div><dt>3B dosya bütünlüğü</dt><dd>{selectedMolecule.structure?.reviewStatus ?? "Belirtilmedi"}</dd></div>
                  </dl>
                  <dl className={styles.provenanceList}>
                    <div><dt>İki boyutlu kaynak</dt><dd>{selectedMolecule.structure?.twoDSourceHref ? <a href={selectedMolecule.structure.twoDSourceHref} target="_blank" rel="noreferrer">{selectedMolecule.structure.twoDSourceLabel ?? "Kaynak"}</a> : selectedMolecule.structure?.twoDSourceLabel ?? "Belirtilmedi"}</dd></div>
                    <div><dt>İki boyutlu köken</dt><dd>{selectedMolecule.structure?.twoDOriginLabel ?? "Belirtilmedi"}</dd></div>
                    <div><dt>2B dosya bütünlüğü</dt><dd>{selectedMolecule.structure?.twoDReviewStatus ?? "Belirtilmedi"}</dd></div>
                  </dl>
                  <dl className={styles.lensValues}>{lenses.map((lens) => <div key={lens.id} data-active={lens.id === activeLensId ? "true" : "false"}><dt>{lens.label}</dt><dd>{getLensValue(selectedMolecule, lens.id)}</dd></div>)}</dl>
                  {telemetry.selectedAtom ? <p className={styles.atomSelection}>Seçili atom: <strong>{telemetry.selectedAtom.element}{telemetry.selectedAtom.atomIndex + 1}</strong></p> : null}
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <footer className={styles.footer}><span><kbd>Esc</kbd> geri dön</span><span><kbd>←</kbd><kbd>→</kbd> seçimler arasında gezin</span><span>{activeLens?.doesNotMean ?? "Yerleşim bilimsel yakınlık veya doğrulanmış etki hükmü değildir."}</span></footer>
    </section>
  );
}

export default MoleculeUniverse;
