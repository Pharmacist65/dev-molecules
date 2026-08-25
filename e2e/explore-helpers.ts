import path from "node:path";
import { createRequire } from "node:module";

import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

const loadModule = createRequire(import.meta.url);
const playwrightPackage = loadModule("@playwright/test/package.json") as {
  readonly version?: unknown;
};
const PLAYWRIGHT_VERSION =
  typeof playwrightPackage.version === "string" ? playwrightPackage.version : "unknown";

export type PerformanceProfileName =
  | "local-production"
  | "shared-software-renderer";

export interface PerformanceBudgets {
  readonly interactionAverageMs: number;
  readonly interactionP95Ms: number;
  readonly interactionLongTaskCount: number;
  readonly interactionLongTaskMaxDurationMs: number;
  readonly idleAverageMs: number;
  readonly idleP95Ms: number;
}

export interface RendererEnvironmentTelemetry {
  readonly performanceProfile: {
    readonly name: PerformanceProfileName;
    readonly budgets: PerformanceBudgets;
  };
  readonly playwright: {
    readonly version: string;
    readonly projectName: string;
    readonly retry: number;
  };
  readonly browser: {
    readonly name: string;
    readonly version: string;
  };
  readonly platform: {
    readonly os: NodeJS.Platform;
    readonly architecture: string;
    readonly nodeMajorVersion: number;
    readonly ci: boolean;
  };
  readonly webgl: {
    readonly contextType: "webgl" | "webgl2";
    readonly debugRendererInfoSupported: boolean;
    readonly unmaskedVendor: string | null;
    readonly unmaskedRenderer: string | null;
    readonly version: string;
    readonly shadingLanguageVersion: string;
  };
  readonly chromiumSystemInfo: {
    readonly gpuDeviceCount: number;
    readonly primaryDevice: {
      readonly vendorId: number;
      readonly deviceId: number;
      readonly vendor: string;
      readonly device: string;
      readonly driverVendor: string;
      readonly driverVersion: string;
    } | null;
    readonly auxAttributes: Readonly<Record<string, string | number | boolean>>;
    readonly featureStatus: Readonly<Record<string, string | number | boolean>>;
    readonly driverBugWorkaroundCount: number;
    readonly videoDecodingProfileCount: number;
    readonly videoEncodingProfileCount: number;
  };
}

const LOCAL_PRODUCTION_BUDGETS: PerformanceBudgets = {
  interactionAverageMs: 50,
  interactionP95Ms: 100,
  interactionLongTaskCount: 3,
  interactionLongTaskMaxDurationMs: 200,
  idleAverageMs: 50,
  idleP95Ms: 100,
};
const SHARED_SOFTWARE_RENDERER_BUDGETS: PerformanceBudgets = {
  interactionAverageMs: 100,
  interactionP95Ms: 200,
  interactionLongTaskCount: 16,
  interactionLongTaskMaxDurationMs: 200,
  idleAverageMs: 50,
  idleP95Ms: 100,
};
const SAFE_GPU_AUX_ATTRIBUTES = [
  "glImplementationParts",
  "glRenderer",
  "glVendor",
  "glVersion",
  "passthroughCmdDecoder",
  "sandboxed",
] as const;
const SAFE_GPU_FEATURE_STATUSES = [
  "gpu_compositing",
  "opengl",
  "rasterization",
  "webgl",
  "webgpu",
] as const;
const rendererTelemetryCache = new WeakMap<
  Page,
  Promise<RendererEnvironmentTelemetry>
>();

export function getPerformanceProfileConfiguration() {
  const name: PerformanceProfileName =
    process.env.PLAYWRIGHT_PERFORMANCE_PROFILE === "shared-software-renderer"
      ? "shared-software-renderer"
      : "local-production";
  return {
    name,
    budgets:
      name === "shared-software-renderer"
        ? SHARED_SOFTWARE_RENDERER_BUDGETS
        : LOCAL_PRODUCTION_BUDGETS,
  } as const;
}

function sanitizeGpuText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, 512)
    : "";
}

function selectSafeGpuSignals(
  source: Readonly<Record<string, unknown>> | undefined,
  keys: readonly string[],
) {
  const selected: Record<string, string | number | boolean> = {};
  if (!source) return selected;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") selected[key] = sanitizeGpuText(value);
    if (typeof value === "number" || typeof value === "boolean") selected[key] = value;
  }
  return selected;
}

/**
 * Captures only renderer/runtime signals needed to make performance evidence
 * reproducible. System model names, host identifiers and Chromium's full
 * command line are deliberately never read into the attachment.
 */
