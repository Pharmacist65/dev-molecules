"use client";

import { useState } from "react";

import type { MoleculeRecord } from "@/lib/domain";

import styles from "./platform.module.css";

const fragments = [
  { id: "aryl", label: "Aromatic region", symbol: "Ar", hint: "Begin with the retained aromatic region." },
  { id: "ether", label: "Ether bridge", symbol: "O", hint: "Connect the aromatic region through oxygen." },
  { id: "chain", label: "Three-carbon chain", symbol: "C₃", hint: "Extend the shared propanolamine backbone." },
  { id: "alcohol", label: "Secondary alcohol", symbol: "OH", hint: "Place the alcohol motif on the chain." },
  { id: "amine", label: "Amine region", symbol: "N", hint: "Complete the educational scaffold with the amine region." },
] as const;

export function GuidedBuilder({ molecule }: { readonly molecule: MoleculeRecord }) {
  const [assembled, setAssembled] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("Choose the first conserved region.");
  const isComplete = assembled.length === fragments.length;

  function addFragment(fragmentId: string) {
    if (isComplete || assembled.includes(fragmentId)) return;
    const expected = fragments[assembled.length];
    if (fragmentId !== expected?.id) {
      setFeedback(expected?.hint ?? "Inspect the identity boundary before continuing.");
      return;
    }
    const next = [...assembled, fragmentId];
    setAssembled(next);
    setFeedback(
      next.length === fragments.length
        ? "Scaffold complete. Connectivity is a learning result, not synthesis evidence."
        : fragments[next.length]?.hint ?? "Continue.",
    );
  }

  function reset() {
    setAssembled([]);
    setFeedback("Choose the first conserved region.");
  }

  return (
    <section className={styles.featureSection} aria-labelledby="builder-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>BUILD / GUIDED MOLECULE WORKBENCH</p>
          <h1 id="builder-heading">Build the scaffold. Preserve the evidence boundary.</h1>
          <p>
            Parçaları doğru sırayla birleştir; çizdiğin bağlantının deneysel
            sentez, güvenlik veya etkinlik kanıtı olmadığını her adımda gör.
          </p>
        </div>
        <div className={styles.reviewPill} data-state={isComplete ? "complete" : "pending"}>
          <i /> {isComplete ? "scaffold complete" : `${assembled.length}/${fragments.length} fragments`}
        </div>
      </div>

      <div className={styles.builderGrid}>
        <aside className={styles.fragmentLibrary}>
          <span className={styles.smallLabel}>FRAGMENT LIBRARY</span>
          <h3>Guided components</h3>
          <p>Current teaching reference: <strong>{molecule.identity.preferredName}</strong></p>
          <div className={styles.fragmentButtons}>
            {fragments.map((fragment) => (
              <button
                key={fragment.id}
                type="button"
                disabled={assembled.includes(fragment.id)}
                onClick={() => addFragment(fragment.id)}
              >
                <span>{fragment.symbol}</span>
                <div><strong>{fragment.label}</strong><small>{assembled.includes(fragment.id) ? "Placed" : "Add to canvas"}</small></div>
              </button>
            ))}
          </div>
        </aside>

        <div className={styles.builderCanvas}>
          <div className={styles.canvasGrid} aria-hidden="true" />
          <div className={styles.buildTopline}>
            <span>GUIDED MODE</span><span>VALENCE ENGINE · EDUCATIONAL PREVIEW</span>
          </div>
          <div className={styles.assembledStructure} aria-label={`${assembled.length} parça yerleştirildi`}>
            {fragments.map((fragment, index) => (
              <div
                key={fragment.id}
                className={styles.assemblyNode}
                data-placed={assembled.includes(fragment.id)}
              >
                {index > 0 ? <i aria-hidden="true" /> : null}
                <span>{fragment.symbol}</span>
                <small>{fragment.label}</small>
              </div>
            ))}
          </div>
          <div className={styles.builderFeedback} role="status" data-complete={isComplete}>
            <span>{isComplete ? "✓" : String(assembled.length + 1).padStart(2, "0")}</span>
            <div><strong>{isComplete ? "Learning scaffold assembled" : "Next constraint"}</strong><p>{feedback}</p></div>
          </div>
        </div>

        <aside className={styles.inspectorPanel}>
          <span className={styles.smallLabel}>LIVE INSPECTOR</span>
          <dl>
            <div><dt>Representation</dt><dd>User-edited draft</dd></div>
            <div><dt>Identity match</dt><dd>{isComplete ? "Comparison ready" : "Not assessed"}</dd></div>
            <div><dt>Synthesis evidence</dt><dd>Not assessed</dd></div>
            <div><dt>Biological evidence</dt><dd>Not assessed</dd></div>
            <div><dt>Privacy</dt><dd>Device-local</dd></div>
          </dl>
          <div className={styles.boundaryCallout}>
            <b>DRAWN ≠ DISCOVERED</b>
            <p>Bir yapıyı çizmek; yeni, üretilebilir veya etkili olduğunu göstermez.</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={reset}>Reset workbench</button>
        </aside>
      </div>
    </section>
  );
}
