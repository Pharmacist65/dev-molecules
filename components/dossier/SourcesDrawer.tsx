import type { ResolvedDossierSource } from "@/lib/domain/dossier";

import styles from "./DrugDossier.module.css";

export interface SourcesDrawerProps {
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: "tr" | "en";
  readonly technical?: boolean;
}

const statusLabel = {
  verified: { tr: "Bağlantı / kimlik doğrulandı", en: "Link / identity verified" },
  "expert-reviewed": { tr: "Uzman incelemeli", en: "Expert reviewed" },
  "source-supported": { tr: "Kaynak destekli", en: "Source supported" },
  "pending-review": { tr: "İnceleme bekliyor", en: "Pending review" },
  predicted: { tr: "Tahmin", en: "Predicted" },
  conflicting: { tr: "Çelişkili", en: "Conflicting" },
  unknown: { tr: "Belirtilmedi", en: "Unspecified" },
} as const;

const reuseLabel = {
  permitted: { tr: "Yeniden kullanıma açık", en: "Reuse permitted" },
  "attribution-required": { tr: "Atıf gerekli", en: "Attribution required" },
  restricted: { tr: "Kısıtlı", en: "Restricted" },
  unknown: { tr: "Yeniden kullanım koşulu belirsiz", en: "Reuse terms unknown" },
} as const;

const formatRetrievedAt = (value: string, locale: "tr" | "en") => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date)
    : value;
};

export function SourcesDrawer({ sources, locale, technical = false }: SourcesDrawerProps) {
  const labels = locale === "tr"
    ? {
        summary: "Kaynaklar ve teknik ayrıntılar",
        description: "Bu panel varsayılan olarak kapalıdır. Kimlik, kapsam ve doğrudan bağlantılar burada izlenebilir.",
        scope: "Desteklediği kapsam",
        externalId: "Harici kayıt kimliği",
        retrievedAt: "Erişim tarihi",
        license: "Lisans / yeniden kullanım",
        unavailable: "Bu görünüm için çözümlenebilir kaynak yok.",
      }
    : {
        summary: "Sources and technical details",
        description: "This panel is closed by default. Identity, scope, and direct links can be traced here.",
        scope: "Supported scope",
        externalId: "External record ID",
        retrievedAt: "Retrieved",
        license: "License / reuse",
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
                  {technical ? <small>{statusLabel[source.reviewStatus][locale]}</small> : null}
                  <p><b>{labels.scope}:</b> {source.scope}</p>
                  {technical ? (
                    <dl className={styles.sourceMetadata}>
                      <div><dt>{labels.externalId}</dt><dd>{source.externalId}</dd></div>
                      <div><dt>{labels.retrievedAt}</dt><dd>{formatRetrievedAt(source.retrievedAt, locale)}</dd></div>
                      <div>
                        <dt>{labels.license}</dt>
                        <dd>
                          {source.license.url ? (
                            <a href={source.license.url} target="_blank" rel="noreferrer">{source.license.label} ↗</a>
                          ) : source.license.label}
                          {" · "}{reuseLabel[source.license.reuseStatus][locale]}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
