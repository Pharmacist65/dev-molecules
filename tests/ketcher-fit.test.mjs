import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { scheduleKetcherFitAfterLayout } = await tsImport(
  "../components/lab/ketcher-fit.ts",
  import.meta.url,
);

function createScheduler() {
  let nextHandle = 1;
  const frames = new Map();
  let resizeCallback = () => undefined;
  let disconnected = false;

  return {
    scheduler: {
      requestFrame(callback) {
        const handle = nextHandle++;
        frames.set(handle, callback);
        return handle;
      },
      cancelFrame(handle) {
        frames.delete(handle);
      },
      observeResize(_target, callback) {
        resizeCallback = callback;
        return () => {
          disconnected = true;
        };
      },
    },
    flushFrame() {
      const entry = frames.entries().next().value;
      assert.ok(entry, "a layout frame should be queued");
      const [handle, callback] = entry;
      frames.delete(handle);
      callback();
    },
    resize() {
      resizeCallback();
    },
    pendingFrames() {
      return frames.size;
    },
    disconnected() {
      return disconnected;
    },
  };
}

function createHarness(sizes) {
  const calls = [];
  const structure = { id: "propranolol" };
  let sizeIndex = 0;
  const editorRoot = {
    getBoundingClientRect() {
      return sizes[Math.min(sizeIndex++, sizes.length - 1)];
    },
  };
  const container = {
    querySelector(selector) {
      assert.equal(selector, ".Ketcher-root");
      return editorRoot;
    },
  };
  const ketcher = {
    editor: {
      struct() {
        calls.push("struct");
        return structure;
      },
      zoomAccordingContent(value) {
        assert.equal(value, structure);
        calls.push("zoom");
      },
      centerStruct() {
        calls.push("center");
      },
    },
  };
  return { calls, container, ketcher };
}

test("Ketcher fits and centers only after two stable non-zero editor frames", () => {
  const clock = createScheduler();
  const harness = createHarness([
    { width: 0, height: 0 },
    { width: 0, height: 0 },
    { width: 1180, height: 576 },
    { width: 1180, height: 576 },
  ]);

  scheduleKetcherFitAfterLayout(
    harness.ketcher,
    harness.container,
    clock.scheduler,
  );

  clock.flushFrame();
  clock.flushFrame();
  assert.deepEqual(harness.calls, []);

  clock.flushFrame();
  clock.flushFrame();
  assert.deepEqual(harness.calls, ["struct", "zoom", "center"]);
  assert.equal(clock.disconnected(), true);
  assert.equal(clock.pendingFrames(), 0);
});

test("Ketcher fit scheduling restarts on resize and can be cancelled", () => {
  const clock = createScheduler();
  const harness = createHarness([
    { width: 1180, height: 576 },
    { width: 1180, height: 576 },
  ]);

  const cancel = scheduleKetcherFitAfterLayout(
    harness.ketcher,
    harness.container,
    clock.scheduler,
  );
  clock.resize();
  assert.equal(clock.pendingFrames(), 1);

  cancel();
  assert.equal(clock.pendingFrames(), 0);
  assert.equal(clock.disconnected(), true);
  assert.deepEqual(harness.calls, []);
});