export function collectRendererEnvironmentTelemetry(
  page: Page,
  testInfo: TestInfo,
): Promise<RendererEnvironmentTelemetry> {
  const cached = rendererTelemetryCache.get(page);
  if (cached) return cached;

  const pending = (async () => {
    const canvas = page.locator("canvas[data-molecular-scene-canvas]").first();
    const webgl = await canvas.evaluate((element: HTMLCanvasElement) => {
      const webgl2 = element.getContext("webgl2");
      const context = webgl2 ?? element.getContext("webgl");
      if (!context) throw new Error("Molecular scene WebGL telemetry context is unavailable");
      const debugRendererInfo = context.getExtension("WEBGL_debug_renderer_info");
      const readString = (parameter: number) => String(context.getParameter(parameter));

      return {
        contextType: webgl2 ? ("webgl2" as const) : ("webgl" as const),
        debugRendererInfoSupported: Boolean(debugRendererInfo),
        unmaskedVendor: debugRendererInfo
          ? readString(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
          : null,
        unmaskedRenderer: debugRendererInfo
          ? readString(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
          : null,
        version: readString(context.VERSION),
        shadingLanguageVersion: readString(context.SHADING_LANGUAGE_VERSION),
      };
    });

    const browser = page.context().browser();
    if (!browser) throw new Error("Renderer telemetry requires a Playwright browser");
    const cdpSession = await browser.newBrowserCDPSession();
    let systemInfo: Awaited<ReturnType<typeof cdpSession.send<"SystemInfo.getInfo">>>;
    try {
      systemInfo = await cdpSession.send("SystemInfo.getInfo");
    } finally {
      await cdpSession.detach();
    }
    const primaryDevice = systemInfo.gpu.devices[0];

    return {
      performanceProfile: getPerformanceProfileConfiguration(),
      playwright: {
        version: PLAYWRIGHT_VERSION,
        projectName: testInfo.project.name || "default",
        retry: testInfo.retry,
      },
      browser: {
        name: browser.browserType().name(),
        version: browser.version(),
      },
      platform: {
        os: process.platform,
        architecture: process.arch,
        nodeMajorVersion: Number.parseInt(process.versions.node.split(".")[0], 10),
        ci: Boolean(process.env.CI),
      },
      webgl,
      chromiumSystemInfo: {
        gpuDeviceCount: systemInfo.gpu.devices.length,
        primaryDevice: primaryDevice
          ? {
              vendorId: primaryDevice.vendorId,
              deviceId: primaryDevice.deviceId,
              vendor: sanitizeGpuText(primaryDevice.vendorString),
              device: sanitizeGpuText(primaryDevice.deviceString),
              driverVendor: sanitizeGpuText(primaryDevice.driverVendor),
              driverVersion: sanitizeGpuText(primaryDevice.driverVersion),
            }
          : null,
        auxAttributes: selectSafeGpuSignals(
          systemInfo.gpu.auxAttributes as Readonly<Record<string, unknown>> | undefined,
          SAFE_GPU_AUX_ATTRIBUTES,
        ),
        featureStatus: selectSafeGpuSignals(
          systemInfo.gpu.featureStatus as Readonly<Record<string, unknown>> | undefined,
          SAFE_GPU_FEATURE_STATUSES,
        ),
        driverBugWorkaroundCount: systemInfo.gpu.driverBugWorkarounds.length,
        videoDecodingProfileCount: systemInfo.gpu.videoDecoding.length,
        videoEncodingProfileCount: systemInfo.gpu.videoEncoding.length,
      },
    };
  })();

  rendererTelemetryCache.set(page, pending);
  return pending;
}

export function expectRendererEnvironmentForPerformanceProfile(
  telemetry: RendererEnvironmentTelemetry,
) {
  if (telemetry.performanceProfile.name !== "shared-software-renderer") return;

  expect(
    telemetry.browser.name,
    "the shared software-renderer profile must run in Chromium",
  ).toBe("chromium");
  const rendererSignals = [
    telemetry.webgl.unmaskedRenderer,
    telemetry.chromiumSystemInfo.primaryDevice?.device,
    telemetry.chromiumSystemInfo.primaryDevice?.driverVendor,
    telemetry.chromiumSystemInfo.auxAttributes.glRenderer,
  ]
    .filter(Boolean)
    .join(" | ");
  expect(
    rendererSignals,
    "shared software-renderer timing gates require SwiftShader/SwANGLE",
  ).toMatch(/SwiftShader|SwANGLE/i);
  expect(
    telemetry.chromiumSystemInfo.auxAttributes.glImplementationParts,
    "shared software-renderer timing gates require ANGLE's SwiftShader backend",
  ).toMatch(/(?:^|[,(\s])angle=swiftshader(?:$|[,)\s])/i);
}

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
  readonly measuredVisibleMoleculeCount: number;
  readonly interactionRafCadence: RafCadence;
  readonly longTasks: LongTaskTelemetry;
  readonly molecularSceneOperationDelta: MolecularSceneOperationCounts;
  readonly molecularSceneRenderDelta: MolecularSceneRenderCounts;
  readonly renderQualityAtStop: string | null;
  readonly renderTimingAtStop: MolecularSceneRenderTiming;
}

export interface MolecularSceneOperationCounts {
  readonly loadMolecules: number;
  readonly updateVisibleMolecules: number;
  readonly rebuildScene: number;
}

export interface MolecularSceneRenderCounts {
  readonly cameraRequests: number;
  readonly frames: number;
  readonly fullQualityRestores: number;
  readonly pickAtoms: number;
}

export interface MolecularSceneRenderTiming {
  readonly softwareRenderer: boolean;
  readonly renderPixelRatio: number;
  readonly fullPixelRatio: number;
  readonly lastFullQualityRenderDurationMs: number;
  readonly lastInteractionRenderDurationMs: number;
  readonly lastFullQualityFrameDurationMs: number;
  readonly lastInteractionFrameDurationMs: number;
  readonly fullQualityRestoreDelayMs: number;
  readonly lastFullQualityRestoreElapsedMs: number;
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

export async function captureAcceptanceScreenshot(
  page: Page,
  filename: string,
  options: { readonly timeout?: number } = {},
) {
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
    timeout: options.timeout,
  });
}

