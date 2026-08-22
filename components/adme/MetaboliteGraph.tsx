import type { MetaboliteGraph as MetaboliteGraphModel } from "@/lib/domain/metabolites";

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
    evidence: "İncelenmiş bağlantı",
  },
  en: {
    eyebrow: "METABOLITE GRAPH",
    title: "From parent molecule to sourced transformations",
    parent: "Parent drug",
    enzyme: "Enzyme",
    evidence: "Reviewed edge",
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
              return (
                <li key={edge.id}>
                  <i aria-hidden="true" />
                  <div>
                    <span>{edge.transformationClass.value}</span>
                    <strong>{node?.label.value}</strong>
                    <small>{edge.enzyme ? `${labels.enzyme}: ${edge.enzyme.value}` : labels.evidence}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
