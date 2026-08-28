"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ExplorePresentationMode,
  UniverseIndexedCatalog,
  UniverseLearningActions,
} from "@/components/universe";
import { MolecularAtmosphere } from "@/components/brand";
import {
  canonicalizeIndexedCatalogBrowsePage,
  canonicalizeIndexedCatalogHit,
  createExpandedExploreMolecule,
  createReviewedCatalogIdentityIndex,
  IndexedCatalogNavigator,
  loadCatalogExpansion,
  MAX_RUNTIME_HYDRATED_RECORDS,
  mergeCatalogExpansionIntoExplore,
  retainHydratedCatalogEntity,
  type CatalogExpansion,
  type IndexedCatalogHit,
} from "@/lib/application/catalog-expansion";
import { createExploreCatalogView } from "@/lib/application/explore-catalog";
import {
  DEFAULT_DRUG_ATLAS_BROWSE_STATE,
  normalizeDrugAtlasBrowseState,
  type DrugAtlasBrowseState,
} from "@/lib/application/drug-atlas";
import {
  DEFAULT_PLATFORM_ROUTE,
  getDrugHash,
  getPrimaryNavigationSection,
  getSynthesisAcademyHash,
  parsePlatformHash,
  type PlatformRoute,
  type PlatformSection,
} from "@/lib/application/platform-route";
import {
  resolveSynthesisCatalogSelection,
  type SynthesisCatalogSelection,
} from "@/lib/application/synthesis-catalog";
import type { CatalogNormalizedEntity } from "@/lib/catalog";
import { moleculeCatalog } from "@/lib/data/catalog";
import { curatedDossierMolecules } from "@/lib/data/curated-dossier-catalog";
import { createDrugFamilyPage } from "@/lib/data/family-pages";
import { learningMissions } from "@/lib/data/learning-missions";
import type { NomenclatureProgressSnapshot } from "@/lib/domain";
import type { AcademyModuleId } from "@/lib/domain/academy";
import type {
  InstructorProgressSnapshot,
  LearnerPresentationMode,
  NomenclatureInstructorTaskId,
} from "@/lib/domain/role-experience";
import { getMolevrenAssetUrl, MOLEVREN_BRAND } from "@/lib/brand/molevren-brand";
import {
  DEFAULT_WORKING_BRAND_MODE,
  MOLEVREN_WORKING_BRAND_STORAGE_KEY,
  resolveWorkingBrandMode,
  type WorkingBrandMode,
} from "@/lib/brand/working-brand";
import { useMolevrenMotionPreference } from "@/lib/brand/motion-preference";
import { I18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";

import { CatalogSearch } from "./CatalogSearch";
import HomeLanding from "./HomeLanding";
import styles from "./platform.module.css";

const DrugAtlas = lazy(() =>
  import("@/components/atlas").then((module) => ({ default: module.DrugAtlas })),
);
const DrugDossier = lazy(() =>
  import("@/components/dossier").then((module) => ({ default: module.DrugDossier })),
);
const MolecularRecordRoute = lazy(() =>
  import("@/components/basic-record").then((module) => ({
    default: module.MolecularRecordRoute,
  })),
);
const FamilyPage = lazy(() =>
  import("@/components/atlas/FamilyPage").then((module) => ({ default: module.FamilyPage })),
);
const AcademyHub = lazy(() =>
  import("@/components/academy").then((module) => ({ default: module.AcademyHub })),
);
const SynthesisAcademyHub = lazy(() =>
  import("@/components/synthesis").then((module) => ({
    default: module.SynthesisAcademyHub,
  })),
);
const LabHub = lazy(() =>
  import("@/components/lab").then((module) => ({ default: module.LabHub })),
);
const InstructorHub = lazy(() =>
  import("@/components/instructor").then((module) => ({ default: module.InstructorHub })),
);
const ReviewerConsole = lazy(() =>
  import("@/components/reviewer").then((module) => ({ default: module.ReviewerConsole })),
);
const MissionStudio = lazy(() =>
  import("./MissionStudio").then((module) => ({ default: module.MissionStudio })),
);

const PRESENTATION_MODE_STORAGE_KEY = "dev-molecules:presentation-mode";
const ATLAS_BROWSE_STATE_STORAGE_KEY = "dev-molecules:atlas-browse-state:v1";
// Legacy/pending synthesis fixtures are not public learning-lens capabilities.
// Future identities enter here only from the generated review-and-rights-gated
// public route projection.
const SYNTHESIS_MOLECULE_IDS: readonly string[] = [];
const LEARNING_TASK_MOLECULE_IDS = [
  ...new Set(learningMissions.flatMap((mission) => mission.moleculeIds)),
];

const PRIMARY_NAVIGATION: readonly {
  readonly section: Extract<PlatformSection, "home" | "atlas" | "academy" | "lab">;
  readonly labelKey: TranslationKey;
  readonly hash: string;
}[] = [
  { section: "home", labelKey: "nav.home", hash: "#home" },
  { section: "atlas", labelKey: "nav.drugAtlas", hash: "#atlas" },
  { section: "academy", labelKey: "nav.academy", hash: "#academy" },
  { section: "lab", labelKey: "nav.lab", hash: "#lab" },
];

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}

