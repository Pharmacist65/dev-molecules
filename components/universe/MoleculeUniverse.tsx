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
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  MoleculeStructurePreview,
  MoleculeViewer,
} from "@/components/molecule-viewer";
import type { VerificationStatus } from "@/lib/domain";

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
}

/** Resolvable structure metadata. Missing URLs deliberately render an error. */
export interface UniverseMoleculeStructure {
  threeDUrl?: string;
  twoDUrl?: string;
  /** Primary 3D conformer provenance. */
  sourceLabel?: string;
  sourceId?: string;
  sourceHref?: string;
  originLabel?: string;
  reviewStatus?: VerificationStatus;
  /** Canonical 2D record provenance; kept separate from the 3D conformer. */
  twoDSourceLabel?: string;
  twoDSourceId?: string;
  twoDSourceHref?: string;
  twoDOriginLabel?: string;
  twoDReviewStatus?: VerificationStatus;
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

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

interface ClusterLayout {
  name: string;
  molecules: UniverseMolecule[];
  position: { x: number; y: number };
}

type SpatialStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--accent": string;
};

const DEFAULT_CAMERA: CameraState = { x: 0, y: 0, scale: 1 };
const MIN_SCALE = 0.72;
const MAX_SCALE = 1.68;

export const DEFAULT_UNIVERSE_LENSES: readonly UniverseLens[] = [
  {
    id: "therapeutic",
    label: "Tedavi alanı",
    description: "Molekülleri eğitim bağlamındaki tedavi alanlarına göre kümeler.",
  },
  {
    id: "target",
    label: "Hedef ailesi",
    description: "Molekülleri ilişkilendirildikleri hedef ailelerine göre düzenler.",
  },
  {
    id: "scaffold",
    label: "Yapısal iskelet",
    description: "Paylaşılan temel iskeletleri ve fonksiyonel motifleri öne çıkarır.",
  },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function getLensValue(molecule: UniverseMolecule, lensId: string) {
  return molecule.lensValues?.[lensId] ?? molecule.category ?? "Diğer";
}

function getGridPosition(index: number, count: number) {
  if (count <= 1) return { x: 50, y: 50 };

  const columns = Math.min(count, Math.ceil(Math.sqrt(count * 1.55)));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const itemsInRow = Math.min(columns, count - row * columns);
  const rowOffset = (columns - itemsInRow) / 2;

  return {
    x: ((column + rowOffset + 0.5) / columns) * 82 + 9,
    y: ((row + 0.5) / rows) * 76 + 12,
  };
}

function provenanceIsComplete(molecule: UniverseMolecule) {
  const structure = molecule.structure;
  if (!structure?.threeDUrl) return false;

  const threeDComplete = Boolean(
    structure.sourceLabel &&
      structure.sourceId &&
      structure.sourceHref &&
      structure.originLabel &&
      structure.reviewStatus,
  );
  const twoDComplete =
    !structure.twoDUrl ||
    Boolean(
      structure.twoDSourceLabel &&
        structure.twoDSourceId &&
        structure.twoDSourceHref &&
        structure.twoDOriginLabel &&
        structure.twoDReviewStatus,
    );

  return threeDComplete && twoDComplete;
}

function getMoleculeSlug(id: string) {
  const separatorIndex = Math.max(id.lastIndexOf(":"), id.lastIndexOf("/"));
  return separatorIndex >= 0 ? id.slice(separatorIndex + 1) : id;
}

function writeExploreHash(hash: string) {
  if (typeof window === "undefined" || window.location.hash === hash) return;
  window.history.pushState(null, "", hash);
}

function StructureUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? styles.missingCompact : styles.missingStructure}>
      <strong>Önizleme mevcut değil</strong>
      {compact ? null : <small>2B SDF kaydı bulunamadı</small>}
    </span>
  );
}

