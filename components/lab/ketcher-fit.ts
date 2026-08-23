import type { Ketcher } from "ketcher-core";

interface KetcherFitScheduler {
  readonly requestFrame: (callback: () => void) => number;
  readonly cancelFrame: (handle: number) => void;
  readonly observeResize: (
    target: HTMLElement,
    callback: () => void,
  ) => () => void;
}

const browserScheduler: KetcherFitScheduler = {
  requestFrame(callback) {
    return window.requestAnimationFrame(callback);
  },
  cancelFrame(handle) {
    window.cancelAnimationFrame(handle);
  },
  observeResize(target, callback) {
    const observer = new ResizeObserver(callback);
    observer.observe(target);
    return () => observer.disconnect();
  },
};

interface EditorSize {
  readonly width: number;
  readonly height: number;
}

function readEditorSize(container: HTMLElement): EditorSize {
  const editorRoot =
    container.querySelector<HTMLElement>(".Ketcher-root") ?? container;
  const { width, height } = editorRoot.getBoundingClientRect();
  return { width, height };
}

function isStableEditorSize(before: EditorSize, after: EditorSize): boolean {
  return (
    before.width > 0 &&
    before.height > 0 &&
    before.width === after.width &&
    before.height === after.height
  );
}

/**
 * Ketcher calculates its viewport from the mounted editor dimensions. Imports
 * can resolve before percentage-height layout has reached the editor root, so
 * defer its public fit and center operations until two painted measurements
 * agree. A ResizeObserver restarts the check if the host changes in between.
 */
export function scheduleKetcherFitAfterLayout(
  ketcher: Ketcher,
  container: HTMLElement,
  scheduler: KetcherFitScheduler = browserScheduler,
): () => void {
  let firstFrame: number | null = null;
  let secondFrame: number | null = null;
  let stopped = false;

  const cancelFrames = () => {
    if (firstFrame !== null) scheduler.cancelFrame(firstFrame);
    if (secondFrame !== null) scheduler.cancelFrame(secondFrame);
    firstFrame = null;
    secondFrame = null;
  };

  const queueFit = () => {
    if (stopped) return;
    cancelFrames();
    firstFrame = scheduler.requestFrame(() => {
      firstFrame = null;
      const before = readEditorSize(container);
      secondFrame = scheduler.requestFrame(() => {
        secondFrame = null;
        const after = readEditorSize(container);
        if (!isStableEditorSize(before, after)) {
          queueFit();
          return;
        }

        const structure = ketcher.editor.struct();
        ketcher.editor.zoomAccordingContent(structure);
        ketcher.editor.centerStruct();
        stopped = true;
        stopObserving();
      });
    });
  };

  const stopObserving = scheduler.observeResize(container, queueFit);
  queueFit();

  return () => {
    stopped = true;
    cancelFrames();
    stopObserving();
  };
}