function getMoleculeSlug(moleculeId: string) {
  const separatorIndex = Math.max(moleculeId.lastIndexOf(":"), moleculeId.lastIndexOf("/"));
  return separatorIndex >= 0 ? moleculeId.slice(separatorIndex + 1) : moleculeId;
}

function getAcademyModuleId(route: PlatformRoute): AcademyModuleId | null {
  if (route.section !== "academy") return null;
  if (route.academyArea === "synthesis" && !route.slug) return "synthesis-atlas";
  if (route.academyArea === "pharmacology") return "pharmacology";
  if (route.academyArea === "nomenclature") {
    if (route.lessonId === "structure-language") return "structure-language";
    if (route.lessonId === "pharmaceutical") return "pharmaceutical-nomenclature";
    return "organic-nomenclature";
  }
  if (route.academyArea === "module") {
    const moduleIds: readonly AcademyModuleId[] = [
      "structure-language",
      "organic-nomenclature",
      "pharmaceutical-nomenclature",
      "pharmacology",
      "adme",
      "reaction-mechanisms",
      "synthesis-atlas",
      "drug-review-project",
    ];
    return moduleIds.find((moduleId) => moduleId === route.lessonId) ?? null;
  }
  return null;
}

function getAcademyModuleHash(moduleId: AcademyModuleId | null): string {
  if (!moduleId) return "#academy";
  if (moduleId === "structure-language") {
    return "#academy/nomenclature/structure-language";
  }
  if (moduleId === "organic-nomenclature") {
    return "#academy/nomenclature/organic";
  }
  if (moduleId === "pharmaceutical-nomenclature") {
    return "#academy/nomenclature/pharmaceutical";
  }
  if (moduleId === "pharmacology") return "#academy/pharmacology/targets";
  return `#academy/module/${encodeURIComponent(moduleId)}`;
}

function LoadingPage({ label }: { readonly label: string }) {
  return <div className={styles.routeLoading} role="status"><i aria-hidden="true" /><span>{label}</span></div>;
}

function CuratedWorkflowUnavailable({
  eyebrow,
  title,
  description,
  actionLabel,
  onReturnToAtlas,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onReturnToAtlas: () => void;
}) {
  return (
    <section className={styles.workflowUnavailable} data-curated-workflow="unavailable">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <button type="button" onClick={onReturnToAtlas}>{actionLabel}</button>
    </section>
  );
}

