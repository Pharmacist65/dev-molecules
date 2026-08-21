import path from "node:path";

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export interface RuntimeTelemetry {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
  readonly successfulStructureUrls: Set<string>;
  readonly successfulThreeDStructureUrls: Set<string>;
}

export interface RafCadence {
  readonly averageMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly sampleCount: number;
}

export interface LongTaskTelemetry {
  readonly supported: boolean;
  readonly count: number;
  readonly maxDurationMs: number;
  readonly totalDurationMs: number;
}

export interface InteractiveCanvasPerformance {
  readonly actions: readonly ["pointer-drag", "wheel-zoom-in", "wheel-zoom-out"];
  readonly cameraRevisionDelta: number;
  readonly interactionRafCadence: RafCadence;
  readonly longTasks: LongTaskTelemetry;
}

const STRUCTURE_URL = /\/structures\/.*\.sdf(?:\?|$)/i;
const THREE_D_STRUCTURE_URL = /-3d\.sdf(?:\?|$)/i;

export function watchRuntime(
  page: Page,
  allowNetworkError: (url: string) => boolean = () => false,
): RuntimeTelemetry {
  const telemetry: RuntimeTelemetry = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
    successfulStructureUrls: new Set<string>(),
    successfulThreeDStructureUrls: new Set<string>(),
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    if (location.url && allowNetworkError(location.url)) return;
    const source = location.url
      ? ` (${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0})`
      : "";
    telemetry.consoleErrors.push(`${message.text()}${source}`);
  });
  page.on("pageerror", (error) => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "unknown request failure";
    if (allowNetworkError(url) || failure === "net::ERR_ABORTED") return;
    telemetry.failedRequests.push(`${failure} ${url}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !allowNetworkError(url)) {
      telemetry.badResponses.push(`${response.status()} ${url}`);
    }
    if (response.ok() && STRUCTURE_URL.test(url)) {
      telemetry.successfulStructureUrls.add(url);
      if (THREE_D_STRUCTURE_URL.test(url)) {
        telemetry.successfulThreeDStructureUrls.add(url);
      }
    }
  });

  return telemetry;
}

export function expectCleanRuntime(telemetry: RuntimeTelemetry) {
  expect(telemetry.consoleErrors, "console.error entries").toEqual([]);
  expect(telemetry.pageErrors, "uncaught page errors").toEqual([]);
  expect(telemetry.failedRequests, "failed network requests").toEqual([]);
  expect(telemetry.badResponses, "HTTP 4xx/5xx responses").toEqual([]);
}

export function screenshotPath(filename: string) {
  return path.resolve(process.cwd(), "work/playwright/screenshots", filename);
}

export async function captureAcceptanceScreenshot(page: Page, filename: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: screenshotPath(filename),
    fullPage: false,
    animations: "disabled",
  });
}

export async function readNumericAttribute(locator: Locator, name: string) {
  const raw = await locator.getAttribute(name);
  expect(raw, `${name} must be exposed as a numeric test hook`).toMatch(/^\d+(?:\.\d+)?$/);
  return Number(raw);
}

export async function expectRevisionToChange(
  revisionOwner: Locator,
  action: () => Promise<void>,
) {
  const before = await readNumericAttribute(revisionOwner, "data-camera-revision");
  await action();
  await expect
    .poll(
      async () => readNumericAttribute(revisionOwner, "data-camera-revision"),
      { message: "camera revision must change after an interaction" },
    )
    .not.toBe(before);
}

export async function dragCanvas(
  page: Page,
  canvas: Locator,
  delta: { readonly x: number; readonly y: number },
) {
  const box = await canvas.boundingBox();
  expect(box, "molecular scene canvas must have a rendered box").not.toBeNull();
  if (!box) return;

  const start = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 6 });
  await page.mouse.up();
}

export async function pinchCanvas(canvas: Locator) {
  await canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = element.getBoundingClientRect();
    const centerX = bounds.left + bounds.width * 0.5;
    const centerY = bounds.top + bounds.height * 0.5;
    const emit = (
      type: "pointerdown" | "pointermove" | "pointerup",
      pointerId: number,
      clientX: number,
    ) =>
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          clientX,
          clientY: centerY,
          pointerId,
          pointerType: "touch",
          isPrimary: pointerId === 71,
        }),
      );

    emit("pointerdown", 71, centerX - 40);
    emit("pointerdown", 72, centerX + 40);
    emit("pointermove", 71, centerX - 58);
    emit("pointermove", 72, centerX + 58);
    emit("pointermove", 71, centerX - 40);
    emit("pointermove", 72, centerX + 40);
    emit("pointerup", 71, centerX - 40);
    emit("pointerup", 72, centerX + 40);
  });
}

export async function selectAtomThroughCanvas(page: Page, canvas: Locator, scene: Locator) {
  const box = await canvas.boundingBox();
  expect(box, "focus scene canvas must have a rendered box").not.toBeNull();
  if (!box) return;

  const offsets = [
    [0, 0],
    [-24, 0],
    [24, 0],
    [0, -24],
    [0, 24],
    [-48, -24],
    [48, 24],
  ] as const;

  for (const [offsetX, offsetY] of offsets) {
    await page.mouse.click(
      box.x + box.width * 0.5 + offsetX,
      box.y + box.height * 0.5 + offsetY,
    );
    const selected = await scene.getAttribute("data-selected-atom");
    if (selected && selected !== "none") return;
  }

  await expect(scene, "an atom must be selectable from the rendered focus model").not.toHaveAttribute(
    "data-selected-atom",
    /^(?:|none)$/,
  );
}

export async function measureIdleRafCadence(
  page: Page,
  sampleCount = 24,
): Promise<RafCadence> {
  return page.evaluate(
    (samples) =>
      new Promise<RafCadence>((resolve) => {
        const timings: number[] = [];
        let previous: number | null = null;

        const sample = (now: number) => {
          if (previous !== null) timings.push(now - previous);
          previous = now;
          if (timings.length < samples) {
            requestAnimationFrame(sample);
            return;
          }

          const sorted = [...timings].sort((left, right) => left - right);
          const averageMs = timings.reduce((total, value) => total + value, 0) / timings.length;
          const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
          resolve({
            averageMs: Number(averageMs.toFixed(2)),
            p95Ms: Number(sorted[p95Index].toFixed(2)),
            maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
            sampleCount: timings.length,
          });
        };

        requestAnimationFrame(sample);
      }),
    sampleCount,
  );
}

interface BrowserInteractionProbe {
  active: boolean;
  animationFrameId: number | null;
  readonly timestamps: number[];
  readonly longTaskDurations: number[];
  readonly longTaskSupported: boolean;
  readonly observer: PerformanceObserver | null;
}

type InteractionProbeWindow = typeof window & {
  __devMoleculesInteractionProbe?: BrowserInteractionProbe;
};

async function startInteractionProbe(page: Page) {
  await page.evaluate(() => {
    const probeWindow = window as InteractionProbeWindow;
    const previousProbe = probeWindow.__devMoleculesInteractionProbe;
    if (previousProbe) {
      previousProbe.active = false;
      if (previousProbe.animationFrameId !== null) {
        cancelAnimationFrame(previousProbe.animationFrameId);
      }
      previousProbe.observer?.disconnect();
    }

    const longTaskSupported =
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    const longTaskDurations: number[] = [];
    const observer = longTaskSupported
      ? new PerformanceObserver((records) => {
          for (const entry of records.getEntries()) {
            longTaskDurations.push(entry.duration);
          }
        })
      : null;
    observer?.observe({ type: "longtask" });

    const probe: BrowserInteractionProbe = {
      active: true,
      animationFrameId: null,
      timestamps: [],
      longTaskDurations,
      longTaskSupported,
      observer,
    };
    const sampleFrame = (timestamp: number) => {
      if (!probe.active) return;
      probe.timestamps.push(timestamp);
      probe.animationFrameId = requestAnimationFrame(sampleFrame);
    };
    probe.animationFrameId = requestAnimationFrame(sampleFrame);
    probeWindow.__devMoleculesInteractionProbe = probe;
  });

  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function stopInteractionProbe(page: Page, minimumIntervals = 12) {
  return page.evaluate(async (minimumSamples) => {
    const probeWindow = window as InteractionProbeWindow;
    const probe = probeWindow.__devMoleculesInteractionProbe;
    if (!probe) throw new Error("Interactive performance probe was not started");

    const deadline = performance.now() + 1_000;
    while (probe.timestamps.length <= minimumSamples && performance.now() < deadline) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    probe.active = false;
    if (probe.animationFrameId !== null) cancelAnimationFrame(probe.animationFrameId);
    for (const entry of probe.observer?.takeRecords() ?? []) {
      probe.longTaskDurations.push(entry.duration);
    }
    probe.observer?.disconnect();
    delete probeWindow.__devMoleculesInteractionProbe;

    const intervals = probe.timestamps
      .slice(1)
      .map((timestamp, index) => timestamp - probe.timestamps[index]);
    if (intervals.length === 0) {
      throw new Error("Interactive performance probe captured no animation frames");
    }
    const sortedIntervals = [...intervals].sort((left, right) => left - right);
    const averageMs = intervals.reduce((total, value) => total + value, 0) / intervals.length;
    const p95Index = Math.min(
      sortedIntervals.length - 1,
      Math.ceil(sortedIntervals.length * 0.95) - 1,
    );
    const longTaskTotal = probe.longTaskDurations.reduce(
      (total, duration) => total + duration,
      0,
    );

    return {
      interactionRafCadence: {
        averageMs: Number(averageMs.toFixed(2)),
        p95Ms: Number(sortedIntervals[p95Index].toFixed(2)),
        maxMs: Number(sortedIntervals[sortedIntervals.length - 1].toFixed(2)),
        sampleCount: intervals.length,
      },
      longTasks: {
        supported: probe.longTaskSupported,
        count: probe.longTaskDurations.length,
        maxDurationMs: Number(Math.max(0, ...probe.longTaskDurations).toFixed(2)),
        totalDurationMs: Number(longTaskTotal.toFixed(2)),
      },
    };
  }, minimumIntervals);
}

/** Measures browser cadence and main-thread long tasks while real input drives the canvas. */
export async function measureInteractiveCanvasPerformance(
  page: Page,
  canvas: Locator,
  revisionOwner: Locator,
): Promise<InteractiveCanvasPerformance> {
  const beforeRevision = await readNumericAttribute(revisionOwner, "data-camera-revision");
  await startInteractionProbe(page);
  await dragCanvas(page, canvas, { x: 64, y: -34 });
  await canvas.hover();
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => readNumericAttribute(revisionOwner, "data-camera-revision"), {
      message: "measured drag/zoom interactions must revise the scene camera",
    })
    .toBeGreaterThan(beforeRevision);
  const measured = await stopInteractionProbe(page);
  const afterRevision = await readNumericAttribute(revisionOwner, "data-camera-revision");

  return {
    actions: ["pointer-drag", "wheel-zoom-in", "wheel-zoom-out"],
    cameraRevisionDelta: afterRevision - beforeRevision,
    ...measured,
  };
}

export async function attachAcceptanceMetrics(
  page: Page,
  testInfo: TestInfo,
  telemetry: RuntimeTelemetry,
  stage: string,
  interactiveCanvasPerformance?: InteractiveCanvasPerformance,
) {
  const contextOwner = page.locator("[data-active-webgl-contexts]").first();
  const visibleOwner = page.locator("[data-visible-count]").first();
  const idleRafCadence = await measureIdleRafCadence(page);
  const metrics = {
    stage,
    viewport: page.viewportSize(),
    consoleErrorCount: telemetry.consoleErrors.length,
    pageErrorCount: telemetry.pageErrors.length,
    failedNetworkRequestCount:
      telemetry.failedRequests.length + telemetry.badResponses.length,
    activeWebglContextCount: await readNumericAttribute(
      contextOwner,
      "data-active-webgl-contexts",
    ),
    visibleThreeDMoleculeCount: await readNumericAttribute(
      visibleOwner,
      "data-visible-count",
    ),
    successfulStructureAssetCount: telemetry.successfulStructureUrls.size,
    successfulThreeDStructureAssetCount: telemetry.successfulThreeDStructureUrls.size,
    idleRafCadence,
    interactiveCanvasPerformance: interactiveCanvasPerformance ?? null,
  };

  await testInfo.attach(`acceptance-metrics-${stage}`, {
    body: Buffer.from(`${JSON.stringify(metrics, null, 2)}\n`),
    contentType: "application/json",
  });
  console.info(`ACCEPTANCE_METRICS ${JSON.stringify(metrics)}`);

  return metrics;
}
