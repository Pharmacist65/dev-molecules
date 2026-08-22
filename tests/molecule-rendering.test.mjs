import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { DEFAULT_VIEWER_TRANSFORM, drawMolecule, projectAtoms } = await tsImport(
  "../components/molecule-viewer/rendering.ts",
  import.meta.url,
);

function makeStructure(stereo) {
  return {
    title: "stereo-test",
    program: "test 2D",
    comment: "",
    dimension: "2d",
    atoms: [
      {
        index: 0,
        element: "C",
        x: 0,
        y: 0,
        z: 0,
        formalCharge: 0,
        massDifference: 0,
        isotope: null,
      },
      {
        index: 1,
        element: "C",
        x: 1.5,
        y: 0,
        z: 0,
        formalCharge: 0,
        massDifference: 0,
        isotope: null,
      },
    ],
    bonds: [{ index: 0, atomA: 0, atomB: 1, order: 1, stereo }],
    properties: {},
  };
}

function makeRecordingContext() {
  let path = [];
  const fills = [];
  const strokes = [];

  return {
    fills,
    strokes,
    beginPath() {
      path = [];
    },
    moveTo(x, y) {
      path.push(["move", x, y]);
    },
    lineTo(x, y) {
      path.push(["line", x, y]);
    },
    closePath() {
      path.push(["close"]);
    },
    arc(x, y, radius) {
      path.push(["arc", x, y, radius]);
    },
    fill() {
      fills.push(path.map((entry) => [...entry]));
    },
    stroke() {
      strokes.push(path.map((entry) => [...entry]));
    },
    save() {},
    restore() {},
    clearRect() {},
    setLineDash() {},
    roundRect() {},
    fillText() {},
    strokeText() {},
    measureText() {
      return { width: 8 };
    },
  };
}

const renderOptions = {
  width: 320,
  height: 220,
  dimension: "2d",
  representation: "ball-and-stick",
  showHydrogens: true,
  showLabels: false,
  selectedAtomIndex: null,
  hoveredAtomIndex: null,
  transform: { ...DEFAULT_VIEWER_TRANSFORM, rotationX: 0, rotationY: 0 },
};

test("renders V2000 stereo code 1 as a solid wedge from atomA to atomB", () => {
  const structure = makeStructure(1);
  const context = makeRecordingContext();
  const projected = projectAtoms(structure, renderOptions);

  drawMolecule(context, structure, renderOptions);

  const wedge = context.fills.find(
    (path) => path.map((entry) => entry[0]).join(",") === "move,line,line,close",
  );
  assert.ok(wedge, "expected a filled triangular wedge");
  assert.equal(wedge[0][1], projected[0].x);
  assert.equal(wedge[0][2], projected[0].y);
  assert.notEqual(wedge[1][2], wedge[2][2], "wide edge must terminate at atomB");
});

test("renders V2000 stereo code 6 as a widening hashed wedge atomA to atomB", () => {
  const structure = makeStructure(6);
  const context = makeRecordingContext();

  drawMolecule(context, structure, renderOptions);

  assert.equal(context.strokes.length, 7);
  const firstWidth = Math.hypot(
    context.strokes[0][1][1] - context.strokes[0][0][1],
    context.strokes[0][1][2] - context.strokes[0][0][2],
  );
  const lastWidth = Math.hypot(
    context.strokes[6][1][1] - context.strokes[6][0][1],
    context.strokes[6][1][2] - context.strokes[6][0][2],
  );
  assert.ok(lastWidth > firstWidth, "hashes must widen toward atomB");
});
