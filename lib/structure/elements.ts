export interface ElementVisual {
  readonly color: string;
  readonly highlight: string;
  /** van der Waals radius in angstroms. */
  readonly vanDerWaalsRadius: number;
  /** Visual radius for ball-and-stick, in angstroms. */
  readonly ballRadius: number;
}

const DEFAULT_ELEMENT: ElementVisual = {
  color: "#cbd5e1",
  highlight: "#ffffff",
  vanDerWaalsRadius: 1.7,
  ballRadius: 0.38,
};

/** Standard CPK-style colors paired with conventional van der Waals radii. */
const ELEMENT_VISUALS: Readonly<Record<string, ElementVisual>> = {
  H: {
    color: "#eef2f6",
    highlight: "#ffffff",
    vanDerWaalsRadius: 1.2,
    ballRadius: 0.25,
  },
  C: {
    color: "#7b8794",
    highlight: "#e3e9ee",
    vanDerWaalsRadius: 1.7,
    ballRadius: 0.42,
  },
  N: {
    color: "#3c78ff",
    highlight: "#a9c5ff",
    vanDerWaalsRadius: 1.55,
    ballRadius: 0.43,
  },
  O: {
    color: "#ef4057",
    highlight: "#ffb4be",
    vanDerWaalsRadius: 1.52,
    ballRadius: 0.43,
  },
  F: {
    color: "#55ce75",
    highlight: "#c8f7d3",
    vanDerWaalsRadius: 1.47,
    ballRadius: 0.4,
  },
  Cl: {
    color: "#35b861",
    highlight: "#b6f2c8",
    vanDerWaalsRadius: 1.75,
    ballRadius: 0.48,
  },
  Br: {
    color: "#a64a31",
    highlight: "#efad9b",
    vanDerWaalsRadius: 1.85,
    ballRadius: 0.5,
  },
  I: {
    color: "#7650c8",
    highlight: "#c9b9ef",
    vanDerWaalsRadius: 1.98,
    ballRadius: 0.53,
  },
  P: {
    color: "#ee8d32",
    highlight: "#ffd0a6",
    vanDerWaalsRadius: 1.8,
    ballRadius: 0.48,
  },
  S: {
    color: "#e7c62d",
    highlight: "#fff1a4",
    vanDerWaalsRadius: 1.8,
    ballRadius: 0.48,
  },
  B: {
    color: "#e18484",
    highlight: "#ffd0d0",
    vanDerWaalsRadius: 1.92,
    ballRadius: 0.46,
  },
  Si: {
    color: "#d1a68d",
    highlight: "#f3d8c8",
    vanDerWaalsRadius: 2.1,
    ballRadius: 0.52,
  },
  Na: {
    color: "#9b70e5",
    highlight: "#d9c7f8",
    vanDerWaalsRadius: 2.27,
    ballRadius: 0.54,
  },
  K: {
    color: "#7d56c2",
    highlight: "#cfbdec",
    vanDerWaalsRadius: 2.75,
    ballRadius: 0.58,
  },
  Ca: {
    color: "#6abd62",
    highlight: "#c9efc5",
    vanDerWaalsRadius: 2.31,
    ballRadius: 0.55,
  },
  Fe: {
    color: "#d27030",
    highlight: "#f7bc94",
    vanDerWaalsRadius: 2,
    ballRadius: 0.52,
  },
};

export function getElementVisual(element: string): ElementVisual {
  return ELEMENT_VISUALS[element] ?? DEFAULT_ELEMENT;
}