export async function readNumericAttribute(locator: Locator, name: string) {
  const raw = await locator.getAttribute(name);
  expect(raw, `${name} must be exposed as a numeric test hook`).toMatch(/^\d+(?:\.\d+)?$/);
  return Number(raw);
}

export async function readMolecularSceneOperationCounts(
  canvas: Locator,
): Promise<MolecularSceneOperationCounts> {
  const [loadMolecules, updateVisibleMolecules, rebuildScene] = await Promise.all([
    readNumericAttribute(canvas, "data-load-molecules-count"),
    readNumericAttribute(canvas, "data-update-visible-molecules-count"),
    readNumericAttribute(canvas, "data-rebuild-scene-count"),
  ]);
  return { loadMolecules, updateVisibleMolecules, rebuildScene };
}

export async function readMolecularSceneRenderCounts(
  canvas: Locator,
): Promise<MolecularSceneRenderCounts> {
  const [cameraRequests, frames, fullQualityRestores, pickAtoms] = await Promise.all([
    readNumericAttribute(canvas, "data-camera-render-request-count"),
    readNumericAttribute(canvas, "data-render-count"),
    readNumericAttribute(canvas, "data-full-quality-restore-count"),
    readNumericAttribute(canvas, "data-pick-atom-count"),
  ]);
  return { cameraRequests, frames, fullQualityRestores, pickAtoms };
}

export async function readMolecularSceneRenderTiming(
  canvas: Locator,
): Promise<MolecularSceneRenderTiming> {
  const softwareRenderer = await canvas.getAttribute("data-software-renderer");
  expect(softwareRenderer, "software renderer state must be exposed").toMatch(/^(?:true|false)$/);
  const [
    renderPixelRatio,
    fullPixelRatio,
    lastFullQualityRenderDurationMs,
    lastInteractionRenderDurationMs,
    lastFullQualityFrameDurationMs,
    lastInteractionFrameDurationMs,
    fullQualityRestoreDelayMs,
    lastFullQualityRestoreElapsedMs,
  ] = await Promise.all([
    readNumericAttribute(canvas, "data-render-pixel-ratio"),
    readNumericAttribute(canvas, "data-full-pixel-ratio"),
    readNumericAttribute(canvas, "data-last-full-quality-render-duration-ms"),
    readNumericAttribute(canvas, "data-last-interaction-render-duration-ms"),
    readNumericAttribute(canvas, "data-last-full-quality-frame-duration-ms"),
    readNumericAttribute(canvas, "data-last-interaction-frame-duration-ms"),
    readNumericAttribute(canvas, "data-full-quality-restore-delay-ms"),
    readNumericAttribute(canvas, "data-last-full-quality-restore-elapsed-ms"),
  ]);
  return {
    softwareRenderer: softwareRenderer === "true",
    renderPixelRatio,
    fullPixelRatio,
    lastFullQualityRenderDurationMs,
    lastInteractionRenderDurationMs,
    lastFullQualityFrameDurationMs,
    lastInteractionFrameDurationMs,
    fullQualityRestoreDelayMs,
    lastFullQualityRestoreElapsedMs,
  };
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

/**
 * Finds a real, unobstructed point on the canvas instead of assuming its centre
 * is free. Universe cluster controls intentionally sit above parts of the
 * canvas and must remain clickable; the remaining surface must still accept
 * direct camera input.
 */
async function findOpenCanvasSurfacePoint(canvas: Locator) {
  const point = await canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = element.getBoundingClientRect();
    const insetX = Math.min(16, Math.max(4, bounds.width * 0.025));
    const insetY = Math.min(16, Math.max(4, bounds.height * 0.025));
    const candidates = [
      { x: insetX, y: insetY },
      { x: bounds.width - insetX, y: insetY },
      { x: insetX, y: bounds.height - insetY },
      { x: bounds.width - insetX, y: bounds.height - insetY },
      { x: bounds.width * 0.25, y: bounds.height * 0.25 },
      { x: bounds.width * 0.75, y: bounds.height * 0.25 },
      { x: bounds.width * 0.25, y: bounds.height * 0.75 },
      { x: bounds.width * 0.75, y: bounds.height * 0.75 },
      { x: bounds.width * 0.5, y: bounds.height * 0.5 },
    ];

    return candidates.find(({ x, y }) => {
      const hit = document.elementFromPoint(bounds.left + x, bounds.top + y);
      return hit === element;
    }) ?? null;
  });

  expect(
    point,
    "molecular scene must retain an unobstructed canvas surface for camera input",
  ).not.toBeNull();
  return point;
}

