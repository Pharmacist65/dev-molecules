"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { IndexedCatalogHit } from "@/lib/application/catalog-expansion";
import { useI18n } from "@/lib/i18n";

import { CatalogSearch, type CatalogSearchFunction } from "./CatalogSearch";
import type { HomeFeaturedMolecule } from "./HomeMoleculeStage";
import styles from "./HomeLanding.module.css";

const HomeMoleculeStage = lazy(() => import("./HomeMoleculeStage"));

export interface HomeLandingProps {
  readonly featuredMolecule: HomeFeaturedMolecule;
  readonly searchCatalog: CatalogSearchFunction;
  readonly onOpenDrug: (record: IndexedCatalogHit) => void;
  readonly onOpenFeaturedDrug: () => void;
  readonly onOpenAtlas: () => void;
  readonly onOpenAcademy: () => void;
  readonly onOpenFamily: (familyId: string) => void;
}
export default function HomeLanding({
  featuredMolecule,
  searchCatalog,
  onOpenDrug,
  onOpenFeaturedDrug,
  onOpenAtlas,
  onOpenAcademy,
  onOpenFamily,
}: HomeLandingProps) {
  const { t } = useI18n();
  const stageHost = useRef<HTMLDivElement>(null);
  const [stageReady, setStageReady] = useState(false);

  useEffect(() => {
    const host = stageHost.current;
    if (!host) return;
    let cancelled = false;
    let timer = 0;

    const reveal = () => {
      timer = window.setTimeout(() => {
        if (!cancelled) setStageReady(true);
      }, 320);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        reveal();
      },
      { rootMargin: "100px" },
    );
    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.page} data-home="true">
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.heroAtmosphere} aria-hidden="true" />
        <div className={styles.introduction}>
          <p className={styles.brandDescriptor}>
            <strong>{t("brand.publicName")}</strong>
            <span aria-hidden="true">/</span>
            <span>{t("brand.descriptor")}</span>
          </p>
          <p className={styles.kicker}>{t("home.kicker")}</p>
          <h1 id="home-heading">{t("home.title")}</h1>
          <p className={styles.lede}>{t("home.description")}</p>

          <div className={styles.searchPanel}>
            <CatalogSearch search={searchCatalog} onSelect={onOpenDrug} />
          </div>

          <div className={styles.startPaths} aria-label={t("home.startPathsLabel")}>
            <button type="button" onClick={onOpenAtlas}>
              <span>01</span>
              <strong>{t("home.openAtlas")}</strong>
              <small>{t("home.openAtlasDescription")}</small>
              <i aria-hidden="true">→</i>
            </button>
            <button type="button" onClick={onOpenAcademy}>
              <span>02</span>
              <strong>{t("home.startLearning")}</strong>
              <small>{t("home.startLearningDescription")}</small>
              <i aria-hidden="true">→</i>
            </button>
            <button type="button" onClick={onOpenFeaturedDrug}>
              <span>03</span>
              <strong>{t("home.inspectMolecule")}</strong>
              <small>{featuredMolecule.name}</small>
              <i aria-hidden="true">→</i>
            </button>
          </div>
        </div>

        <div className={styles.stageColumn}>
          <div className={styles.stageHeading} aria-hidden="true">
            <span>{t("home.featuredStageLabel")}</span>
            <strong>{featuredMolecule.name}</strong>
          </div>
          <div ref={stageHost} className={styles.stageHost} aria-label={t("home.featuredStageLabel")}>
            {stageReady ? (
              <Suspense fallback={<StagePlaceholder label={t("home.preparingMolecule")} />}>
                <HomeMoleculeStage molecule={featuredMolecule} />
              </Suspense>
            ) : (
              <StagePlaceholder label={t("home.preparingMolecule")} />
            )}
          </div>
        </div>
      </section>

      <details className={styles.catalogScope} data-catalog-scope="collapsed">
        <summary>
          <span>{t("home.catalogScopeTitle")}</span>
        </summary>
        <div>
          <p>{t("home.catalogScopeSummary")}</p>
          <p>{t("home.catalogScopeBoundary")}</p>
          <small>{t("home.catalogScopeRights")}</small>
          <nav aria-label={t("home.catalogScopeTitle")}>
            <a
              href="https://drugcentral.org/static/FDA_Approved.csv"
              target="_blank"
              rel="noreferrer"
            >
              {t("home.catalogScopeSource")}
            </a>
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              {t("home.catalogScopeLicense")}
            </a>
          </nav>
        </div>
      </details>

      <section className={styles.editorial} aria-labelledby="home-continue-heading">
        <div className={styles.editorialHeading}>
          <p>{t("home.continueKicker")}</p>
          <h2 id="home-continue-heading">{t("home.continueTitle")}</h2>
        </div>
        <button className={styles.lessonFeature} type="button" onClick={onOpenAcademy}>
          <span>{t("home.lessonLabel")}</span>
          <strong>{t("home.lessonTitle")}</strong>
          <small>{t("home.lessonDescription")}</small>
          <i aria-hidden="true">→</i>
        </button>
        <div className={styles.familyIndex}>
          <span>{t("home.familiesLabel")}</span>
          <button type="button" onClick={() => onOpenFamily("beta-adrenergic-blockers")}>
            {t("home.familyBetaBlockers")}<i aria-hidden="true">→</i>
          </button>
          <button type="button" onClick={() => onOpenFamily("nsaids")}>
            {t("home.familyNsaids")}<i aria-hidden="true">→</i>
          </button>
        </div>
      </section>
    </div>
  );
}

function StagePlaceholder({ label }: { readonly label: string }) {
  return (
    <div className={styles.stagePlaceholder} role="status">
      <div aria-hidden="true"><i /><i /><i /><i /><span /><span /><span /></div>
      <p>{label}</p>
    </div>
  );
}
