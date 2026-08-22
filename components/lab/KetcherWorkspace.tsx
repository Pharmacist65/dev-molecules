"use client";

import { lazy, Suspense, useMemo, useRef, useState } from "react";

import {
  createLocalLabProject,
  findExactCatalogIdentityMatch,
  normalizeLabStructureSnapshot,
  rankComputedStructureSimilarity,
  type CatalogIdentityMatch,
  type LabSimilarityResult,
  type LabStructureSnapshot,
} from "@/lib/application/lab";
import { StaticCatalogClient } from "@/lib/catalog";
import { moleculeCatalog } from "@/lib/data/catalog";

import type { KetcherEditorHandle } from "./KetcherEditorSurface";
import styles from "./LabHub.module.css";

const KetcherEditorSurface = lazy(() =>
  import("./KetcherEditorSurface").then((module) => ({
    default: module.KetcherEditorSurface,
  })),
);

const copy = {
  tr: {
    eyebrow: "Molekül Oluşturucu · cihazda çalışır",
    title: "Gerçek 2B yapı çalışma alanı",
    body: "Ketcher standalone, yapıyı bu tarayıcıda işler. Yalnız siz dışa aktarırsanız bir dosya oluşur; public sürüm özel bulut depolaması sunmaz.",
    loading: "Ketcher ve yerel kimya motoru yükleniyor…",
    inspect: "Yapıyı doğrula ve eşleştir",
    export: "Yerel proje dışa aktar",
    clear: "Tuvali temizle",
    ready: "Editör hazır",
    pending: "Editör hazırlanıyor",
    exact: "Katalogda tam kimlik eşleşmesi",
    none: "Tam katalog kimliği eşleşmedi",
    ambiguous: "Kimlik birden fazla kayda çözüldü; sonuç kapalı tutuldu",
    notNovel: "Eşleşme bulunmaması yenilik, patentlenebilirlik, biyolojik etkinlik veya sentezlenebilirlik kanıtı değildir.",
    similarity: "Hesaplanan yapısal yakınlık",
    similarityNote: "Kanonik-SMILES yol fingerprint’i; hesaplanmış ve uzman incelemesinden geçmemiştir.",
    error: "Yerel yapı işlemi tamamlanamadı.",
  },
  en: {
    eyebrow: "Molecule Builder · runs on this device",
    title: "A real 2D structure workspace",
    body: "Ketcher standalone processes the structure in this browser. A file exists only when you export it; the public build provides no private cloud storage.",
    loading: "Loading Ketcher and the local chemistry engine…",
    inspect: "Validate and match structure",
    export: "Export local project",
    clear: "Clear canvas",
    ready: "Editor ready",
    pending: "Preparing editor",
    exact: "Exact catalog identity match",
    none: "No exact catalog identity match",
    ambiguous: "Identity resolved to multiple records; result withheld",
    notNovel: "No match is not evidence of novelty, patentability, biological activity, or synthesizability.",
    similarity: "Computed structural proximity",
    similarityNote: "Canonical-SMILES path fingerprint; computed and not expert-reviewed.",
    error: "The local structure operation could not be completed.",
  },
} as const;

export function KetcherWorkspace({ locale }: { readonly locale: "tr" | "en" }) {
  const t = copy[locale];
  const editorRef = useRef<KetcherEditorHandle>(null);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<LabStructureSnapshot | null>(null);
  const [identityMatch, setIdentityMatch] = useState<CatalogIdentityMatch | null>(null);
  const [similarity, setSimilarity] = useState<readonly LabSimilarityResult[]>([]);
  const catalogClient = useMemo(
    () => new StaticCatalogClient({ basePath: import.meta.env.BASE_URL }),
    [],
  );

  async function inspect() {
    if (!editorRef.current) return;
    setWorking(true);
    setError("");
    try {
      const nextSnapshot = normalizeLabStructureSnapshot(
        await editorRef.current.exportStructure(),
      );
      const index = await catalogClient.loadSearchIndex();
      const nextMatch = findExactCatalogIdentityMatch(
        index.records,
        nextSnapshot.inchiKey,
      );
      const nextSimilarity = rankComputedStructureSimilarity(
        nextSnapshot.smiles,
        moleculeCatalog.map((record) => ({
          id: record.id,
          name: record.identity.preferredName,
          canonicalSmiles: record.identity.canonicalSmiles,
        })),
      );
      setSnapshot(nextSnapshot);
      setIdentityMatch(nextMatch);
      setSimilarity(nextSimilarity);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
      setSnapshot(null);
      setIdentityMatch(null);
      setSimilarity([]);
    } finally {
      setWorking(false);
    }
  }

  function exportProject() {
    if (!snapshot || !identityMatch) return;
    const project = createLocalLabProject({
      generatedAt: new Date().toISOString(),
      structure: snapshot,
      identityMatch,
      similarity,
    });
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(project, null, 2)}\n`], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dev-molecules-local-project.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const initialStructure = moleculeCatalog[0]?.identity.canonicalSmiles ?? "CCO";

  return (
    <section className={styles.workspace} aria-labelledby="ketcher-workspace-heading">
      <header className={styles.workspaceHeader}>
        <div>
          <p>{t.eyebrow}</p>
          <h2 id="ketcher-workspace-heading">{t.title}</h2>
          <span>{t.body}</span>
        </div>
        <span className={styles.readyPill} data-ready={ready}>
          <i aria-hidden="true" /> {ready ? t.ready : t.pending}
        </span>
      </header>

      <Suspense fallback={<div className={styles.editorLoading}>{t.loading}</div>}>
        <KetcherEditorSurface
          ref={editorRef}
          initialStructure={initialStructure}
          locale={locale}
          onReadyChange={setReady}
          onError={setError}
        />
      </Suspense>

      <div className={styles.builderActions}>
        <button type="button" disabled={!ready || working} onClick={() => void inspect()}>
          {working ? "···" : "⌁"} {t.inspect}
        </button>
        <button type="button" disabled={!snapshot || !identityMatch} onClick={exportProject}>
          ↓ {t.export}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            void editorRef.current?.clear();
            setSnapshot(null);
            setIdentityMatch(null);
            setSimilarity([]);
          }}
        >
          {t.clear}
        </button>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {identityMatch ? (
        <div className={styles.analysisGrid} aria-live="polite">
          <article className={styles.identityResult} data-status={identityMatch.status}>
            <span>InChIKey</span>
            <code>{snapshot?.inchiKey}</code>
            <strong>
              {identityMatch.status === "exact"
                ? `${t.exact}: ${identityMatch.record.preferredName}`
                : identityMatch.status === "ambiguous"
                  ? t.ambiguous
                  : t.none}
            </strong>
            <p>{t.notNovel}</p>
          </article>
          <article className={styles.similarityResult}>
            <span>{t.similarity}</span>
            <p>{t.similarityNote}</p>
            <ol>
              {similarity.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{Math.round(item.score * 100)}%</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      ) : null}
    </section>
  );
}