export async function hoverOpenCanvasSurface(canvas: Locator) {
  const point = await findOpenCanvasSurfacePoint(canvas);
  if (!point) return;
  await canvas.hover({ position: point });
}

export async function dragCanvas(
  page: Page,
  canvas: Locator,
  delta: { readonly x: number; readonly y: number },
) {
  const [box, point] = await Promise.all([
    canvas.boundingBox(),
    findOpenCanvasSurfacePoint(canvas),
  ]);
  expect(box, "molecular scene canvas must have a rendered box").not.toBeNull();
  if (!box || !point) return;

  const start = { x: box.x + point.x, y: box.y + point.y };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 3 });
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
  await hoverOpenCanvasSurface(canvas);
  if ((await canvas.getAttribute("data-render-quality")) === "interaction") {
    await expect(
      canvas,
      "the measured live-input phase must start after any prior quality restore",
    ).toHaveAttribute("data-render-quality", "full", { timeout: 5_000 });
  }
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const beforeRevision = await readNumericAttribute(revisionOwner, "data-camera-revision");
  const measuredVisibleMoleculeCount = await readNumericAttribute(
    revisionOwner,
    "data-visible-count",
  );
  const operationsBefore = await readMolecularSceneOperationCounts(canvas);
  const renderCountsBefore = await readMolecularSceneRenderCounts(canvas);
  await startInteractionProbe(page);
  await dragCanvas(page, canvas, { x: 64, y: -34 });
  await hoverOpenCanvasSurface(canvas);
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => readNumericAttribute(revisionOwner, "data-camera-revision"), {
      message: "measured drag/zoom interactions must revise the scene camera",
    })
    .toBeGreaterThan(beforeRevision);
  const measured = await stopInteractionProbe(page);
  const afterRevision = await readNumericAttribute(revisionOwner, "data-camera-revision");
  const operationsAfter = await readMolecularSceneOperationCounts(canvas);
  const renderCountsAfter = await readMolecularSceneRenderCounts(canvas);
  const renderQualityAtStop = await canvas.getAttribute("data-render-quality");
  const renderTimingAtStop = await readMolecularSceneRenderTiming(canvas);

  return {
    actions: ["pointer-drag", "wheel-zoom-in", "wheel-zoom-out"],
    cameraRevisionDelta: afterRevision - beforeRevision,
    measuredVisibleMoleculeCount,
    molecularSceneOperationDelta: {
      loadMolecules: operationsAfter.loadMolecules - operationsBefore.loadMolecules,
      updateVisibleMolecules:
        operationsAfter.updateVisibleMolecules - operationsBefore.updateVisibleMolecules,
      rebuildScene: operationsAfter.rebuildScene - operationsBefore.rebuildScene,
    },
    molecularSceneRenderDelta: {
      cameraRequests: renderCountsAfter.cameraRequests - renderCountsBefore.cameraRequests,
      frames: renderCountsAfter.frames - renderCountsBefore.frames,
      fullQualityRestores:
        renderCountsAfter.fullQualityRestores - renderCountsBefore.fullQualityRestores,
      pickAtoms: renderCountsAfter.pickAtoms - renderCountsBefore.pickAtoms,
    },
    renderQualityAtStop,
    renderTimingAtStop,
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
  const rendererEnvironment = await collectRendererEnvironmentTelemetry(page, testInfo);
  expectRendererEnvironmentForPerformanceProfile(rendererEnvironment);
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
    rendererEnvironment,
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
