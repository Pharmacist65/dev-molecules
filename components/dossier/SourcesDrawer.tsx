import type { ResolvedDossierSource } from "@/lib/domain/dossier";

import styles from "./DrugDossier.module.css";

export interface SourcesDrawerProps {
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: "tr" | "en";
}

const statusLabel = {
  verified: { tr: "Doğrulandı", en: "Verified" },
  "expert-reviewed": { tr: "Uzman incelemeli", en: "Expert reviewed" },
  "source-supported": { tr: "Kaynak destekli", en: "Source supported" },
  "pending-review": { tr: "İnceleme bekliyor", en: "Pending review" },
  predicted: { tr: "Tahmin", en: "Predicted" },
  conflicting: { tr: "Çelişkili", en: "Conflicting" },
  unknown: { tr: "Belirtilmedi", en: "Unspecified" },
} as const;

export function SourcesDrawer({ sources, locale }: SourcesDrawerProps) {
  const labels = locale === "tr"
    ? {
        summary: "Kaynaklar ve teknik ayrıntılar",
        description: "Bu panel varsayılan olarak kapalıdır. Kimlik, kapsam ve doğrudan bağlantılar burada izlenebilir.",
        scope: "Desteklediği kapsam",
        unavailable: "Bu görünüm için çözümlenebilir kaynak yok.",
      }
    : {
        summary: "Sources and technical details",
        description: "This panel is closed by default. Identity, scope, and direct links can be traced here.",
        scope: "Supported scope",
        unavailable: "No resolvable source is available for this view.",
      };

  return (
    <details className={styles.sourcesDrawer} data-source-drawer="closed-by-default">
      <summary>
        <span>{labels.summary}</span>
        <i aria-hidden="true">＋</i>
      </summary>
      <div className={styles.sourceBody}>
        <p>{labels.description}</p>
        {sources.length === 0 ? <p>{labels.unavailable}</p> : (
          <ol>
            {sources.map((source, index) => (
              <li key={source.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{source.provider}</strong>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
                  <small>{statusLabel[source.reviewStatus][locale]}</small>
                  <p><b>{labels.scope}:</b> {source.scope}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