export function MoleculeUniverse({
  molecules,
  lenses = DEFAULT_UNIVERSE_LENSES,
  initialLensId,
  initialSelectedId,
  eyebrow = "MOLECULE UNIVERSE",
  title = "Moleküllerin içinde gezinin.",
  description =
    "Gerçek yapı kayıtlarını kümeler arasında izleyin ve seçtiğiniz molekülü atom düzeyinde inceleyin.",
  className,
  onMoleculeSelect,
}: MoleculeUniverseProps) {
  const headingId = useId();
  const searchId = useId();
  const lensDescriptionId = useId();
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const viewHeadingRef = useRef<HTMLHeadingElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    cameraX: number;
    cameraY: number;
  } | null>(null);
  const [level, setLevel] = useState<ExploreLevel>("universe");
  const [query, setQuery] = useState("");
  const [lensId, setLensId] = useState(
    initialLensId ?? lenses[0]?.id ?? "therapeutic",
  );
  const [clusterName, setClusterName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(
    initialSelectedId ?? molecules[0]?.id ?? "",
  );
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [isDragging, setIsDragging] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const activeLens = lenses.find((lens) => lens.id === lensId) ?? lenses[0];
  const activeLensId = activeLens?.id ?? lensId;
  const normalizedQuery = normalizeSearchValue(query);

  const visibleMolecules = useMemo(() => {
    if (!normalizedQuery) return [...molecules];

    return molecules.filter((molecule) => {
      const searchableText = [
        molecule.name,
        molecule.formula,
        molecule.category,
        molecule.summary,
        molecule.structure?.sourceLabel,
        molecule.structure?.sourceId,
        ...Object.values(molecule.lensValues ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedQuery);
    });
  }, [molecules, normalizedQuery]);

  const clusters = useMemo<ClusterLayout[]>(() => {
    const groups = new Map<string, UniverseMolecule[]>();

    visibleMolecules.forEach((molecule) => {
      const name = getLensValue(molecule, activeLensId);
      groups.set(name, [...(groups.get(name) ?? []), molecule]);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "tr"))
      .map(([name, groupedMolecules], index, allGroups) => ({
        name,
        molecules: groupedMolecules,
        position:
          groupedMolecules[0]?.coordinates?.[activeLensId] ??
          getGridPosition(index, allGroups.length),
      }));
  }, [activeLensId, visibleMolecules]);

  const selectedMolecule =
    molecules.find((molecule) => molecule.id === selectedId) ?? molecules[0];
  const selectedClusterName = selectedMolecule
    ? getLensValue(selectedMolecule, activeLensId)
    : null;
  const effectiveClusterName = level === "focus" ? selectedClusterName : clusterName;
  const clusterMolecules = effectiveClusterName
    ? visibleMolecules.filter(
        (molecule) => getLensValue(molecule, activeLensId) === effectiveClusterName,
      )
    : [];
  const rootClassName = className
    ? `${styles.universe} ${className}`
    : styles.universe;

  const focusLevelHeading = useCallback((nextLevel: ExploreLevel) => {
    window.requestAnimationFrame(() => {
      const heading =
        nextLevel === "universe" ? sectionHeadingRef.current : viewHeadingRef.current;
      heading?.focus();
    });
  }, []);

  useEffect(() => {
    function syncFromHash(shouldFocus: boolean) {
      const hash = window.location.hash;

      if (hash.startsWith("#molecule/")) {
        let slug = "";
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
        setClusterName(getLensValue(molecule, activeLensId));
        setLevel("focus");
        if (shouldFocus) focusLevelHeading("focus");
        onMoleculeSelect?.(molecule);
        return;
      }

      if (hash.startsWith("#cluster/")) {
        const [, encodedLens = "", encodedCluster = ""] = hash.split("/");
        try {
          const nextLensId = decodeURIComponent(encodedLens);
          const nextCluster = decodeURIComponent(encodedCluster);
          if (lenses.some((lens) => lens.id === nextLensId)) setLensId(nextLensId);
          setClusterName(nextCluster);
          setLevel("cluster");
          if (shouldFocus) focusLevelHeading("cluster");
        } catch {
          // A malformed external hash is ignored and cannot create scientific state.
        }
        return;
      }

      setLevel("universe");
      setClusterName(null);
      if (shouldFocus) focusLevelHeading("universe");
    }

    const handleHistoryChange = () => syncFromHash(true);
    const initialFrame = window.requestAnimationFrame(() => syncFromHash(false));
    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("hashchange", handleHistoryChange);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("hashchange", handleHistoryChange);
    };
  }, [activeLensId, focusLevelHeading, lenses, molecules, onMoleculeSelect]);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (query) {
        event.preventDefault();
        setQuery("");
        return;
      }
      if (level === "focus" && selectedClusterName) {
        event.preventDefault();
        setClusterName(selectedClusterName);
        setLevel("cluster");
        writeExploreHash(
          `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(selectedClusterName)}`,
        );
        focusLevelHeading("cluster");
      } else if (level === "cluster") {
        event.preventDefault();
        setLevel("universe");
        setClusterName(null);
        writeExploreHash("#universe");
        focusLevelHeading("universe");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeLensId, focusLevelHeading, level, query, selectedClusterName]);

  function changeLens(nextLensId: string) {
    setLensId(nextLensId);
    setLevel("universe");
    setClusterName(null);
    setCamera(DEFAULT_CAMERA);
    writeExploreHash("#universe");
    focusLevelHeading("universe");
  }

  function enterCluster(name: string) {
    setClusterName(name);
    setLevel("cluster");
    setCamera(DEFAULT_CAMERA);
    writeExploreHash(
      `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(name)}`,
    );
    focusLevelHeading("cluster");
  }

  function openMolecule(molecule: UniverseMolecule) {
    setSelectedId(molecule.id);
    setClusterName(getLensValue(molecule, activeLensId));
    setLevel("focus");
    setInspectorOpen(true);
    writeExploreHash(`#molecule/${encodeURIComponent(getMoleculeSlug(molecule.id))}`);
    focusLevelHeading("focus");
    onMoleculeSelect?.(molecule);
  }

  function showUniverse() {
    setLevel("universe");
    setClusterName(null);
    writeExploreHash("#universe");
    focusLevelHeading("universe");
  }

  function showCluster() {
    if (selectedClusterName) {
      setClusterName(selectedClusterName);
      setLevel("cluster");
      writeExploreHash(
        `#cluster/${encodeURIComponent(activeLensId)}/${encodeURIComponent(selectedClusterName)}`,
      );
      focusLevelHeading("cluster");
    } else {
      showUniverse();
    }
  }

  function handleDirectionalNavigation(
    event: KeyboardEvent<HTMLButtonElement>,
    ids: readonly string[],
    currentIndex: number,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) setQuery("");
      else if (level === "focus") showCluster();
      else if (level === "cluster") showUniverse();
      return;
    }

    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % ids.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ids.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextId = ids[nextIndex];
    if (nextId) nodeRefs.current.get(nextId)?.focus();
  }

  function updateZoom(delta: number) {
    setCamera((current) => ({
      ...current,
      scale: clamp(current.scale + delta, MIN_SCALE, MAX_SCALE),
    }));
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (level !== "universe") return;
    event.preventDefault();
    updateZoom(event.deltaY > 0 ? -0.08 : 0.08);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (level !== "universe" || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setCamera((current) => ({
      ...current,
      x: clamp(drag.cameraX + event.clientX - drag.startX, -360, 360),
      y: clamp(drag.cameraY + event.clientY - drag.startY, -260, 260),
    }));
  }

  function endPointerDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const levelLabel =
    level === "universe" ? "Universe" : level === "cluster" ? "Cluster" : "Focus";

  return (
    <section
      className={rootClassName}
      aria-labelledby={headingId}
      data-level={level}
    >
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 ref={sectionHeadingRef} id={headingId} tabIndex={-1}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.headerSummary} aria-label="Atlas özeti" aria-live="polite">
          <span><strong>{visibleMolecules.length}</strong> / {molecules.length} yapı</span>
          <span><strong>{clusters.length}</strong> küme</span>
          <span data-level={level}><strong>{levelLabel}</strong> görünümü</span>
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
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
            />
            {query ? (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setQuery("")}
                aria-label="Aramayı temizle"
              >
                Temizle
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.lensPanel}>
          <span className={styles.controlLabel}>Kümelenme lensi</span>
          <div
            className={styles.lensButtons}
            role="group"
            aria-label="Kümelenme lensi"
            aria-describedby={lensDescriptionId}
          >
            {lenses.map((lens) => (
              <button
                key={lens.id}
                type="button"
                className={styles.lensButton}
                aria-pressed={lens.id === activeLensId}
                onClick={() => changeLens(lens.id)}
              >
                {lens.label}
              </button>
            ))}
          </div>
          <span id={lensDescriptionId} className={styles.lensDescription}>
            {activeLens?.description ?? "Molekül yerleşimini yeniden düzenler."}
          </span>
        </div>
      </div>

      <nav className={styles.breadcrumb} aria-label="Explore görünüm yolu">
        <button type="button" onClick={showUniverse} aria-current={level === "universe" ? "page" : undefined}>
          Universe
        </button>
        {level !== "universe" && effectiveClusterName ? (
          <>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => enterCluster(effectiveClusterName)}
              aria-current={level === "cluster" ? "page" : undefined}
            >
              {effectiveClusterName}
            </button>
          </>
        ) : null}
        {level === "focus" && selectedMolecule ? (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{selectedMolecule.name}</span>
          </>
        ) : null}
        <p>{activeLens?.label ?? "Lens"}</p>
      </nav>

      <ul className={styles.srOnly} aria-label="Molekül kimliği ve kanıt durumları">
        {visibleMolecules.map((molecule) => (
          <li key={molecule.id}>
            {molecule.name}: {molecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}
          </li>
        ))}
      </ul>

      {level === "universe" ? (
        <div
          className={styles.universeStage}
          data-dragging={isDragging ? "true" : "false"}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          aria-label={`${activeLens?.label ?? "Seçili"} lensinde molekül evreni`}
        >
          <p className={styles.srOnly}>
            Kümeler arasında ok tuşlarıyla ilerleyin. Bir kümeyi açmak için Enter
            tuşuna basın. Boş alanda sürükleyerek sahneyi kaydırabilirsiniz.
          </p>
          <div className={styles.axisLabel} aria-hidden="true">
            <span>{activeLens?.label}</span>
            <i />
          </div>
          <div
            className={styles.universeWorld}
            style={{
              transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            }}
          >
            {clusters.map((cluster, index) => {
              const clusterId = `cluster:${cluster.name}`;
              const structureMolecules = cluster.molecules
                .filter((molecule) => molecule.structure?.twoDUrl)
                .slice(0, 3);
              const accent = cluster.molecules[0]?.accent ?? "#89e4c4";
              const clusterStyle: SpatialStyle = {
                "--x": `${clamp(cluster.position.x, 7, 93)}%`,
                "--y": `${clamp(cluster.position.y, 10, 90)}%`,
                "--accent": accent,
              };

              return (
                <button
                  key={cluster.name}
                  ref={(node) => {
                    if (node) nodeRefs.current.set(clusterId, node);
                    else nodeRefs.current.delete(clusterId);
                  }}
                  type="button"
                  className={styles.clusterNode}
                  style={clusterStyle}
                  onClick={() => enterCluster(cluster.name)}
                  onKeyDown={(event) =>
                    handleDirectionalNavigation(
                      event,
                      clusters.map((item) => `cluster:${item.name}`),
                      index,
                    )
                  }
                  aria-label={`${cluster.name} kümesi, ${cluster.molecules.length} molekül`}
                >
                  <span className={styles.clusterHalo} aria-hidden="true" />
                  <span className={styles.clusterStructures} aria-hidden="true">
                    {structureMolecules.length > 0 ? (
                      structureMolecules.map((molecule) => (
                        <MoleculeStructurePreview
                          key={molecule.id}
                          className={styles.clusterPreview}
                          structureUrl={molecule.structure?.twoDUrl ?? ""}
                          moleculeName={molecule.name}
                        />
                      ))
                    ) : (
                      <StructureUnavailable compact />
                    )}
                  </span>
                  <span className={styles.clusterIdentity}>
                    <strong>{cluster.name}</strong>
                    <small>{cluster.molecules.length} molekül · kümeyi aç</small>
                  </span>
                </button>
              );
            })}
          </div>

          {visibleMolecules.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <strong>Eşleşen molekül bulunamadı</strong>
              <p>Farklı bir isim, formül, grup veya kaynak deneyin.</p>
              <button type="button" onClick={() => setQuery("")}>Aramayı temizle</button>
            </div>
          ) : null}

          <div className={styles.cameraControls} aria-label="Evren kamerası">
            <button type="button" onClick={() => updateZoom(-0.12)} aria-label="Uzaklaştır">−</button>
            <output aria-label="Yakınlaştırma düzeyi">{Math.round(camera.scale * 100)}%</output>
            <button type="button" onClick={() => updateZoom(0.12)} aria-label="Yakınlaştır">+</button>
            <button type="button" onClick={() => setCamera(DEFAULT_CAMERA)}>Merkezle</button>
          </div>

          <div className={styles.stageStatus} role="status">
            <span>{visibleMolecules.length} görünür molekül</span>
            <span>{clusters.length} küme</span>
            <span>Hafif SDF önizleme</span>
          </div>
        </div>
      ) : null}

      {level === "cluster" ? (
        <div className={styles.clusterStage}>
          <header className={styles.clusterHeader}>
            <div>
              <p>{activeLens?.label} / CLUSTER</p>
              <h3 ref={viewHeadingRef} tabIndex={-1}>{effectiveClusterName ?? "Küme"}</h3>
            </div>
            <span>{clusterMolecules.length} molekül · bir yapıyı focus görünümünde açın</span>
          </header>

          {clusterMolecules.length > 0 ? (
            <div className={styles.moleculeGrid}>
              {clusterMolecules.map((molecule, index) => {
                const moleculeId = `molecule:${molecule.id}`;
                return (
                  <button
                    key={molecule.id}
                    ref={(node) => {
                      if (node) nodeRefs.current.set(moleculeId, node);
                      else nodeRefs.current.delete(moleculeId);
                    }}
                    type="button"
                    className={styles.moleculeChoice}
                    style={{ "--accent": molecule.accent ?? "#89e4c4" } as CSSProperties}
                    onClick={() => openMolecule(molecule)}
                    onKeyDown={(event) =>
                      handleDirectionalNavigation(
                        event,
                        clusterMolecules.map((item) => `molecule:${item.id}`),
                        index,
                      )
                    }
                    aria-label={`${molecule.name}${molecule.formula ? `, ${molecule.formula}` : ""}. ${molecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}. Focus görünümünü aç.`}
                  >
                    <span className={styles.choiceStructure} aria-hidden="true">
                      {molecule.structure?.twoDUrl ? (
                        <MoleculeStructurePreview
                          className={styles.choicePreview}
                          structureUrl={molecule.structure.twoDUrl}
                          moleculeName={molecule.name}
                        />
                      ) : (
                        <StructureUnavailable />
                      )}
                    </span>
                    <span className={styles.choiceIdentity}>
                      <span>
                        <strong>{molecule.name}</strong>
                        <small>{molecule.formula ?? molecule.category ?? "Formül belirtilmedi"}</small>
                      </span>
                      <i data-tone={molecule.evidenceTone ?? "unknown"} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyStateInline} role="status">
              <strong>Bu kümede aramayla eşleşen molekül yok</strong>
              <p>Aramayı temizleyin veya Universe görünümüne dönün.</p>
              <div>
                <button type="button" onClick={() => setQuery("")}>Aramayı temizle</button>
                <button type="button" onClick={showUniverse}>Universe’a dön</button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {level === "focus" && selectedMolecule ? (
        <div className={styles.focusStage} data-inspector={inspectorOpen ? "open" : "closed"}>
          <div className={styles.focusMain}>
            <header className={styles.focusHeader}>
              <div>
                <p>MOLECULE FOCUS / {selectedMolecule.formula ?? "FORMÜL BELİRTİLMEDİ"}</p>
                <h3 ref={viewHeadingRef} tabIndex={-1}>{selectedMolecule.name}</h3>
              </div>
              <div className={styles.focusActions}>
                <button type="button" onClick={showCluster}>Kümeye dön</button>
                <button
                  type="button"
                  aria-expanded={inspectorOpen}
                  aria-controls="molecule-focus-inspector"
                  onClick={() => setInspectorOpen((current) => !current)}
                >
                  {inspectorOpen ? "Bilgi panelini kapat" : "Bilgi panelini aç"}
                </button>
              </div>
            </header>

            <div className={styles.viewerSurface}>
              {selectedMolecule.structure?.threeDUrl ? (
                <MoleculeViewer
                  className={styles.focusViewer}
                  structureUrl={selectedMolecule.structure.threeDUrl}
                  twoDStructureUrl={selectedMolecule.structure.twoDUrl}
                  moleculeName={selectedMolecule.name}
                  sourceLabel={selectedMolecule.structure.sourceLabel ?? "Kaynak etiketi belirtilmedi"}
                  sourceHref={selectedMolecule.structure.sourceHref}
                  originLabel={selectedMolecule.structure.originLabel ?? "Köken belirtilmedi"}
                  twoDSourceLabel={selectedMolecule.structure.twoDSourceLabel}
                  twoDSourceHref={selectedMolecule.structure.twoDSourceHref}
                  twoDOriginLabel={selectedMolecule.structure.twoDOriginLabel}
                />
              ) : (
                <div className={styles.structureError} role="alert">
                  <span>STRUCTURE UNAVAILABLE</span>
                  <h4>Doğrulanabilir yapı dosyası bulunamadı.</h4>
                  <p>
                    {selectedMolecule.name} için sahte atom geometrisi veya rastgele bağ
                    üretilmedi. İnceleme, kaynakla ilişkilendirilmiş bir SDF kaydı
                    eklendiğinde açılacak.
                  </p>
                </div>
              )}
            </div>
          </div>

          {inspectorOpen ? (
            <aside
              id="molecule-focus-inspector"
              className={styles.inspector}
              aria-label={`${selectedMolecule.name} bilgi paneli`}
            >
              <div className={styles.inspectorTopline}>
                <span className={styles.evidenceBadge} data-tone={selectedMolecule.evidenceTone ?? "unknown"}>
                  <i aria-hidden="true" />
                  {selectedMolecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}
                </span>
                <button type="button" onClick={() => setInspectorOpen(false)} aria-label="Bilgi panelini kapat">
                  Kapat
                </button>
              </div>

              <p className={styles.inspectorKicker}>SECONDARY INSPECTOR</p>
              <h4>{selectedMolecule.name}</h4>
              <p className={styles.formula}>{selectedMolecule.formula ?? "Formül belirtilmedi"}</p>
              <p className={styles.summary}>{selectedMolecule.summary ?? "Kısa eğitim özeti eklenmedi."}</p>

              <dl className={styles.provenanceList}>
                <div>
                  <dt>3B kaynak</dt>
                  <dd>
                    {selectedMolecule.structure?.sourceHref ? (
                      <a href={selectedMolecule.structure.sourceHref} target="_blank" rel="noreferrer">
                        {selectedMolecule.structure.sourceLabel ?? "Kaynak kaydı"}
                      </a>
                    ) : (
                      selectedMolecule.structure?.sourceLabel ?? "Belirtilmedi"
                    )}
                  </dd>
                </div>
                <div><dt>3B köken</dt><dd>{selectedMolecule.structure?.originLabel ?? "Belirtilmedi"}</dd></div>
                <div><dt>3B inceleme</dt><dd>{selectedMolecule.structure?.reviewStatus ?? "Belirtilmedi"}</dd></div>
                <div>
                  <dt>2B kaynak</dt>
                  <dd>
                    {selectedMolecule.structure?.twoDSourceHref ? (
                      <a href={selectedMolecule.structure.twoDSourceHref} target="_blank" rel="noreferrer">
                        {selectedMolecule.structure.twoDSourceLabel ?? "Kaynak kaydı"}
                      </a>
                    ) : (
                      selectedMolecule.structure?.twoDSourceLabel ?? "Belirtilmedi"
                    )}
                  </dd>
                </div>
                <div><dt>2B köken</dt><dd>{selectedMolecule.structure?.twoDOriginLabel ?? "Belirtilmedi"}</dd></div>
                <div><dt>2B inceleme</dt><dd>{selectedMolecule.structure?.twoDReviewStatus ?? "Belirtilmedi"}</dd></div>
              </dl>

              {!provenanceIsComplete(selectedMolecule) ? (
                <p className={styles.provenanceWarning} role="status">
                  Provenance kaydı eksik. Bu yapı doğrulanmış bilimsel içerik olarak sunulmuyor.
                </p>
              ) : null}

              <dl className={styles.lensValues}>
                {lenses.map((lens) => (
                  <div key={lens.id} data-active={lens.id === activeLensId ? "true" : "false"}>
                    <dt>{lens.label}</dt>
                    <dd>{getLensValue(selectedMolecule, lens.id)}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          ) : null}
        </div>
      ) : null}

      <footer className={styles.footer}>
        <span><kbd>Esc</kbd> geri dön / aramayı temizle</span>
        <span><kbd>←</kbd><kbd>→</kbd> yapılar arasında gezin</span>
        <span>Yerleşim, bilimsel yakınlık veya doğrulanmış etki hükmü değildir.</span>
      </footer>
    </section>
  );
}

export default MoleculeUniverse;