function DevMoleculesWorkspace() {
  const { locale, setLocale, t } = useI18n();
  const { motionMode, setMotionMode } = useMolevrenMotionPreference();
  const [route, setRoute] = useState<PlatformRoute>(DEFAULT_PLATFORM_ROUTE);
  const [workingBrandMode, setWorkingBrandMode] =
    useState<WorkingBrandMode>(DEFAULT_WORKING_BRAND_MODE);
  const [experienceMode, setExperienceMode] = useState<LearnerPresentationMode>("student");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogExpansion, setCatalogExpansion] = useState<CatalogExpansion | null>(null);
  const [hydratedCatalogEntities, setHydratedCatalogEntities] =
    useState<readonly CatalogNormalizedEntity[]>([]);
  const [catalogLoadStatus, setCatalogLoadStatus] =
    useState<"loading" | "ready" | "fallback">("loading");
  const [atlasBrowseState, setAtlasBrowseState] = useState<DrugAtlasBrowseState>(
    DEFAULT_DRUG_ATLAS_BROWSE_STATE,
  );
  const [atlasBrowseStateRestored, setAtlasBrowseStateRestored] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(moleculeCatalog[0]?.id ?? "");
  const [synthesisCatalogState, setSynthesisCatalogState] = useState<
    | { readonly routeKey: string; readonly status: "ready"; readonly selection: SynthesisCatalogSelection }
    | { readonly routeKey: string; readonly status: "unavailable" }
    | null
  >(null);
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());
  const [nomenclatureProgress, setNomenclatureProgress] =
    useState<NomenclatureProgressSnapshot | null>(null);
  // Anonymous learner depth never grants the separate Reviewer capability.
  // Expert currently receives the denser Dossier reference layout only; raw
  // draft classifications and reviewer diagnostics remain authorization-gated.
  const presentationMode: ExplorePresentationMode = "student";
  const instructorProgressSnapshot = useMemo<InstructorProgressSnapshot | null>(
    () => nomenclatureProgress
      ? {
          scope: "device-local",
          capturedAt: new Date().toISOString(),
          completedNomenclatureTaskIds: nomenclatureProgress.completedExerciseIds
            .filter((exerciseId) => exerciseId.startsWith("academy:")) as readonly NomenclatureInstructorTaskId[],
          completedSynthesisTaskIds: [],
        }
      : null,
    [nomenclatureProgress],
  );

  const assetBasePath = import.meta.env.BASE_URL;
  const molevrenWorkingBrandEnabled = workingBrandMode === "molevren";
  const activeFamilyPage = useMemo(
    () => route.section === "family" && route.familyId
      ? createDrugFamilyPage(route.familyId, assetBasePath)
      : null,
    [assetBasePath, route.familyId, route.section],
  );
  const seedExploreCatalogView = useMemo(
    () => createExploreCatalogView(moleculeCatalog, locale, assetBasePath),
    [assetBasePath, locale],
  );
  const indexedCatalogNavigator = useMemo(
    () =>
      new IndexedCatalogNavigator({
        basePath: assetBasePath,
        maxShardEntries: 8,
        maxStructureEntries: 24,
        maxHydratedEntries: MAX_RUNTIME_HYDRATED_RECORDS,
      }),
    [assetBasePath],
  );
  const reviewedCatalogIdentities = useMemo(
    () => createReviewedCatalogIdentityIndex(seedExploreCatalogView.molecules),
    [seedExploreCatalogView.molecules],
  );
  const residentCatalogExpansion = useMemo<CatalogExpansion | null>(() => {
    if (!catalogExpansion) return null;
    const initialIds = new Set(catalogExpansion.entities.map((entity) => entity.id));
    return {
      manifest: catalogExpansion.manifest,
      entities: [
        ...catalogExpansion.entities,
        ...hydratedCatalogEntities.filter((entity) => !initialIds.has(entity.id)),
      ],
    };
  }, [catalogExpansion, hydratedCatalogEntities]);
  const exploreCatalogView = useMemo(
    () =>
      residentCatalogExpansion
        ? mergeCatalogExpansionIntoExplore(
            seedExploreCatalogView,
            residentCatalogExpansion,
            locale,
            assetBasePath,
          )
        : seedExploreCatalogView,
    [assetBasePath, locale, residentCatalogExpansion, seedExploreCatalogView],
  );

  const searchCatalog = useCallback(
    async (query: string, limit = 7) =>
      (await indexedCatalogNavigator.search(query, limit)).map((record) =>
        canonicalizeIndexedCatalogHit(record, reviewedCatalogIdentities),
      ),
    [indexedCatalogNavigator, reviewedCatalogIdentities],
  );

  const indexedCatalog = useMemo<UniverseIndexedCatalog>(
    () => ({
      search: searchCatalog,
      browse: async (offset, limit) =>
        canonicalizeIndexedCatalogBrowsePage(
          await indexedCatalogNavigator.browse(offset, limit),
          reviewedCatalogIdentities,
        ),
      resolveStableSlug: async (stableSlug) => {
        const record = await indexedCatalogNavigator.resolveStableSlug(stableSlug);
        return record
          ? canonicalizeIndexedCatalogHit(record, reviewedCatalogIdentities)
          : null;
      },
      hydrate: async (entityId) => {
        const reviewed = reviewedCatalogIdentities.byCanonicalId.get(entityId);
        if (reviewed) return reviewed;
        const resident = residentCatalogExpansion?.entities.find((entity) => entity.id === entityId);
        const entity = resident ?? (await indexedCatalogNavigator.hydrate(entityId));
        if (!entity) return null;
        if (!resident) {
          setHydratedCatalogEntities((current) => retainHydratedCatalogEntity(current, entity));
        }
        return createExpandedExploreMolecule(entity, locale, assetBasePath);
      },
    }),
    [
      assetBasePath,
      indexedCatalogNavigator,
      locale,
      residentCatalogExpansion,
      reviewedCatalogIdentities,
      searchCatalog,
    ],
  );

  const navigate = useCallback((hash: string) => {
    const nextRoute = parsePlatformHash(hash);
    setSettingsOpen(false);
    setSearchOpen(false);
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setRoute(nextRoute);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const learningActions = useMemo<UniverseLearningActions>(
    () => ({
      synthesisMoleculeIds: SYNTHESIS_MOLECULE_IDS,
      taskMoleculeIds: LEARNING_TASK_MOLECULE_IDS,
      onOpenSynthesis: (molecule) => {
        setSelectedId(molecule.id);
        navigate(getSynthesisAcademyHash(getMoleculeSlug(molecule.id), "atlas"));
      },
      onOpenNomenclature: (molecule) => {
        setSelectedId(molecule.id);
        navigate("#academy/nomenclature/foundations");
      },
      onOpenTasks: (molecule) => {
        setSelectedId(molecule.id);
        navigate(getSynthesisAcademyHash(getMoleculeSlug(molecule.id)));
        window.requestAnimationFrame(() => {
          document.getElementById("missions-heading")?.scrollIntoView({ block: "start" });
        });
      },
    }),
    [navigate],
  );

  const requestedSynthesisMolecule =
    route.section === "academy" && route.academyArea === "synthesis" && route.slug
      ? curatedDossierMolecules.find(
          (molecule) => getMoleculeSlug(molecule.id) === route.slug,
        )
      : undefined;
  useEffect(() => {
    if (
      route.section !== "academy" ||
      route.academyArea !== "synthesis" ||
      !route.slug
    ) {
      return;
    }

    let cancelled = false;
    const routeKey = route.slug;
    const fallbackIdentity = requestedSynthesisMolecule
      ? {
          curatedMoleculeId: requestedSynthesisMolecule.id,
          preferredName: requestedSynthesisMolecule.identity.preferredName,
          pubChemCid: requestedSynthesisMolecule.identity.pubChemCid,
          inchiKey: requestedSynthesisMolecule.identity.inchiKey,
        }
      : undefined;
    void resolveSynthesisCatalogSelection(route.slug, indexedCatalogNavigator, {
      assetBasePath,
      fallbackIdentity,
    })
      .then((selection) => {
        if (cancelled) return;
        setSynthesisCatalogState(selection
          ? { routeKey, status: "ready", selection }
          : { routeKey, status: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setSynthesisCatalogState({ routeKey, status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [assetBasePath, indexedCatalogNavigator, requestedSynthesisMolecule, route.academyArea, route.section, route.slug]);
  const activeSynthesisCatalogState =
    route.slug && synthesisCatalogState?.routeKey === route.slug
      ? synthesisCatalogState
      : { routeKey: route.slug ?? "", status: "loading" as const };
  const featuredExploreMolecule =
    seedExploreCatalogView.molecules.find(
      (molecule) => molecule.name.toLocaleLowerCase("en").includes("celecoxib"),
    ) ?? seedExploreCatalogView.molecules.find((molecule) => molecule.structure.threeDUrl);
  const primarySection = getPrimaryNavigationSection(route);
  const atmosphereRoute =
    route.section === "academy" && route.academyArea === "synthesis"
      ? "synthesis"
      : route.section;

  useEffect(() => {
    const synchronizeRoute = () => {
      const parsed = parsePlatformHash(window.location.hash);
      if (parsed.canonicalHash && window.location.hash !== parsed.canonicalHash) {
        window.history.replaceState(null, "", parsed.canonicalHash);
        setRoute(parsePlatformHash(parsed.canonicalHash));
        return;
      }
      setRoute(parsed);
    };
    synchronizeRoute();
    window.addEventListener("hashchange", synchronizeRoute);
    window.addEventListener("popstate", synchronizeRoute);
    return () => {
      window.removeEventListener("hashchange", synchronizeRoute);
      window.removeEventListener("popstate", synchronizeRoute);
    };
  }, []);

  useEffect(() => {
    const synchronizeWorkingBrand = () => {
      let storedPreference: string | null = null;
      try {
        storedPreference = window.localStorage.getItem(
          MOLEVREN_WORKING_BRAND_STORAGE_KEY,
        );
      } catch {
        // The compile-time flag and query override remain available.
      }
      setWorkingBrandMode(resolveWorkingBrandMode({
        search: window.location.search,
        storedPreference,
      }));
    };
    synchronizeWorkingBrand();
    window.addEventListener("popstate", synchronizeWorkingBrand);
    window.addEventListener("storage", synchronizeWorkingBrand);
    return () => {
      window.removeEventListener("popstate", synchronizeWorkingBrand);
      window.removeEventListener("storage", synchronizeWorkingBrand);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.motion = motionMode;
    document.documentElement.dataset.workingBrand = workingBrandMode;
    document.title = molevrenWorkingBrandEnabled
      ? `${MOLEVREN_BRAND.publicName} — ${t("brand.descriptor")}`
      : locale === "tr"
        ? "Dev Molecules — Farmasötik moleküler öğrenme"
        : "Dev Molecules — Pharmaceutical molecular learning";
  }, [locale, molevrenWorkingBrandEnabled, motionMode, t, workingBrandMode]);

  useEffect(() => {
    if (route.section !== "academy") return;
    let selectionTimer: number | undefined;
    if (route.slug) {
      const selected = curatedDossierMolecules.find(
        (molecule) => getMoleculeSlug(molecule.id) === route.slug,
      );
      if (selected) {
        selectionTimer = window.setTimeout(() => setSelectedId(selected.id), 0);
      }
    }
    return () => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);
    };
  }, [route]);

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const saved = window.localStorage.getItem("dev-molecules:completed-missions");
      if (saved) {
        const restored = JSON.parse(saved) as string[];
        restoreTimer = window.setTimeout(() => setCompletedMissionIds(new Set(restored)), 0);
      }
    } catch {
      // Device-local learning progress is optional.
    }
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    let restoreFrame: number | undefined;
    try {
      const saved = window.sessionStorage.getItem(ATLAS_BROWSE_STATE_STORAGE_KEY);
      const restored = saved
        ? normalizeDrugAtlasBrowseState(JSON.parse(saved) as unknown)
        : DEFAULT_DRUG_ATLAS_BROWSE_STATE;
      restoreFrame = window.requestAnimationFrame(() => {
        setAtlasBrowseState(restored);
        setAtlasBrowseStateRestored(true);
      });
    } catch {
      restoreFrame = window.requestAnimationFrame(() => {
        setAtlasBrowseState(DEFAULT_DRUG_ATLAS_BROWSE_STATE);
        setAtlasBrowseStateRestored(true);
      });
    }
    return () => {
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
    };
  }, []);

  useEffect(() => {
    if (!atlasBrowseStateRestored) return;
    try {
      window.sessionStorage.setItem(
        ATLAS_BROWSE_STATE_STORAGE_KEY,
        JSON.stringify(atlasBrowseState),
      );
    } catch {
      // Atlas navigation remains app-local when session storage is unavailable.
    }
  }, [atlasBrowseState, atlasBrowseStateRestored]);

  useEffect(() => {
    let cancelled = false;
    void loadCatalogExpansion(assetBasePath)
      .then((expansion) => {
        if (cancelled) return;
        setCatalogExpansion(expansion);
        setCatalogLoadStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogLoadStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [assetBasePath, t]);

  useEffect(() => {
    let restoreFrame: number | undefined;
    try {
      const saved = window.localStorage.getItem(PRESENTATION_MODE_STORAGE_KEY);
      if (saved === "student" || saved === "expert" || saved === "reviewer") {
        restoreFrame = window.requestAnimationFrame(() => {
          setExperienceMode(saved === "student" ? "student" : "expert");
        });
      }
    } catch {
      // A blocked storage layer must not block the student experience.
    }
    return () => {
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESENTATION_MODE_STORAGE_KEY, experienceMode);
    } catch {
      // Preference remains session-local when storage is unavailable.
    }
  }, [experienceMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "dev-molecules:completed-missions",
        JSON.stringify([...completedMissionIds]),
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [completedMissionIds]);

  function completeMission(missionId: string) {
    setCompletedMissionIds((current) => new Set([...current, missionId]));
  }

  function openDrug(record: IndexedCatalogHit) {
    setSelectedId(record.id);
    navigate(getDrugHash(record.stableSlug));
  }

  const retainSelectedCatalogEntity = useCallback(
    (entity: CatalogNormalizedEntity) => {
      setHydratedCatalogEntities((current) =>
        retainHydratedCatalogEntity(current, entity),
      );
    },
    [],
  );

  const canonicalizeDrugRoute = useCallback((hash: string) => {
    if (window.location.hash === hash) return;
    window.history.replaceState(null, "", hash);
    setRoute(parsePlatformHash(hash));
  }, []);

  function openMoleculeFocus(moleculeId: string) {
    setSelectedId(moleculeId);
    navigate(`#molecule/${encodeURIComponent(getMoleculeSlug(moleculeId))}`);
  }

  const unavailableSynthesisRoute = (
    <CuratedWorkflowUnavailable
      eyebrow={t("workflow.unavailableEyebrow")}
      title={t("workflow.unavailableTitle", {
        name: route.slug ?? t("workflow.unknownMolecule"),
      })}
      description={t("workflow.unavailableDescription", {
        cid: t("common.notSpecified"),
      })}
      actionLabel={t("workflow.returnToExplore")}
      onReturnToAtlas={() => navigate("#atlas")}
    />
  );
  const loading = <LoadingPage label={t("learn.loadingJourney")} />;

  return (
    <div
      className={styles.app}
      data-locale={locale}
      data-route={route.section}
      data-experience-mode={experienceMode}
      data-catalog-status={catalogLoadStatus}
      data-catalog-records={catalogExpansion?.manifest.recordCount ?? exploreCatalogView.molecules.length}
      data-catalog-resident-records={exploreCatalogView.molecules.length}
      data-working-brand={workingBrandMode}
      data-motion={motionMode}
    >
      {molevrenWorkingBrandEnabled ? (
        <MolecularAtmosphere route={atmosphereRoute} motionMode={motionMode} />
      ) : null}
      <header className={styles.topbar}>
        <button
          className={styles.brand}
          type="button"
          aria-label={t("shell.brandHomeLabel")}
          onClick={() => navigate("#home")}
        >
          {molevrenWorkingBrandEnabled ? (
            <>
              {/* GitHub Pages serves the production SVG directly; next/image
                  would make this reversible shell depend on a Next loader. */}
              <span className={styles.brandSignature} data-brand-signature="desktop">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.brandLockup}
                  data-brand-lockup="desktop"
                  src={getMolevrenAssetUrl(assetBasePath, "headerDark")}
                  width="820"
                  height="146"
                  alt=""
                />
                <span className={styles.brandLine} data-brand-line="true">{t("brand.line")}</span>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.brandSymbol}
                data-brand-symbol="mobile"
                src={getMolevrenAssetUrl(assetBasePath, "symbolFlat")}
                width="128"
                height="128"
                alt=""
              />
            </>
          ) : (
            <>
              <BrandMark />
              <span><strong>DEV MOLECULES</strong><small>{t("shell.livingAtlas")}</small></span>
            </>
          )}
        </button>

        <nav className={styles.primaryNav} aria-label={t("nav.primary")}>
          {PRIMARY_NAVIGATION.map((item) => (
            <button
              key={item.section}
              type="button"
              data-active={primarySection === item.section}
              aria-current={primarySection === item.section ? "page" : undefined}
              onClick={() => navigate(item.hash)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <div className={styles.topActions}>
          <button
            className={styles.searchButton}
            type="button"
            aria-label={t("nav.openGlobalSearch")}
            onClick={() => {
              setSettingsOpen(false);
              setSearchOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></svg>
            <span>{t("search.label")}</span>
          </button>
          <div className={styles.languageSwitcher} role="group" aria-label={t("locale.selectorLabel")}>
            <button type="button" aria-pressed={locale === "tr"} aria-label={t("locale.switchToTurkish")} onClick={() => setLocale("tr")}>TR</button>
            <button type="button" aria-pressed={locale === "en"} aria-label={t("locale.switchToEnglish")} onClick={() => setLocale("en")}>EN</button>
          </div>
          <div className={styles.settingsControl}>
            <button
              className={styles.settingsButton}
              type="button"
              aria-expanded={settingsOpen}
              aria-controls="platform-settings"
              onClick={() => {
                setSearchOpen(false);
                setSettingsOpen((current) => !current);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19 13.2v-2.4l-2-.7a7 7 0 0 0-.7-1.6l.9-1.9-1.8-1.8-1.9.9a7 7 0 0 0-1.6-.7l-.7-2H8.8l-.7 2a7 7 0 0 0-1.6.7l-1.9-.9-1.8 1.8.9 1.9a7 7 0 0 0-.7 1.6l-2 .7v2.4l2 .7a7 7 0 0 0 .7 1.6l-.9 1.9 1.8 1.8 1.9-.9a7 7 0 0 0 1.6.7l.7 2h2.4l.7-2a7 7 0 0 0 1.6-.7l1.9.9 1.8-1.8-.9-1.9a7 7 0 0 0 .7-1.6l2-.7Z" /></svg>
              <span>{t("shell.settings")}</span>
            </button>
            {settingsOpen ? (
              <div id="platform-settings" className={styles.settingsMenu} aria-label={t("shell.settingsMenuLabel")}>
                <strong>{t("shell.experienceMode")}</strong>
                <button
                  type="button"
                  aria-pressed={experienceMode === "student"}
                  onClick={() => setExperienceMode("student")}
                >
                  <span>{t("shell.studentView")}</span>
                  <small>{t("shell.studentViewDescription")}</small>
                </button>
                <button
                  type="button"
                  aria-pressed={experienceMode === "expert"}
                  onClick={() => setExperienceMode("expert")}
                >
                  <span>{t("shell.expertView")}</span>
                  <small>{t("shell.expertViewDescription")}</small>
                </button>
                <hr />
                <strong>{t("shell.motion")}</strong>
                <p className={styles.settingsHint}>{t("shell.motionDescription")}</p>
                <div className={styles.motionChoices} role="group" aria-label={t("shell.motion")}>
                  <button
                    type="button"
                    aria-pressed={motionMode === "full"}
                    onClick={() => setMotionMode("full")}
                  >
                    <span>{t("shell.motionFull")}</span>
                    <small>{t("shell.motionFullDescription")}</small>
                  </button>
                  <button
                    type="button"
                    aria-pressed={motionMode === "reduced"}
                    onClick={() => setMotionMode("reduced")}
                  >
                    <span>{t("shell.motionReduced")}</span>
                    <small>{t("shell.motionReducedDescription")}</small>
                  </button>
                  <button
                    type="button"
                    aria-pressed={motionMode === "off"}
                    onClick={() => setMotionMode("off")}
                  >
                    <span>{t("shell.motionOff")}</span>
                    <small>{t("shell.motionOffDescription")}</small>
                  </button>
                </div>
                <hr />
                <button type="button" onClick={() => navigate("#instructor")}>
                  <span>{t("shell.openInstructor")}</span>
                  <small>{t("shell.openInstructorDescription")}</small>
                </button>
                <button type="button" onClick={() => navigate("#reviewer")}>
                  <span>{t("shell.openReviewer")}</span>
                  <small>{t("shell.openReviewerDescription")}</small>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div
          className={styles.searchOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <section className={styles.searchDialog} role="dialog" aria-modal="true" aria-labelledby="global-search-title">
            <button className={styles.closeSearch} type="button" onClick={() => setSearchOpen(false)} aria-label={t("shell.closeSearch")}>×</button>
            <h2 id="global-search-title">{t("shell.searchDialogTitle")}</h2>
            <p>{t("shell.searchDialogDescription")}</p>
            <CatalogSearch search={searchCatalog} onSelect={openDrug} variant="dialog" focusOnMount onDismiss={() => setSearchOpen(false)} />
          </section>
        </div>
      ) : null}

      <main className={styles.mainContent}>
        {route.section === "home" && featuredExploreMolecule?.structure.threeDUrl ? (
          <HomeLanding
            featuredMolecule={{
              id: featuredExploreMolecule.id,
              name: featuredExploreMolecule.name,
              formula: featuredExploreMolecule.formula,
              pubChemCid: featuredExploreMolecule.structure.pubChemCid,
              threeDUrl: featuredExploreMolecule.structure.threeDUrl,
              twoDUrl: featuredExploreMolecule.structure.twoDUrl,
            }}
            searchCatalog={searchCatalog}
            onOpenDrug={openDrug}
            onOpenFeaturedDrug={() => navigate(getDrugHash(getMoleculeSlug(featuredExploreMolecule.id)))}
            onOpenAtlas={() => navigate("#atlas")}
            onOpenAcademy={() => navigate("#academy")}
            onOpenFamily={(familyId) => navigate(`#family/${encodeURIComponent(familyId)}`)}
          />
        ) : null}

        {route.section === "atlas" ? (
          <div
            className={styles.workspacePage}
            data-atlas-workspace={route.atlasView ?? "browse"}
          >
            {catalogLoadStatus === "fallback" ? (
              <div className={styles.catalogFallback} role="alert" data-catalog-fallback="true">
                <div>
                  <strong>{t("explore.catalogFallbackTitle")}</strong>
                  <p>{t("explore.catalogFallbackBody", { count: exploreCatalogView.molecules.length })}</p>
                </div>
              </div>
            ) : null}
            <Suspense fallback={loading}>
              <DrugAtlas
                navigator={indexedCatalogNavigator}
                locale={locale}
                view={route.atlasView ?? "browse"}
                onViewChange={(view) => navigate(view === "spatial" ? "#atlas/spatial" : "#atlas")}
                browseState={atlasBrowseState}
                onBrowseStateChange={setAtlasBrowseState}
                catalogRecordCount={catalogExpansion?.manifest.recordCount}
                assetBasePath={assetBasePath}
                getDrugHref={(record) => getDrugHash(record.stableSlug)}
                onDrugSelect={(record) => setSelectedId(record.id)}
                spatial={{
                  catalogCount: catalogExpansion?.manifest.recordCount ?? exploreCatalogView.molecules.length,
                  universe: {
                    molecules: exploreCatalogView.molecules,
                    lenses: exploreCatalogView.lenses,
                    initialLensId: "therapeutic",
                    initialSelectedId: selectedId,
                    eyebrow: t("explore.eyebrow"),
                    title: t("explore.title"),
                    description: t("explore.description"),
                    presentationMode,
                    catalogRecordCount: catalogExpansion?.manifest.recordCount,
                    indexedCatalog: catalogExpansion ? indexedCatalog : undefined,
                    learningActions,
                    onMoleculeSelect: (molecule) => setSelectedId(molecule.id),
                  },
                }}
              />
            </Suspense>
          </div>
        ) : null}

        {route.section === "academy" ? (
          <div className={styles.workspacePage}>
            <Suspense fallback={loading}>
              {route.academyArea === "synthesis" && route.slug ? (
                activeSynthesisCatalogState.status === "ready" ? (
                  <>
                    <SynthesisAcademyHub
                      key={`synthesis:${route.slug}:${route.routeId ?? "overview"}`}
                      locale={locale}
                      selectedMoleculeId={requestedSynthesisMolecule?.id}
                      initialMoleculeId={requestedSynthesisMolecule?.id}
                      initialView={route.routeId === "atlas" ? "atlas" : "curriculum"}
                      presentationMode={presentationMode}
                      catalogSelection={activeSynthesisCatalogState.selection}
                      catalogRecordCount={catalogExpansion?.manifest.recordCount ?? 1552}
                      assetBasePath={assetBasePath}
                      searchCatalog={searchCatalog}
                      onSelectCatalogRecord={(record) => {
                        setSelectedId(record.id);
                        navigate(getSynthesisAcademyHash(record.stableSlug, "atlas"));
                      }}
                      onOpenMoleculeFocus={openMoleculeFocus}
                      onOpenDrugDossier={(moleculeId) => {
                        setSelectedId(moleculeId);
                        navigate(getDrugHash(getMoleculeSlug(moleculeId)));
                      }}
                      onBackToAcademy={() => navigate("#academy")}
                    />
                    <MissionStudio
                      completedMissionIds={completedMissionIds}
                      onComplete={completeMission}
                    />
                  </>
                ) : activeSynthesisCatalogState.status === "loading"
                  ? loading
                  : unavailableSynthesisRoute
              ) : (
                <AcademyHub
                  locale={locale}
                  selectedMoleculeIdOrSlug={selectedId}
                  assetBasePath={assetBasePath}
                  catalogRecordCount={catalogExpansion?.manifest.recordCount ?? 1552}
                  nomenclatureProgress={nomenclatureProgress}
                  completedMissionIds={completedMissionIds}
                  activeModuleId={getAcademyModuleId(route)}
                  onModuleChange={(moduleId) => navigate(getAcademyModuleHash(moduleId))}
                  onNomenclatureProgressChange={setNomenclatureProgress}
                  onOpenDossier={(moleculeId) => {
                    setSelectedId(moleculeId);
                    navigate(getDrugHash(getMoleculeSlug(moleculeId)));
                  }}
                  onOpenSynthesis={(moleculeIdOrSlug) => {
                    const molecule = moleculeCatalog.find(
                      (record) =>
                        record.id === moleculeIdOrSlug ||
                        getMoleculeSlug(record.id) === getMoleculeSlug(moleculeIdOrSlug),
                    );
                    if (molecule) setSelectedId(molecule.id);
                    navigate(getSynthesisAcademyHash(
                      getMoleculeSlug(molecule?.id ?? moleculeIdOrSlug),
                      "atlas",
                    ));
                  }}
                />
              )}
            </Suspense>
          </div>
        ) : null}

        {route.section === "lab" ? (
          <div className={styles.workspacePage}>
            <Suspense fallback={loading}>
              <LabHub locale={locale} initialArea="builder" />
            </Suspense>
          </div>
        ) : null}

        {route.section === "instructor" ? (
          <div className={styles.workspacePage}>
            <Suspense fallback={loading}>
              <InstructorHub
                locale={locale}
                progressSnapshot={instructorProgressSnapshot}
              />
            </Suspense>
          </div>
        ) : null}

        {route.section === "reviewer" ? (
          <div className={styles.workspacePage}>
            <Suspense fallback={loading}>
              <ReviewerConsole
                locale={locale}
                adapter={null}
                onExit={() => navigate("#home")}
              />
            </Suspense>
          </div>
        ) : null}

        {route.section === "drug" ? (
          <div className={styles.workspacePage}>
            <Suspense fallback={loading}>
              <MolecularRecordRoute
                key={route.slug}
                stableSlug={route.slug ?? ""}
                navigator={indexedCatalogNavigator}
                residentEntities={residentCatalogExpansion?.entities ?? []}
                assetBasePath={assetBasePath}
                locale={locale}
                onBackToAtlas={() => navigate("#atlas")}
                onEntityHydrated={retainSelectedCatalogEntity}
                onCanonicalHash={canonicalizeDrugRoute}
                renderCuratedDossier={(molecule) => (
                  <DrugDossier
                    key={`${molecule.id}:${experienceMode}`}
                    moleculeIdOrSlug={molecule.id}
                    locale={locale}
                    assetBasePath={assetBasePath}
                    initialMode={experienceMode === "expert" ? "reference" : "story"}
                    onBackToAtlas={() => navigate("#atlas")}
                    onOpenSynthesis={(moleculeId) => {
                      setSelectedId(moleculeId);
                      navigate(getSynthesisAcademyHash(getMoleculeSlug(moleculeId), "atlas"));
                    }}
                    onOpenSynthesisAcademy={() => navigate("#academy/synthesis")}
                    synthesisNavigator={indexedCatalogNavigator}
                  />
                )}
              />
            </Suspense>
          </div>
        ) : null}

        {route.section === "family" ? (
          <div className={styles.workspacePage}>
            {activeFamilyPage ? (
              <Suspense fallback={loading}>
                <FamilyPage family={activeFamilyPage} locale={locale} />
              </Suspense>
            ) : (
              <CuratedWorkflowUnavailable
                eyebrow={t("family.loadingEyebrow")}
                title={t("family.integrationTitle", { name: route.familyId ?? t("common.notSpecified") })}
                description={t("family.integrationDescription")}
                actionLabel={t("workflow.returnToExplore")}
                onReturnToAtlas={() => navigate("#atlas")}
              />
            )}
          </div>
        ) : null}
      </main>

      <footer className={styles.globalFooter}>
        <div>
          <strong>{molevrenWorkingBrandEnabled ? "MOLEVREN" : "DEV MOLECULES"}</strong>
          {molevrenWorkingBrandEnabled ? <small>{t("brand.platformAttribution")}</small> : null}
        </div>
        <span>{t("shell.footerSentence")}</span>
      </footer>
    </div>
  );
}

export function DevMoleculesApp() {
  return <I18nProvider><DevMoleculesWorkspace /></I18nProvider>;
}

export default DevMoleculesApp;
