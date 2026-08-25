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

type SourceScopeToken = "pubchem" | "dailymed" | "drugsfda" | "patent";

const sourceScopeLabel: Readonly<
  Record<SourceScopeToken, Readonly<Record<"tr" | "en", string>>>
> = {
  pubchem: {
    tr: "Normalize edilmiş bileşik kimliği ve PubChem tarafından hesaplanan yapı tanımlayıcıları; hesaplanmış konformer deneysel bağlı poz değildir.",
    en: "Normalized compound identity and PubChem-computed structure descriptors; a computed conformer is not an experimental bound pose.",
  },
  dailymed: {
    tr: "ABD ürün etiketleri ve farmasötik form incelemesi için keşif bağlantısı; henüz belirli bir etiket seti kimliğine sabitlenmemiştir.",
    en: "Discovery link for US product labels and pharmaceutical-form review; it is not yet pinned to an exact label set ID.",
  },
  drugsfda: {
    tr: "Bağlantılı Drugs@FDA uygulama ve ürün kaydı; ürün onayı normalize edilmiş PubChem ana molekülüne doğrudan aktarılmaz.",
    en: "Linked Drugs@FDA application and product record; product approval is not assigned directly to the normalized PubChem parent.",
  },
  patent: {
    tr: "Birincil patent belgesindeki raporlanmış bağlantı örneği; laboratuvar koşulları burada yayımlanmaz.",
    en: "Reported connectivity example in the primary patent document; laboratory conditions are not reproduced here.",
  },
};

function sourceScopeToken(sourceId: string): SourceScopeToken | null {
  if (sourceId.startsWith("source:pubchem-")) return "pubchem";
  if (sourceId.startsWith("source:dailymed-")) return "dailymed";
  if (sourceId.startsWith("source:drugsfda-")) return "drugsfda";
  if (sourceId.startsWith("source:patent-")) return "patent";
  return null;
}

function presentSourceScope(
  sourceId: string,
  locale: "tr" | "en",
): string {
  const token = sourceScopeToken(sourceId);
  return token
    ? sourceScopeLabel[token][locale]
    : locale === "tr"
      ? "Kaynak kapsamı"
      : "Source scope";
}

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
                  <p><b>{labels.scope}:</b> {presentSourceScope(source.id, locale)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
