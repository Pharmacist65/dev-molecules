import type { MetaboliteGraph as MetaboliteGraphModel } from "@/lib/domain/metabolites";
import { SmilesStructure } from "@/components/platform/SmilesStructure";

import styles from "./Adme.module.css";

export interface MetaboliteGraphProps {
  readonly graph: MetaboliteGraphModel;
  readonly locale: "tr" | "en";
}

const copy = {
  tr: {
    eyebrow: "METABOLİT AĞI",
    title: "Ana molekülden kaynaklı dönüşümlere",
    parent: "Ana ilaç",
    enzyme: "Enzim",
    evidence: "Kaynak destekli bağlantı",
    activity: "Aktivite durumu",
    structure: "Kaynak destekli 2B bağlantı",
    structureHeld: "2B yapı inceleme bekliyor; yapı tahmin edilmedi.",
    provenance: "Kimlik ve yapı kaynağını aç",
    sourceUnavailable: "Doğrudan kaynak bağlantısı çözülemedi.",
  },
  en: {
    eyebrow: "METABOLITE GRAPH",
    title: "From parent molecule to sourced transformations",
    parent: "Parent drug",
    enzyme: "Enzyme",
    evidence: "Source-supported edge",
    activity: "Activity status",
    structure: "Source-supported 2D connectivity",
    structureHeld: "2D structure remains held for review; no structure was inferred.",
    provenance: "Open identity and structure source",
    sourceUnavailable: "The direct source link could not be resolved.",
  },
} as const;

const activityCopy = {
  tr: {
    active: "Aktif",
    "active-beta-blocker-preclinical": "Beta-bloker aktivitesi (preklinik hayvan kanıtı)",
    inactive: "İnaktif (kaynak kapsamıyla sınırlı)",
    "very-little-or-no-antisecretory": "Çok az veya hiç antisekretuvar aktivite (etiket bağlamı)",
    "reactive-toxic": "Reaktif / toksik",
    unknown: "Bilinmiyor; sonuç üretilmedi",
  },
  en: {
    active: "Active",
    "active-beta-blocker-preclinical": "Beta-blocking activity (preclinical animal evidence)",
    inactive: "Inactive (limited to the source context)",
    "very-little-or-no-antisecretory": "Very little or no antisecretory activity (label context)",
    "reactive-toxic": "Reactive / toxic",
    unknown: "Unknown; no conclusion generated",
  },
} as const;

export function MetaboliteGraph({ graph, locale }: MetaboliteGraphProps) {
  const labels = copy[locale];
  const parent = graph.nodes.find((node) => node.role === "parent");

  return (
    <section className={styles.metaboliteGraph} aria-labelledby="metabolite-graph-heading">
      <header>
        <span>{labels.eyebrow}</span>
        <h2 id="metabolite-graph-heading">{labels.title}</h2>
      </header>
      <div className={styles.graphCanvas} data-metabolite-edges={graph.edges.length}>
        <div className={styles.parentNode}>
          <span>{labels.parent}</span>
          <strong>{parent?.label.value}</strong>
        </div>
        {graph.edges.length === 0 ? (
          <p>{graph.unavailableReason}</p>
        ) : (
          <ul>
            {graph.edges.map((edge) => {
              const node = graph.nodes.find((candidate) => candidate.id === edge.metaboliteNodeId);
              if (!node) return null;
              const structureLabel = `${node.label.value} · ${labels.structure}`;
              return (
                <li key={edge.id}>
                  <i aria-hidden="true" />
                  <article
                    className={styles.metaboliteNodeCard}
                    data-metabolite-structure={node.structure2dSmiles ? "source-supported" : "held"}
                  >
                    {node.structure2dSmiles ? (
                      <SmilesStructure
                        className={styles.metaboliteStructure}
                        smiles={node.structure2dSmiles.value}
                        label={structureLabel}
                      />
                    ) : (
                      <p
                        className={styles.metaboliteStructureHeld}
                        data-metabolite-structure="held"
                      >
                        {labels.structureHeld}
                      </p>
                    )}
                    <div className={styles.metaboliteNodeCopy}>
                      <span>{edge.transformationClass.value}</span>
                      <strong>{node.label.value}</strong>
                      <small>
                        {edge.enzyme ? `${labels.enzyme}: ${edge.enzyme.value}` : labels.evidence}
                      </small>
                      <p
                        className={styles.metaboliteActivity}
                        data-metabolite-activity={edge.activity.value}
                      >
                        <b>{labels.activity}:</b>{" "}
                        {activityCopy[locale][edge.activity.value]}
                      </p>
                      {edge.activity.conditions.note ? (
                        <small className={styles.metaboliteActivityNote}>
                          {edge.activity.conditions.note}
                        </small>
                      ) : null}
                      {node.provenance ? (
                        <a
                          className={styles.metaboliteSourceLink}
                          href={node.provenance.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${labels.provenance}: ${node.provenance.title}`}
                        >
                          {labels.provenance} · {node.provenance.provider}{" "}
                          {node.provenance.externalId} ↗
                        </a>
                      ) : (
                        <small className={styles.metaboliteSourceUnavailable}>
                          {labels.sourceUnavailable}
                        </small>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
