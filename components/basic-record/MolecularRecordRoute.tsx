"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  resolveMolecularRecordRoute,
  type BasicMolecularRecordNavigator,
  type MolecularRecordRouteResolution,
} from "@/lib/application/basic-molecular-record";
import { getDrugHash } from "@/lib/application/platform-route";
import type { CatalogNormalizedEntity } from "@/lib/catalog";
import { curatedDossierMolecules } from "@/lib/data/curated-dossier-catalog";
import type { MoleculeRecord } from "@/lib/domain/molecule";
import type { Locale } from "@/lib/i18n";

import { BasicMolecularRecord } from "./BasicMolecularRecord";
import styles from "./BasicMolecularRecord.module.css";

type RouteLoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly resolution: MolecularRecordRouteResolution }
  | { readonly status: "error" };

const routeCopy = {
  tr: {
    loading: "Moleküler kayıt yükleniyor…",
    unavailableTitle: "Moleküler kayıt açılamadı",
    unavailableBody: "Bu bağlantı çözümlenmiş katalog kimliği ve yapı kaydıyla eşleştirilemedi.",
    retry: "Yeniden dene",
    back: "İlaç Atlası'na dön",
  },
  en: {
    loading: "Loading molecular record…",
    unavailableTitle: "Molecular record unavailable",
    unavailableBody: "This link could not be matched to a resolved catalog identity and structure record.",
    retry: "Try again",
    back: "Back to Drug Atlas",
  },
} as const;

export interface MolecularRecordRouteProps {
  readonly stableSlug: string;
  readonly navigator: BasicMolecularRecordNavigator;
  readonly residentEntities: readonly CatalogNormalizedEntity[];
  readonly assetBasePath: string;
  readonly locale: Locale;
  readonly onBackToAtlas: () => void;
  readonly onEntityHydrated?: (entity: CatalogNormalizedEntity) => void;
  readonly onCanonicalHash?: (hash: string) => void;
  readonly renderCuratedDossier: (molecule: MoleculeRecord) => ReactNode;
}

export function MolecularRecordRoute({
  stableSlug,
  navigator,
  residentEntities,
  assetBasePath,
  locale,
  onBackToAtlas,
  onEntityHydrated,
  onCanonicalHash,
  renderCuratedDossier,
}: MolecularRecordRouteProps) {
  const copy = routeCopy[locale];
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<RouteLoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void resolveMolecularRecordRoute(stableSlug, navigator, {
      curatedRecords: curatedDossierMolecules,
      assetBasePath,
      residentEntities,
    })
      .then((resolution) => {
        if (!cancelled) setState({ status: "ready", resolution });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // residentEntities is an intentionally bounded snapshot. Hydrating the
    // selected entity must not recursively re-resolve the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetBasePath, navigator, revision, stableSlug]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const { resolution } = state;
    if (resolution.kind === "basic-molecular-record") {
      onEntityHydrated?.(resolution.entity);
      return;
    }
    if (
      resolution.kind === "curated-dossier" &&
      resolution.canonicalSlug !== stableSlug
    ) {
      onCanonicalHash?.(getDrugHash(resolution.canonicalSlug));
    }
  }, [onCanonicalHash, onEntityHydrated, stableSlug, state]);

  if (state.status === "loading") {
    return (
      <div className={styles.depthNotice} role="status" data-molecular-record-route-status="loading">
        {copy.loading}
      </div>
    );
  }

  if (state.status === "error" || state.resolution.kind === "unavailable") {
    return (
      <section
        className={styles.summaryCard}
        role="alert"
        data-molecular-record-route-status="unavailable"
      >
        <strong>{copy.unavailableTitle}</strong>
        <p>{copy.unavailableBody}</p>
        {state.status === "error" ? (
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setRevision((value) => value + 1);
            }}
          >
            {copy.retry}
          </button>
        ) : null}
        <button type="button" onClick={onBackToAtlas}>{copy.back}</button>
      </section>
    );
  }

  if (state.resolution.kind === "curated-dossier") {
    return (
      <div data-molecular-record-route-status="curated-dossier">
        {renderCuratedDossier(state.resolution.molecule)}
      </div>
    );
  }

  return (
    <div data-molecular-record-route-status="basic-molecular-record">
      <BasicMolecularRecord
        record={state.resolution.record}
        locale={locale}
        onBackToAtlas={onBackToAtlas}
      />
    </div>
  );
}

export default MolecularRecordRoute;
