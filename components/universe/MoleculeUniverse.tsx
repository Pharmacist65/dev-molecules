"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import styles from "./MoleculeUniverse.module.css";

export type MoleculeEvidenceTone =
  | "verified"
  | "supported"
  | "predicted"
  | "unknown";

export interface UniverseLens {
  id: string;
  label: string;
  description?: string;
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
}

export interface MoleculeUniverseProps {
  molecules?: readonly UniverseMolecule[];
  lenses?: readonly UniverseLens[];
  initialLensId?: string;
  initialSelectedId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  onMoleculeSelect?: (molecule: UniverseMolecule) => void;
}

type SpatialStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--accent": string;
  "--delay": string;
};

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const DEFAULT_UNIVERSE_LENSES: readonly UniverseLens[] = [
  {
    id: "therapeutic",
    label: "Tedavi alanı",
    description: "Molekülleri yaygın eğitim bağlamlarına göre yakınlaştırır.",
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

export const DEFAULT_UNIVERSE_MOLECULES: readonly UniverseMolecule[] = [
  {
    id: "acetylsalicylic-acid",
    name: "Asetilsalisilik asit",
    formula: "C₉H₈O₄",
    category: "Analjezik",
    summary:
      "Küçük molekül kimliği, ester motifi ve kanıt katmanlarını birlikte incelemek için başlangıç düğümü.",
    lensValues: {
      therapeutic: "Ağrı ve inflamasyon",
      target: "Enzimler",
      scaffold: "Aromatik ester",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#ffb65d",
  },
  {
    id: "ibuprofen",
    name: "İbuprofen",
    formula: "C₁₃H₁₈O₂",
    category: "NSAİİ",
    summary:
      "Propiyonik asit iskeleti üzerinden yapı, sınıf ve hedef ilişkilerini keşfetmeye uygun örnek.",
    lensValues: {
      therapeutic: "Ağrı ve inflamasyon",
      target: "Enzimler",
      scaffold: "Arilpropiyonik asit",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#ff886f",
  },
  {
    id: "propranolol",
    name: "Propranolol",
    formula: "C₁₆H₂₁NO₂",
    category: "Beta bloker",
    summary:
      "Aynı sınıftaki analogları ve stereokimya sorularını izlemek için bir atlas durağı.",
    lensValues: {
      therapeutic: "Kardiyovasküler",
      target: "GPCR",
      scaffold: "Ariloksipropanolamin",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#7ed7ff",
  },
  {
    id: "metformin",
    name: "Metformin",
    formula: "C₄H₁₁N₅",
    category: "Biguanid",
    summary:
      "Küçük ve az aromatik bir yapının farklı lenslerde nasıl yeniden konumlandığını gösterir.",
    lensValues: {
      therapeutic: "Metabolizma",
      target: "Çok katmanlı etki",
      scaffold: "Biguanid",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#69e5bd",
  },
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    formula: "C₃₃H₃₅FN₂O₅",
    category: "Statin",
    summary:
      "Daha karmaşık bir iskeleti sentez öyküsü ve hedef ailesiyle yan yana okumaya açar.",
    lensValues: {
      therapeutic: "Kardiyovasküler",
      target: "Enzimler",
      scaffold: "Dihidroksiheptanoik asit",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#6ea8ff",
  },
  {
    id: "amoxicillin",
    name: "Amoksisilin",
    formula: "C₁₆H₁₉N₃O₅S",
    category: "Beta-laktam",
    summary:
      "Halka gerilimi, sınıf ortaklığı ve yapı doğruluğunu tartışmak için öğretim düğümü.",
    lensValues: {
      therapeutic: "Enfeksiyon",
      target: "Bakteriyel enzimler",
      scaffold: "Beta-laktam",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#c79cff",
  },
  {
    id: "omeprazole",
    name: "Omeprazol",
    formula: "C₁₇H₁₉N₃O₃S",
    category: "Proton pompası inhibitörü",
    summary:
      "Heterohalkalar ve aktifleşme bağlamını ayrı kanıt katmanlarıyla okumayı destekler.",
    lensValues: {
      therapeutic: "Gastrointestinal",
      target: "Membran enzimleri",
      scaffold: "Benzimidazol",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#f5d96c",
  },
  {
    id: "caffeine",
    name: "Kafein",
    formula: "C₈H₁₀N₄O₂",
    category: "Ksantin",
    summary:
      "Kompakt bir heterohalkalı yapıyı hedef ve iskelet lenslerinde karşılaştırmaya yarar.",
    lensValues: {
      therapeutic: "Merkezi sinir sistemi",
      target: "GPCR",
      scaffold: "Ksantin",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#f39fda",
  },
  {
    id: "fluoxetine",
    name: "Fluoksetin",
    formula: "C₁₇H₁₈F₃NO",
    category: "SSRI",
    summary:
      "Taşıyıcı hedefi, aromatik bölgeler ve analog karşılaştırması için örnek molekül.",
    lensValues: {
      therapeutic: "Merkezi sinir sistemi",
      target: "Taşıyıcılar",
      scaffold: "Ariloksi propilamin",
    },
    evidenceLabel: "Demo içerik",
    evidenceTone: "unknown",
    accent: "#bc9cff",
  },
] as const;

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(MOTION_QUERY).matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function getLensValue(molecule: UniverseMolecule, lensId: string) {
  return molecule.lensValues?.[lensId] ?? molecule.category ?? "Diğer";
}

export function MoleculeUniverse({
  molecules = DEFAULT_UNIVERSE_MOLECULES,
  lenses = DEFAULT_UNIVERSE_LENSES,
  initialLensId,
  initialSelectedId,
  eyebrow = "MOLECULE UNIVERSE",
  title = "İlaç evrenini farklı lenslerle keşfet",
  description =
    "Moleküller arasında gezin, kümelenme mantığını değiştir ve seçtiğin yapının kanıt pasaportuna yaklaş.",
  className,
  onMoleculeSelect,
}: MoleculeUniverseProps) {
  const headingId = useId();
  const searchId = useId();
  const lensDescriptionId = useId();
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const prefersReducedMotion = usePrefersReducedMotion();
  const [motionPaused, setMotionPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [lensId, setLensId] = useState(
    initialLensId ?? lenses[0]?.id ?? "therapeutic",
  );
  const [selectedId, setSelectedId] = useState(
    initialSelectedId ?? molecules[0]?.id ?? "",
  );

  const activeLens = lenses.find((lens) => lens.id === lensId) ?? lenses[0];
  const activeLensId = activeLens?.id ?? lensId;
  const normalizedQuery = normalizeSearchValue(query);

  const visibleMolecules = useMemo(() => {
    if (!normalizedQuery) {
      return [...molecules];
    }

    return molecules.filter((molecule) => {
      const searchableText = [
        molecule.name,
        molecule.formula,
        molecule.category,
        molecule.summary,
        ...Object.values(molecule.lensValues ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedQuery);
    });
  }, [molecules, normalizedQuery]);

  const layout = useMemo(() => {
    const groupNames = Array.from(
      new Set(
        visibleMolecules.map((molecule) =>
          getLensValue(molecule, activeLensId),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right, "tr"));

    const groupCenters = new Map<string, { x: number; y: number }>();
    const groupCount = groupNames.length;

    groupNames.forEach((groupName, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(groupCount, 1);
      const radius = groupCount <= 1 ? 0 : groupCount === 2 ? 24 : 30;
      groupCenters.set(groupName, {
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
      });
    });

    const groupedMolecules = new Map<string, UniverseMolecule[]>();
    visibleMolecules.forEach((molecule) => {
      const groupName = getLensValue(molecule, activeLensId);
      const group = groupedMolecules.get(groupName) ?? [];
      group.push(molecule);
      groupedMolecules.set(groupName, group);
    });

    const positions = new Map<string, { x: number; y: number }>();

    groupedMolecules.forEach((group, groupName) => {
      const center = groupCenters.get(groupName) ?? { x: 50, y: 50 };

      group.forEach((molecule, index) => {
        const explicitPosition = molecule.coordinates?.[activeLensId];
        if (explicitPosition) {
          positions.set(molecule.id, {
            x: clamp(explicitPosition.x, 8, 92),
            y: clamp(explicitPosition.y, 10, 90),
          });
          return;
        }

        const seed = stableHash(`${activeLensId}:${molecule.id}`);
        const angle =
          (seed % 360) * (Math.PI / 180) +
          (index * Math.PI * 2) / Math.max(group.length, 1);
        const localRadius = group.length === 1 ? 0 : 7 + ((seed >>> 8) % 700) / 100;

        positions.set(molecule.id, {
          x: clamp(center.x + Math.cos(angle) * localRadius, 9, 91),
          y: clamp(center.y + Math.sin(angle) * localRadius, 12, 88),
        });
      });
    });

    return {
      groups: groupNames.map((name) => ({
        name,
        position: groupCenters.get(name) ?? { x: 50, y: 50 },
      })),
      positions,
    };
  }, [activeLensId, visibleMolecules]);

  const effectiveSelectedId = visibleMolecules.some(
    (molecule) => molecule.id === selectedId,
  )
    ? selectedId
    : (visibleMolecules[0]?.id ?? "");
  const selectedMolecule = visibleMolecules.find(
    (molecule) => molecule.id === effectiveSelectedId,
  );
  const motionActive = !prefersReducedMotion && !motionPaused;

  function selectMolecule(molecule: UniverseMolecule) {
    setSelectedId(molecule.id);
    onMoleculeSelect?.(molecule);
  }

  function handleNodeKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % visibleMolecules.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + visibleMolecules.length) % visibleMolecules.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = visibleMolecules.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextMolecule = visibleMolecules[nextIndex];
    if (nextMolecule) {
      nodeRefs.current.get(nextMolecule.id)?.focus();
    }
  }

  const rootClassName = className
    ? `${styles.universe} ${className}`
    : styles.universe;

  return (
    <section className={rootClassName} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id={headingId}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.headerStats} aria-label="Atlas özeti">
          <span>
            <strong>{molecules.length}</strong> molekül
          </span>
          <span>
            <strong>{lenses.length}</strong> lens
          </span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchField}>
          <label htmlFor={searchId}>Atlas içinde ara</label>
          <div className={styles.searchControl}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              placeholder="İsim, formül veya grup"
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
                ×
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
                onClick={() => setLensId(lens.id)}
              >
                {lens.label}
              </button>
            ))}
          </div>
          <span id={lensDescriptionId} className={styles.lensDescription}>
            {activeLens?.description ?? "Molekül yerleşimini yeniden düzenler."}
          </span>
        </div>

        <button
          type="button"
          className={styles.motionButton}
          aria-pressed={!motionActive}
          disabled={prefersReducedMotion}
          onClick={() => setMotionPaused((current) => !current)}
        >
          <span className={styles.motionIcon} aria-hidden="true">
            {motionActive ? "Ⅱ" : "▶"}
          </span>
          {prefersReducedMotion
            ? "Hareket sistem tercihiyle kapalı"
            : motionPaused
              ? "Hareketi başlat"
              : "Hareketi durdur"}
        </button>
      </div>

      <div className={styles.workspace}>
        <div
          className={styles.field}
          data-motion={motionActive ? "on" : "off"}
          aria-label={`${activeLens?.label ?? "Seçili"} lensinde molekül atlası`}
        >
          <p className={styles.srOnly}>
            Moleküller arasında ok tuşlarıyla ilerleyebilir, Home ve End tuşlarıyla
            listenin başına veya sonuna gidebilirsiniz.
          </p>
          <div className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
          <div className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
          <div className={`${styles.orbit} ${styles.orbitThree}`} aria-hidden="true" />
          <div className={styles.core} aria-hidden="true">
            <span />
          </div>

          {layout.groups.map((group) => (
            <span
              key={group.name}
              className={styles.clusterLabel}
              style={
                {
                  "--x": `${group.position.x}%`,
                  "--y": `${group.position.y}%`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              {group.name}
            </span>
          ))}

          {visibleMolecules.map((molecule, index) => {
            const position = layout.positions.get(molecule.id) ?? { x: 50, y: 50 };
            const isSelected = molecule.id === effectiveSelectedId;
            const nodeStyle: SpatialStyle = {
              "--x": `${position.x}%`,
              "--y": `${position.y}%`,
              "--accent": molecule.accent ?? "#8ee7d1",
              "--delay": `${-((stableHash(molecule.id) % 900) / 100)}s`,
            };

            return (
              <button
                key={molecule.id}
                type="button"
                ref={(node) => {
                  if (node) {
                    nodeRefs.current.set(molecule.id, node);
                  } else {
                    nodeRefs.current.delete(molecule.id);
                  }
                }}
                className={styles.moleculeNode}
                style={nodeStyle}
                aria-pressed={isSelected}
                aria-label={`${molecule.name}${molecule.formula ? `, ${molecule.formula}` : ""}. ${getLensValue(molecule, activeLensId)}`}
                onClick={() => selectMolecule(molecule)}
                onKeyDown={(event) => handleNodeKeyDown(event, index)}
              >
                <span className={styles.nodeGlyph} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <b />
                  <b />
                </span>
                <span className={styles.nodeText}>
                  <strong>{molecule.name}</strong>
                  <small>{molecule.formula ?? molecule.category}</small>
                </span>
              </button>
            );
          })}

          {visibleMolecules.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <span aria-hidden="true">⌁</span>
              <strong>Eşleşen molekül bulunamadı</strong>
              <p>Farklı bir isim, formül veya grup deneyin.</p>
              <button type="button" onClick={() => setQuery("")}>
                Aramayı temizle
              </button>
            </div>
          ) : null}

          <span className={styles.resultCount} role="status">
            {normalizedQuery
              ? `${visibleMolecules.length} sonuç gösteriliyor`
              : `${visibleMolecules.length} molekül görünür`}
          </span>
        </div>

        <aside className={styles.passport} aria-label="Seçili molekül pasaportu">
          {selectedMolecule ? (
            <div className={styles.passportContent} aria-live="polite">
              <div className={styles.passportTopline}>
                <span
                  className={styles.evidenceBadge}
                  data-tone={selectedMolecule.evidenceTone ?? "unknown"}
                >
                  <i aria-hidden="true" />
                  {selectedMolecule.evidenceLabel ?? "Kanıt durumu belirtilmedi"}
                </span>
                <span className={styles.passportIndex}>
                  {String(
                    visibleMolecules.findIndex(
                      (molecule) => molecule.id === selectedMolecule.id,
                    ) + 1,
                  ).padStart(2, "0")}
                  /{String(visibleMolecules.length).padStart(2, "0")}
                </span>
              </div>

              <p className={styles.passportKicker}>SEÇİLİ MOLEKÜL</p>
              <h3>{selectedMolecule.name}</h3>
              <p className={styles.formula}>{selectedMolecule.formula ?? "Formül eklenmedi"}</p>
              <p className={styles.summary}>
                {selectedMolecule.summary ??
                  "Bu molekül için kısa eğitim özeti henüz eklenmedi."}
              </p>

              <dl className={styles.lensValues}>
                {lenses.map((lens) => (
                  <div
                    key={lens.id}
                    data-active={lens.id === activeLensId ? "true" : "false"}
                  >
                    <dt>{lens.label}</dt>
                    <dd>{getLensValue(selectedMolecule, lens.id)}</dd>
                  </div>
                ))}
              </dl>

              <div className={styles.passportHint}>
                <span aria-hidden="true">↗</span>
                <p>
                  Bu yüzey yalnız keşif özetidir. Kaynak, sentez ve deneysel durum
                  bilgileri ayrıntılı pasaportta doğrulanmalıdır.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.passportEmpty}>
              <span aria-hidden="true">✦</span>
              <h3>Bir molekül seçin</h3>
              <p>Pasaport özeti ve lens ilişkileri burada görünecek.</p>
            </div>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          düğümler arasında gezin
        </span>
        <span>
          <kbd>Esc</kbd> aramayı temizle
        </span>
        <span className={styles.footerNote}>Yerleşim, bilimsel yakınlık hükmü değildir.</span>
      </footer>
    </section>
  );
}

export default MoleculeUniverse;
