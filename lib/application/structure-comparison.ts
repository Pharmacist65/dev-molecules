import type { MoleculeStructure } from "@/lib/structure";

export const STRUCTURE_GRAPH_COMPARISON_VERSION =
  "sdf-local-environment-core@1.0.0";

export interface StructureGraphComparisonInput {
  readonly id: string;
  readonly structure: MoleculeStructure;
}

export interface StructureGraphComparisonMask {
  readonly moleculeId: string;
  readonly commonAtomIndices: readonly number[];
  readonly changedAtomIndices: readonly number[];
  readonly changedElements: Readonly<Record<string, number>>;
}

export interface StructureGraphComparison {
  readonly method: typeof STRUCTURE_GRAPH_COMPARISON_VERSION;
  readonly commonCoreAtomCount: number;
  readonly commonCoreBondCount: number;
  readonly commonElements: Readonly<Record<string, number>>;
  readonly masks: readonly StructureGraphComparisonMask[];
  readonly limitation: string;
}

interface StructureGraph {
  readonly input: StructureGraphComparisonInput;
  readonly adjacency: ReadonlyMap<number, readonly { index: number; order: number }[]>;
  readonly environmentAtoms: ReadonlyMap<string, readonly number[]>;
}

const atomEnvironmentToken = (
  structure: MoleculeStructure,
  adjacency: StructureGraph["adjacency"],
  atomIndex: number,
) => {
  const atom = structure.atoms[atomIndex];
  if (!atom) return "";
  const neighbors = (adjacency.get(atomIndex) ?? [])
    .flatMap((neighbor) => {
      const neighborAtom = structure.atoms[neighbor.index];
      return neighborAtom ? [`${neighborAtom.element}:${neighbor.order}`] : [];
    })
    .sort();
  return [
    atom.element,
    atom.formalCharge,
    atom.isotope ?? 0,
    neighbors.length,
    ...neighbors,
  ].join("|");
};

function createStructureGraph(input: StructureGraphComparisonInput): StructureGraph {
  const adjacency = new Map<number, { index: number; order: number }[]>();
  for (const atom of input.structure.atoms) adjacency.set(atom.index, []);
  for (const bond of input.structure.bonds) {
    adjacency.get(bond.atomA)?.push({ index: bond.atomB, order: bond.order });
    adjacency.get(bond.atomB)?.push({ index: bond.atomA, order: bond.order });
  }

  const environmentAtoms = new Map<string, number[]>();
  for (const atom of input.structure.atoms) {
    if (atom.element === "H") continue;
    const token = atomEnvironmentToken(input.structure, adjacency, atom.index);
    const matches = environmentAtoms.get(token) ?? [];
    matches.push(atom.index);
    environmentAtoms.set(token, matches);
  }
  return { input, adjacency, environmentAtoms };
}

function largestConnectedComponent(
  graph: StructureGraph,
  candidates: ReadonlySet<number>,
) {
  const unseen = new Set(candidates);
  const components: number[][] = [];
  while (unseen.size > 0) {
    const start = [...unseen].sort((left, right) => left - right)[0];
    if (start === undefined) break;
    const queue = [start];
    const component: number[] = [];
    unseen.delete(start);
    while (queue.length > 0) {
      const atomIndex = queue.shift();
      if (atomIndex === undefined) continue;
      component.push(atomIndex);
      for (const neighbor of graph.adjacency.get(atomIndex) ?? []) {
        if (!unseen.has(neighbor.index)) continue;
        unseen.delete(neighbor.index);
        queue.push(neighbor.index);
      }
    }
    components.push(component);
  }
  return components.sort(
    (left, right) => right.length - left.length || (left[0] ?? 0) - (right[0] ?? 0),
  )[0] ?? [];
}

function connectedPrefix(
  graph: StructureGraph,
  component: readonly number[],
  limit: number,
) {
  if (component.length <= limit) return [...component].sort((left, right) => left - right);
  const allowed = new Set(component);
  const start = [...component].sort((left, right) => left - right)[0];
  if (start === undefined) return [];
  const selected: number[] = [];
  const queued = new Set([start]);
  const queue = [start];
  while (queue.length > 0 && selected.length < limit) {
    const atomIndex = queue.shift();
    if (atomIndex === undefined) continue;
    selected.push(atomIndex);
    const neighbors = [...(graph.adjacency.get(atomIndex) ?? [])]
      .map((neighbor) => neighbor.index)
      .filter((index) => allowed.has(index) && !queued.has(index))
      .sort((left, right) => left - right);
    for (const neighbor of neighbors) {
      queued.add(neighbor);
      queue.push(neighbor);
    }
  }
  return selected.sort((left, right) => left - right);
}

