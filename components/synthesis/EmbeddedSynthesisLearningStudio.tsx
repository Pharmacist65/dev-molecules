"use client";

import { useEffect, useState } from "react";

import {
  loadSynthesisLearningStudioRouteDetail,
  type SynthesisLearningStudioRouteDetail,
} from "@/lib/application/synthesis-learning-studio-controller";
import {
  resolveSynthesisCatalogSelection,
  type SynthesisCatalogFallbackIdentity,
  type SynthesisCatalogNavigator,
  type SynthesisCatalogSelection,
} from "@/lib/application/synthesis-catalog";
import type { Locale } from "@/lib/i18n";

import { SynthesisLearningStudio } from "./SynthesisLearningStudio";
import styles from "./EmbeddedSynthesisLearningStudio.module.css";

type EmbeddedStudioState =
  | { readonly status: "loading"; readonly requestSlug: string }
  | { readonly status: "identity_unavailable"; readonly requestSlug: string }
  | {
      readonly status: "ready";
      readonly requestSlug: string;
      readonly selection: SynthesisCatalogSelection;
      readonly detail: SynthesisLearningStudioRouteDetail;
    };

export interface EmbeddedSynthesisLearningStudioProps {
  readonly stableSlug: string;
  readonly navigator: SynthesisCatalogNavigator;
  readonly assetBasePath: string;
  readonly locale: Locale;
  readonly fullAtlasHref: string;
  readonly fallbackIdentity?: SynthesisCatalogFallbackIdentity;
  readonly presentationMode?: "student" | "reviewer";
  readonly onOpenFullAtlas?: () => void;
  readonly fullAtlasAriaLabel?: string;
  readonly synthesisJourneyCta?: boolean;
}

const copy = {
  tr: {
    loading: "Sentez kapsamı ve öğrenme stüdyosu hazırlanıyor…",
    unavailableTitle: "Sentez öğrenme görünümü güvenli biçimde açılamadı",
    unavailableBody: "Exact katalog kimliği çözümlenemedi. Bu durum kaynak ya da rota bulunmadığı veya molekülün sentezlenemeyeceği anlamına gelmez.",
    detailUnavailableTitle: "Kaynak destekli taslak ayrıntısı yüklenemedi",
    detailUnavailableBody: "Kapsam kaydı korunur; geçici ayrıntı yükleme hatası kaynak veya rota yokluğu olarak yorumlanmaz.",
    fullAtlas: "Tam Sentez Atlası'nı aç",
    fullAtlasBody: "Kapsam kaydı, kaynak sınırları ve erişilebilir tüm rota ayrıntıları Atlas görünümünde birlikte sunulur.",
  },
  en: {
    loading: "Preparing synthesis coverage and the learning studio…",
    unavailableTitle: "The synthesis learning view could not be opened safely",
    unavailableBody: "The exact catalog identity could not be resolved. This does not mean that no source or route exists, or that the molecule is unsynthesizable.",
    detailUnavailableTitle: "Evidence-linked draft detail could not be loaded",
    detailUnavailableBody: "The coverage record is preserved; a temporary detail-loading failure is not treated as evidence that no source or route exists.",
    fullAtlas: "Open the full Synthesis Atlas",
    fullAtlasBody: "The Atlas view presents the coverage record, evidence boundaries, and every available route detail together.",
  },
} as const;

export function EmbeddedSynthesisLearningStudio({
  stableSlug,
  navigator,
  assetBasePath,
  locale,
  fullAtlasHref,
  fallbackIdentity,
  presentationMode = "student",
  onOpenFullAtlas,
  fullAtlasAriaLabel,
  synthesisJourneyCta = false,
}: EmbeddedSynthesisLearningStudioProps) {
  const labels = copy[locale];
  const [state, setState] = useState<EmbeddedStudioState>({
    status: "loading",
    requestSlug: stableSlug,
  });

  const fallbackCuratedMoleculeId = fallbackIdentity?.curatedMoleculeId;
  const fallbackPreferredName = fallbackIdentity?.preferredName;
  const fallbackPubChemCid = fallbackIdentity?.pubChemCid;
  const fallbackInchiKey = fallbackIdentity?.inchiKey;

  useEffect(() => {
    let active = true;

    const exactFallbackIdentity = fallbackCuratedMoleculeId && fallbackPreferredName &&
      fallbackPubChemCid && fallbackInchiKey
      ? {
          curatedMoleculeId: fallbackCuratedMoleculeId,
          preferredName: fallbackPreferredName,
          pubChemCid: fallbackPubChemCid,
          inchiKey: fallbackInchiKey,
        }
      : undefined;

    void resolveSynthesisCatalogSelection(stableSlug, navigator, {
      assetBasePath,
      fallbackIdentity: exactFallbackIdentity,
    }).then(async (selection) => {
      if (!active) return;
      if (!selection) {
        setState({ status: "identity_unavailable", requestSlug: stableSlug });
        return;
      }

      const detail = await loadSynthesisLearningStudioRouteDetail(selection, {
        assetBasePath,
      });
      if (active) {
        setState({
          status: "ready",
          requestSlug: stableSlug,
          selection,
          detail,
        });
      }
    }).catch(() => {
      if (active) {
        setState({ status: "identity_unavailable", requestSlug: stableSlug });
      }
    });

    return () => {
      active = false;
    };
  }, [
    assetBasePath,
    fallbackCuratedMoleculeId,
    fallbackInchiKey,
    fallbackPreferredName,
    fallbackPubChemCid,
    navigator,
    stableSlug,
  ]);

  const fullAtlasAction = (
    <div className={styles.fullAtlasAction}>
      <div>
        <strong>{labels.fullAtlas}</strong>
        <p>{labels.fullAtlasBody}</p>
      </div>
      <a
        data-full-synthesis-atlas-link="true"
        data-synthesis-journey-cta={synthesisJourneyCta ? "true" : undefined}
        href={fullAtlasHref}
        aria-label={fullAtlasAriaLabel}
        onClick={onOpenFullAtlas
          ? (event) => {
              event.preventDefault();
              onOpenFullAtlas();
            }
          : undefined}
      >
        {labels.fullAtlas} <span aria-hidden="true">→</span>
      </a>
    </div>
  );

  if (state.status === "loading" || state.requestSlug !== stableSlug) {
    return (
      <section
        className={styles.wrapper}
        data-embedded-synthesis-learning-studio="loading"
      >
        <div className={styles.statusShell} role="status">
          <span className={styles.loader} aria-hidden="true" />
          <p>{labels.loading}</p>
        </div>
        {fullAtlasAction}
      </section>
    );
  }

  if (state.status === "identity_unavailable") {
    return (
      <section
        className={styles.wrapper}
        data-embedded-synthesis-learning-studio="identity_unavailable"
        data-scientific-conclusion="withheld"
      >
        <div className={styles.unavailable} role="status">
          <strong>{labels.unavailableTitle}</strong>
          <p>{labels.unavailableBody}</p>
        </div>
        {fullAtlasAction}
      </section>
    );
  }

  return (
    <section
      className={styles.wrapper}
      data-embedded-synthesis-learning-studio="ready"
      data-embedded-route-detail-load-state={state.detail.routeDetailLoadState}
      data-embedded-structure-asset-availability={
        state.detail.structureAssetAvailability.state
      }
    >
      <SynthesisLearningStudio
        selection={state.selection}
        graphs={state.detail.graphs}
        structureAssetsByInchiKey={state.detail.structureAssetsByInchiKey}
        structureAssetAvailability={state.detail.structureAssetAvailability}
        presentationMode={presentationMode}
        variant="compact"
        routeDetailLoadState={state.detail.routeDetailLoadState}
      />
      {state.detail.routeDetailLoadState === "unavailable" ? (
        <div className={styles.detailUnavailable} role="status">
          <strong>{labels.detailUnavailableTitle}</strong>
          <p>{labels.detailUnavailableBody}</p>
        </div>
      ) : null}
      {fullAtlasAction}
    </section>
  );
}

export default EmbeddedSynthesisLearningStudio;