/**
 * Produces a conservative visual comparison from the real loaded SDF graphs.
 * An atom is eligible for the common core only when its element, charge,
 * degree, neighboring elements and bond orders occur in every compared graph.
 * The displayed core is connected in every molecule, but is deliberately not
 * presented as an exact maximum-common-substructure calculation.
 */
export function compareStructureGraphs(
  inputs: readonly StructureGraphComparisonInput[],
): StructureGraphComparison {
  if (inputs.length < 2 || inputs.length > 4) {
    throw new Error("Structure graph comparison requires two to four molecules.");
  }
  if (new Set(inputs.map((input) => input.id)).size !== inputs.length) {
    throw new Error("Structure graph comparison molecule IDs must be unique.");
  }

  const graphs = inputs.map(createStructureGraph);
  const firstTokens = graphs[0]?.environmentAtoms.keys() ?? [];
  const commonTokenCounts = new Map<string, number>();
  for (const token of firstTokens) {
    const count = Math.min(
      ...graphs.map((graph) => graph.environmentAtoms.get(token)?.length ?? 0),
    );
    if (count > 0) commonTokenCounts.set(token, count);
  }

  const candidateComponents = graphs.map((graph) => {
    const candidates = new Set<number>();
    for (const [token, count] of commonTokenCounts) {
      for (const atomIndex of (graph.environmentAtoms.get(token) ?? []).slice(0, count)) {
        candidates.add(atomIndex);
      }
    }
    return largestConnectedComponent(graph, candidates);
  });
  const commonCoreAtomCount = Math.min(...candidateComponents.map((component) => component.length));
  const coreByMolecule = graphs.map((graph, index) =>
    connectedPrefix(graph, candidateComponents[index] ?? [], commonCoreAtomCount),
  );

  const commonCoreBondCount = Math.min(
    ...graphs.map((graph, index) => {
      const core = new Set(coreByMolecule[index] ?? []);
      return graph.input.structure.bonds.filter(
        (bond) => core.has(bond.atomA) && core.has(bond.atomB),
      ).length;
    }),
  );
  let commonElements: Record<string, number> | null = null;
  for (let graphIndex = 0; graphIndex < graphs.length; graphIndex += 1) {
    const graph = graphs[graphIndex];
    if (!graph) continue;
    const counts: Record<string, number> = {};
    for (const atomIndex of coreByMolecule[graphIndex] ?? []) {
      const element = graph.input.structure.atoms[atomIndex]?.element;
      if (element) counts[element] = (counts[element] ?? 0) + 1;
    }
    if (commonElements === null) {
      commonElements = counts;
    } else {
      const nextCommonElements: Record<string, number> = {};
      for (const [element, count] of Object.entries(commonElements)) {
        const sharedCount = Math.min(count, counts[element] ?? 0);
        if (sharedCount > 0) nextCommonElements[element] = sharedCount;
      }
      commonElements = nextCommonElements;
    }
  }

  const masks = graphs.map((graph, index): StructureGraphComparisonMask => {
    const commonAtomIndices = coreByMolecule[index] ?? [];
    const common = new Set(commonAtomIndices);
    const changedAtoms = graph.input.structure.atoms.filter(
      (atom) => atom.element !== "H" && !common.has(atom.index),
    );
    return {
      moleculeId: graph.input.id,
      commonAtomIndices,
      changedAtomIndices: changedAtoms.map((atom) => atom.index),
      changedElements: Object.fromEntries(
        [...new Set(changedAtoms.map((atom) => atom.element))]
          .sort()
          .map((element) => [
            element,
            changedAtoms.filter((atom) => atom.element === element).length,
          ]),
      ),
    };
  });

  return {
    method: STRUCTURE_GRAPH_COMPARISON_VERSION,
    commonCoreAtomCount,
    commonCoreBondCount,
    commonElements: commonElements ?? {},
    masks,
    limitation:
      "Conservative shared local SDF graph environments; not an exact maximum-common-substructure or bioactivity claim.",
  };
}
