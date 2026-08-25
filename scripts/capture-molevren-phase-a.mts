import { spawn } from "node:child_process";
import { Buffer as NodeBuffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 1000 } as const;
const VIDEO_VIEWPORT = { width: 1440, height: 900 } as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DEFAULT_BASE_URL = "http://127.0.0.1:4173/dev-molecules/";
const BASIC_RECORD_SLUG = "beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n";
const VIDEO_DURATION_SECONDS = 75;
const VIDEO_FILENAME = "molevren-phase-a-walkthrough.mp4";

const baseUrl = ensureTrailingSlash(
  process.env.MOLEVREN_CAPTURE_BASE_URL ?? DEFAULT_BASE_URL,
);
const outputDirectory = path.resolve(
  process.env.MOLEVREN_CAPTURE_OUTPUT_DIR ?? "docs/assets/molevren",
);
const brandDirectory = path.resolve("public/brand");
const ffmpegPath = process.env.MOLEVREN_CAPTURE_FFMPEG ?? "ffmpeg";
const ffprobePath = process.env.MOLEVREN_CAPTURE_FFPROBE ?? "ffprobe";

const requiredScreenshots = [
  "brand-board.png",
  "logo-light.png",
  "logo-dark.png",
  "favicon-preview.png",
  "home-tr.png",
  "home-en.png",
  "home-motion-off.png",
  "home-motion-on.png",
  "atlas-browse.png",
  "atlas-spatial.png",
  "basic-record.png",
  "dossier-story.png",
  "dossier-reference.png",
  "academy.png",
  "synthesis.png",
  "nomenclature.png",
  "lab.png",
  "mobile-home.png",
] as const;

type Locale = "tr" | "en";
type MotionMode = "full" | "reduced" | "off";
type ProductState = {
  readonly locale: Locale;
  readonly motion: MotionMode;
  readonly presentation: "student" | "expert";
};

type ProcessResult = {
  readonly stdout: string;
  readonly stderr: string;
};

type PngEvidence = {
  readonly filename: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
};

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function appUrl(hash: string): string {
  return new URL(hash, baseUrl).href;
}

function assetUrl(relativePath: string): string {
  return new URL(relativePath, baseUrl).href;
}

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${NodeBuffer.from(svg).toString("base64")}`;
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function runProcess(
  executable: string,
  args: readonly string[],
): Promise<ProcessResult> {
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(executable, [...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${executable} exited with status ${code ?? "unknown"}.\n${stderr}`,
          ),
        );
      }
    });
  });
}

async function brandFontCss(): Promise<string> {
  const [fraunces, manrope, mono] = await Promise.all([
    readFile(
      path.resolve(
        "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
      ),
    ),
    readFile(
      path.resolve(
        "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
      ),
    ),
    readFile(
      path.resolve(
        "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      ),
    ),
  ]);
  return `
    @font-face {
      font-family: "Molevren Fraunces";
      font-style: normal;
      font-weight: 100 900;
      src: url(data:font/woff2;base64,${NodeBuffer.from(fraunces).toString("base64")}) format("woff2-variations");
    }
    @font-face {
      font-family: "Molevren Manrope";
      font-style: normal;
      font-weight: 200 800;
      src: url(data:font/woff2;base64,${NodeBuffer.from(manrope).toString("base64")}) format("woff2-variations");
    }
    @font-face {
      font-family: "Molevren Mono";
      font-style: normal;
      font-weight: 500;
      src: url(data:font/woff2;base64,${NodeBuffer.from(mono).toString("base64")}) format("woff2");
    }
  `;
}

async function screenshotContent(
  page: Page,
  filename: (typeof requiredScreenshots)[number],
  html: string,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve, reject) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => reject(new Error("Brand asset failed to load.")), {
                once: true,
              });
            }),
        ),
    );
  });
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: false,
    animations: "disabled",
  });
}

async function captureBrandEvidence(page: Page): Promise<void> {
  const [
    fonts,
    metallic,
    flat,
    horizontalLight,
    horizontalDark,
    favicon,
  ] = await Promise.all([
    brandFontCss(),
    readFile(path.join(brandDirectory, "molevren-symbol-metallic.svg"), "utf8"),
    readFile(path.join(brandDirectory, "molevren-symbol-flat.svg"), "utf8"),
    readFile(
      path.join(brandDirectory, "molevren-lockup-horizontal-light.svg"),
      "utf8",
    ),
    readFile(
      path.join(brandDirectory, "molevren-lockup-horizontal-dark.svg"),
      "utf8",
    ),
    readFile(path.join(brandDirectory, "molevren-favicon.svg"), "utf8"),
  ]);

  const reset = `
    ${fonts}
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body { font-family: "Molevren Manrope", Arial, sans-serif; }
  `;

  await screenshotContent(
    page,
    "brand-board.png",
    `<!doctype html><style>
      ${reset}
      body { padding: 46px; color: #0b1324; background: #f7f3eb; }
      h1, h2, h3, p { margin: 0; }
      .top { display: flex; align-items: end; justify-content: space-between; padding-bottom: 22px; border-bottom: 2px solid #0a3d91; }
      .top h1 { max-width: 820px; font: 610 46px/1.05 "Molevren Fraunces", Georgia, serif; }
      .top p { color: #0a3d91; font-size: 13px; font-weight: 800; letter-spacing: .18em; }
      .board { display: grid; grid-template-columns: 1.07fr .93fr; grid-template-rows: 402px 1fr; gap: 20px; height: 900px; padding-top: 22px; }
      .card { position: relative; overflow: hidden; padding: 26px; border: 1px solid #d7d8d5; border-radius: 22px; background: #fffdf7; }
      .card > h2 { position: absolute; top: 22px; left: 26px; color: #0a3d91; font-size: 13px; letter-spacing: .14em; }
      .primary { display: grid; place-items: center; background: radial-gradient(circle at 50% 52%, #fff 0, #fffdf7 54%, #f4eee4 100%); }
      .primary img { width: 60%; max-height: 300px; }
      .lockups { display: grid; grid-template-rows: 1fr 1fr; gap: 16px; padding: 0; border: 0; background: transparent; }
      .lockups > div { display: grid; place-items: center; overflow: hidden; border: 1px solid #d7d8d5; border-radius: 22px; }
      .lockups img { width: 93%; height: 90%; object-fit: contain; }
      .system { display: grid; grid-template-columns: 1.15fr .85fr; gap: 20px; padding-top: 62px; }
      .palette { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .swatch { display: flex; min-height: 112px; flex-direction: column; justify-content: end; padding: 14px; border-radius: 16px; color: white; font-size: 14px; font-weight: 800; }
      .swatch small { margin-top: 5px; font: 500 12px "Molevren Mono", monospace; }
      .icons { display: grid; place-items: center; grid-template-columns: 1fr 1fr; border-left: 1px solid #e0dfdc; }
      .icons img:first-child { width: 132px; }
      .icons img:last-child { width: 92px; border-radius: 20px; box-shadow: 0 18px 34px rgb(11 19 36 / 18%); }
      .type { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-top: 70px; }
      .type h3 { font: 610 40px/1.05 "Molevren Fraunces", Georgia, serif; }
      .type strong { display: block; font-size: 33px; line-height: 1.1; }
      .type code { display: block; margin-top: 22px; color: #b24b00; font: 500 17px/1.5 "Molevren Mono", monospace; }
      .type p { margin-top: 17px; color: #5b6574; font-size: 16px; line-height: 1.55; }
    </style>
    <header class="top"><h1>Molevren production brand system</h1><p>STRUCTURE · MOTION · KNOWLEDGE</p></header>
    <main class="board">
      <section class="card primary"><h2>01 · PRIMARY SYMBOL</h2><img src="${dataUri(metallic)}" alt="Molevren metallic molecular M symbol"></section>
      <section class="lockups"><div style="background:#fffdf7"><img src="${dataUri(horizontalLight)}" alt="Molevren light-surface lockup"></div><div style="background:#0b1324"><img src="${dataUri(horizontalDark)}" alt="Molevren dark-surface lockup"></div></section>
      <section class="card"><h2>02 · COLOR &amp; ICON SYSTEM</h2><div class="system"><div class="palette"><div class="swatch" style="background:#ff8a00">Orange<small>#FF8A00</small></div><div class="swatch" style="background:#0a3d91">Parliament<small>#0A3D91</small></div><div class="swatch" style="background:#0b1324">Deep Navy<small>#0B1324</small></div><div class="swatch" style="background:#2d5be3">Cobalt<small>#2D5BE3</small></div><div class="swatch" style="background:#00b3c6">Mole Teal<small>#00B3C6</small></div><div class="swatch" style="background:#a5adb8">Cool Gray<small>#A5ADB8</small></div></div><div class="icons"><img src="${dataUri(flat)}" alt="Molevren flat symbol"><img src="${dataUri(favicon)}" alt="Molevren favicon"></div></div></section>
      <section class="card"><h2>03 · TYPOGRAPHY &amp; USE</h2><div class="type"><div><h3>Editorial structure</h3><p>Fraunces carries scientific storytelling and dossier hierarchy.</p></div><div><strong>Manrope UI</strong><code>CID 4594 · C₁₆H₂₁NO₂</code><p>Manrope keeps controls clear. IBM Plex Mono preserves identifiers and formulae.</p></div></div></section>
    </main>`,
    { width: 1600, height: 1100 },
  );

  const logoFrame = (
    background: string,
    foreground: string,
    lockup: string,
    surfaceLabel: string,
  ) => `<!doctype html><style>
    ${reset}
    body { display: grid; place-items: center; color: ${foreground}; background: ${background}; }
    main { display: grid; width: 1060px; height: 450px; place-items: center; padding: 58px; border: 1px solid color-mix(in srgb, ${foreground} 18%, transparent); border-radius: 32px; background: color-mix(in srgb, ${background} 92%, ${foreground} 8%); box-shadow: 0 30px 80px rgb(0 0 0 / 14%); }
    img { width: 860px; max-height: 250px; object-fit: contain; }
    p { align-self: end; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase; }
  </style><main><img src="${dataUri(lockup)}" alt="Molevren horizontal production lockup"><p>${surfaceLabel}</p></main>`;

  await screenshotContent(
    page,
    "logo-light.png",
    logoFrame("#f7f3eb", "#0b1324", horizontalLight, "Production lockup · light surface"),
    { width: 1200, height: 630 },
  );
  await screenshotContent(
    page,
    "logo-dark.png",
    logoFrame("#050a16", "#fffdf7", horizontalDark, "Production lockup · dark surface"),
    { width: 1200, height: 630 },
  );

  await screenshotContent(
    page,
    "favicon-preview.png",
    `<!doctype html><style>
      ${reset}
      body { display: grid; place-items: center; color: #0b1324; background: #f7f3eb; }
      main { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 70px; width: 760px; }
      .large { width: 330px; border-radius: 74px; box-shadow: 0 38px 80px rgb(11 19 36 / 24%); }
      h1 { margin: 0; font: 610 46px/1.08 "Molevren Fraunces", Georgia, serif; }
      p { color: #5b6574; font-size: 18px; line-height: 1.55; }
      .sizes { display: flex; align-items: end; gap: 20px; margin-top: 30px; }
      .sizes img:nth-child(1) { width: 64px; }
      .sizes img:nth-child(2) { width: 48px; }
      .sizes img:nth-child(3) { width: 32px; }
      code { display: block; margin-top: 24px; color: #0a3d91; font: 500 14px "Molevren Mono", monospace; }
    </style><main><img class="large" src="${dataUri(favicon)}" alt="Molevren production favicon"><section><h1>Small, precise, recognisable.</h1><p>The production favicon keeps the molecular hexagon, orange nodes and central M legible at browser sizes.</p><div class="sizes"><img src="${dataUri(favicon)}" alt="64 pixel preview"><img src="${dataUri(favicon)}" alt="48 pixel preview"><img src="${dataUri(favicon)}" alt="32 pixel preview"></div><code>molevren-favicon.svg</code></section></main>`,
    { width: 900, height: 900 },
  );
}

function initialStorageState(state: ProductState) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseUrl).origin,
        localStorage: [
          { name: "dev-molecules:locale", value: state.locale },
          { name: "dev-molecules:presentation-mode", value: state.presentation },
          { name: "dev-molecules:molevren-working-brand:v1", value: "molevren" },
          { name: "molevren:motion-mode", value: state.motion },
        ],
      },
    ],
  };
}

async function setProductState(page: Page, state: ProductState): Promise<void> {
  if (!page.url().startsWith(new URL(baseUrl).origin)) return;
  await page.evaluate((nextState) => {
    window.localStorage.setItem("dev-molecules:locale", nextState.locale);
    window.localStorage.setItem(
      "dev-molecules:presentation-mode",
      nextState.presentation,
    );
    window.localStorage.setItem(
      "dev-molecules:molevren-working-brand:v1",
      "molevren",
    );
    window.localStorage.setItem("molevren:motion-mode", nextState.motion);
    window.dispatchEvent(new Event("molevren:motion-mode-change"));
    window.sessionStorage.removeItem("dev-molecules:atlas-browse-state:v1");
  }, state);
}

async function synchronizeProductState(
  page: Page,
  state: ProductState,
): Promise<void> {
  const root = page.locator("[data-catalog-status]").first();
  await root.waitFor({ timeout: 30_000 });

  if ((await root.getAttribute("data-locale")) !== state.locale) {
    const localeButton = state.locale === "en"
      ? page.getByRole("button", {
          name: /Dili İngilizce yap|Switch language to English/u,
          exact: true,
        })
      : page.getByRole("button", {
          name: /Dili Türkçe yap|Switch language to Turkish/u,
          exact: true,
        });
    await localeButton.click();
  }
  await page.waitForFunction(
    (expectedLocale) =>
      document.querySelector<HTMLElement>("[data-catalog-status]")?.dataset.locale ===
      expectedLocale,
    state.locale,
  );

  if ((await root.getAttribute("data-motion")) !== state.motion) {
    await page.evaluate((motion) => {
      window.localStorage.setItem("molevren:motion-mode", motion);
      window.dispatchEvent(new Event("molevren:motion-mode-change"));
    }, state.motion);
  }
  await page.waitForFunction(
    (expectedMotion) =>
      document.querySelector<HTMLElement>("[data-catalog-status]")?.dataset.motion ===
      expectedMotion,
    state.motion,
  );

  if ((await root.getAttribute("data-experience-mode")) !== state.presentation) {
    const settingsButton = page.getByRole("button", {
      name: /Ayarlar|Settings/u,
      exact: true,
    });
    await settingsButton.click();
    const presentationButton = state.presentation === "expert"
      ? page.getByRole("button", { name: /Uzman görünümü|Expert view/u })
      : page.getByRole("button", { name: /Öğrenci görünümü|Student view/u });
    await presentationButton.click();
  }
  await page.waitForFunction(
    (expectedPresentation) =>
      document.querySelector<HTMLElement>("[data-catalog-status]")?.dataset
        .experienceMode === expectedPresentation,
    state.presentation,
  );
}

async function waitForCatalog(page: Page): Promise<void> {
  await page
    .locator('[data-catalog-status="ready"][data-catalog-records="1552"]')
    .waitFor({ timeout: 60_000 });
}

async function settleFrame(page: Page, delay = 350): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  if (delay > 0) await page.waitForTimeout(delay);
}

async function waitForHome(page: Page): Promise<void> {
  await page.locator('[data-home="true"]').waitFor({ timeout: 30_000 });
  await waitForCatalog(page);
  await page
    .locator('[data-home-featured-stage="true"] [data-scene-status="ready"]')
    .waitFor({ timeout: 90_000 });
}

async function waitForAtlasBrowse(page: Page): Promise<void> {
  await waitForCatalog(page);
  await page
    .locator('[data-drug-atlas="true"][data-atlas-view="browse"]')
    .waitFor({ timeout: 30_000 });
  await page.locator('[data-atlas-record]').first().waitFor({ timeout: 30_000 });
}

async function waitForAtlasSpatial(page: Page): Promise<void> {
  await waitForCatalog(page);
  const spatial = page.locator('[data-atlas-spatial="true"]');
  await spatial.waitFor({ timeout: 30_000 });
  const scene = spatial.locator('[data-scene-status]').first();
  await scene.waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => {
    const candidate = document.querySelector<HTMLElement>(
      '[data-atlas-spatial="true"] [data-scene-status]',
    );
    return candidate?.dataset.sceneStatus === "ready" ||
      candidate?.dataset.sceneStatus === "partial";
  });
}

async function waitForBasicRecord(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const record = page.locator('[data-basic-molecular-record="true"]');
  await record.waitFor({ timeout: 30_000 });
  await record
    .locator('[data-basic-record-structure="2d"] canvas')
    .waitFor({ timeout: 60_000 });
  await record
    .locator('[data-basic-record-structure="3d"] [data-structure-status="ready"]')
    .waitFor({ timeout: 90_000 });
  return record;
}

async function waitForDossier(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const dossier = page.locator('[data-molecule-id="molecule:propranolol"]');
  await dossier.waitFor({ timeout: 30_000 });
  await dossier
    .locator('[data-dossier-chemistry="true"] [data-structure-status="ready"]')
    .waitFor({ timeout: 90_000 });
  return dossier;
}

async function waitForAcademy(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const academy = page.locator('[data-academy-learning-map="eight-modules"]');
  await academy.waitFor({ timeout: 30_000 });
  await academy.locator('[data-academy-module]').first().waitFor();
  return academy;
}

async function waitForSynthesis(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
  await synthesis.waitFor({ timeout: 30_000 });
  await synthesis.locator('[data-synthesis-atlas]').waitFor({ timeout: 60_000 });
  return synthesis;
}

async function waitForNomenclature(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const nomenclature = page.getByTestId("nomenclature-academy");
  await nomenclature.waitFor({ timeout: 30_000 });
  return nomenclature;
}

async function waitForLab(page: Page): Promise<Locator> {
  await waitForCatalog(page);
  const lab = page.locator('[data-lab-area="builder"]');
  await lab.waitFor({ timeout: 30_000 });
  await lab
    .locator('[data-ketcher-editor="standalone"][data-ketcher-ready="true"]')
    .waitFor({ timeout: 120_000 });
  return lab;
}

async function positionAt(locator: Locator, top = 94): Promise<void> {
  await locator.evaluate((element, targetTop) => {
    const absoluteTop = window.scrollY + element.getBoundingClientRect().top;
    window.scrollTo({
      top: Math.max(0, absoluteTop - targetTop),
      behavior: "auto",
    });
  }, top);
}

async function assertNoHorizontalOverflow(
  page: Page,
  evidenceName: string,
): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  if (
    dimensions.documentWidth > dimensions.clientWidth + 2 ||
    dimensions.bodyWidth > dimensions.clientWidth + 2
  ) {
    throw new Error(
      `${evidenceName} has horizontal overflow: ${JSON.stringify(dimensions)}`,
    );
  }
}

async function captureProductViewport(
  page: Page,
  filename: (typeof requiredScreenshots)[number],
  focus?: Locator,
  top = 94,
): Promise<void> {
  if (focus) await positionAt(focus, top);
  await settleFrame(page);
  await assertNoHorizontalOverflow(page, filename);
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: false,
    animations: "allow",
  });
}

async function openProductRoute(
  page: Page,
  hash: string,
  state: ProductState,
): Promise<void> {
  await setProductState(page, state);
  await page.goto(appUrl(hash), { waitUntil: "domcontentloaded" });
  await synchronizeProductState(page, state);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

function watchRuntime(page: Page, runtimeErrors: string[]): void {
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
}

async function captureHomeVariant({
  browser,
  runtimeErrors,
  state,
  viewport,
  filenames,
}: {
  readonly browser: Browser;
  readonly runtimeErrors: string[];
  readonly state: ProductState;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly filenames: readonly (
    | "home-tr.png"
    | "home-en.png"
    | "home-motion-off.png"
    | "home-motion-on.png"
    | "mobile-home.png"
  )[];
}): Promise<void> {
  const context = await browser.newContext({
    viewport,
    colorScheme: "light",
    locale: state.locale === "tr" ? "tr-TR" : "en-US",
    reducedMotion: "no-preference",
    storageState: initialStorageState(state),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  watchRuntime(page, runtimeErrors);
  try {
    await openProductRoute(page, "#home", state);
    if (viewport.width <= MOBILE_VIEWPORT.width) {
      await page.locator('[data-home="true"]').waitFor({ timeout: 30_000 });
      await waitForCatalog(page);
    } else {
      await waitForHome(page);
    }
    for (const filename of filenames) {
      if (filename === "home-motion-on.png") {
        await page
          .locator('div[data-motion="full"][data-route="home"] > canvas')
          .waitFor({ timeout: 30_000 });
        await page.waitForTimeout(900);
      }
      await captureProductViewport(page, filename);
    }
  } finally {
    await page.close();
    await context.close();
  }
}

async function captureProductEvidence(
  browser: Browser,
  runtimeErrors: string[],
): Promise<void> {
  const fullMotionState: ProductState = {
    locale: "tr",
    motion: "full",
    presentation: "student",
  };
  const staticState: ProductState = {
    locale: "tr",
    motion: "off",
    presentation: "student",
  };

  await captureHomeVariant({
    browser,
    runtimeErrors,
    state: fullMotionState,
    viewport: DESKTOP_VIEWPORT,
    filenames: ["home-tr.png", "home-motion-on.png"],
  });
  await captureHomeVariant({
    browser,
    runtimeErrors,
    state: { ...fullMotionState, locale: "en" },
    viewport: DESKTOP_VIEWPORT,
    filenames: ["home-en.png"],
  });
  await captureHomeVariant({
    browser,
    runtimeErrors,
    state: staticState,
    viewport: DESKTOP_VIEWPORT,
    filenames: ["home-motion-off.png"],
  });
  await captureHomeVariant({
    browser,
    runtimeErrors,
    state: staticState,
    viewport: MOBILE_VIEWPORT,
    filenames: ["mobile-home.png"],
  });

  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    colorScheme: "light",
    locale: "tr-TR",
    reducedMotion: "no-preference",
    storageState: initialStorageState(staticState),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  watchRuntime(page, runtimeErrors);

  try {
    await openProductRoute(page, "#home", staticState);
    await waitForHome(page);
    if (
      await page
        .locator(
          '[data-catalog-status][data-motion="off"] > div[data-motion][data-route] > canvas',
        )
        .count()
    ) {
      throw new Error("Motion-off evidence still contains an atmosphere canvas.");
    }
    await openProductRoute(page, "#atlas", staticState);
    await waitForAtlasBrowse(page);
    await captureProductViewport(
      page,
      "atlas-browse.png",
      page.locator('[data-drug-atlas="true"]'),
      78,
    );

    await openProductRoute(page, "#atlas/spatial", {
      ...staticState,
      motion: "full",
    });
    await waitForAtlasSpatial(page);
    await captureProductViewport(
      page,
      "atlas-spatial.png",
      page.locator('[data-drug-atlas="true"]'),
      78,
    );

    await openProductRoute(page, `#drug/${BASIC_RECORD_SLUG}`, staticState);
    const basicRecord = await waitForBasicRecord(page);
    await captureProductViewport(
      page,
      "basic-record.png",
      basicRecord.locator("#basic-record-structures"),
      96,
    );

    await openProductRoute(page, "#drug/propranolol", staticState);
    const dossier = await waitForDossier(page);
    await captureProductViewport(page, "dossier-story.png", dossier, 74);

    await dossier
      .getByRole("button", { name: /Referans Modu|Reference Mode/u, exact: true })
      .click();
    await dossier.locator('[data-reference-tab="overview"]').waitFor();
    await captureProductViewport(page, "dossier-reference.png", dossier, 74);

    await openProductRoute(page, "#academy", staticState);
    const academy = await waitForAcademy(page);
    await captureProductViewport(page, "academy.png", academy, 78);

    await openProductRoute(
      page,
      "#academy/synthesis/propranolol/atlas",
      staticState,
    );
    const synthesis = await waitForSynthesis(page);
    await captureProductViewport(
      page,
      "synthesis.png",
      synthesis.locator("#synthesis-atlas-panel"),
      86,
    );

    await openProductRoute(page, "#academy/nomenclature/organic", staticState);
    const nomenclature = await waitForNomenclature(page);
    await captureProductViewport(page, "nomenclature.png", nomenclature, 76);

    await openProductRoute(page, "#lab", staticState);
    const lab = await waitForLab(page);
    const labFocus = lab.locator("#ketcher-workspace-heading");
    await captureProductViewport(page, "lab.png", labFocus, 100);

  } finally {
    await page.close();
    await context.close();
  }
}

async function navigateHash(page: Page, hash: string): Promise<void> {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
  await page.waitForFunction(
    (expectedHash) => window.location.hash === expectedHash,
    hash,
  );
}

async function installVideoOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #molevren-evidence-chapter {
        position: fixed;
        right: 24px;
        bottom: 22px;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 335px;
        padding: 10px 15px 10px 11px;
        border: 1px solid rgb(255 255 255 / 20%);
        border-radius: 999px;
        background: rgb(5 10 22 / 90%);
        box-shadow: 0 16px 42px rgb(0 0 0 / 26%);
        color: #fffdf7;
        font: 750 12px/1.2 Manrope, ui-sans-serif, system-ui, sans-serif;
        letter-spacing: .08em;
        text-transform: uppercase;
        pointer-events: none;
        backdrop-filter: blur(14px);
      }
      #molevren-evidence-chapter img { width: 29px; height: 29px; }
      #molevren-evidence-pointer {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483647;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #fffdf7;
        border-radius: 50%;
        background: rgb(255 138 0 / 58%);
        box-shadow: 0 0 0 5px rgb(255 138 0 / 18%);
        opacity: 0;
        transform: translate3d(0, 0, 0);
        transition: opacity 180ms ease, transform 440ms cubic-bezier(.2,.8,.2,1);
        pointer-events: none;
      }
    `,
  });
  await page.evaluate((symbolUrl) => {
    const chapter = document.createElement("div");
    chapter.id = "molevren-evidence-chapter";
    const logo = document.createElement("img");
    logo.src = symbolUrl;
    logo.alt = "";
    const label = document.createElement("span");
    label.textContent = "Molevren · Phase A";
    chapter.appendChild(logo);
    chapter.appendChild(label);
    document.body.appendChild(chapter);

    const pointer = document.createElement("div");
    pointer.id = "molevren-evidence-pointer";
    document.body.appendChild(pointer);
  }, assetUrl("brand/molevren-symbol-flat.svg"));
}

async function setVideoChapter(page: Page, label: string): Promise<void> {
  await page.evaluate((nextLabel) => {
    const chapter = document.querySelector<HTMLElement>(
      "#molevren-evidence-chapter span",
    );
    if (chapter) chapter.textContent = nextLabel;
  }, label);
}

async function moveVideoPointer(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ({ pointerX, pointerY }) => {
      const pointer = document.querySelector<HTMLElement>(
        "#molevren-evidence-pointer",
      );
      if (!pointer) return;
      pointer.style.opacity = "1";
      pointer.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    },
    { pointerX: x, pointerY: y },
  );
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(450);
}

async function warmVideoRoutes(page: Page): Promise<void> {
  await navigateHash(page, "#atlas");
  await waitForAtlasBrowse(page);
  await navigateHash(page, "#atlas/spatial");
  await waitForAtlasSpatial(page);
  await navigateHash(page, `#drug/${BASIC_RECORD_SLUG}`);
  await waitForBasicRecord(page);
  await navigateHash(page, "#drug/propranolol");
  await waitForDossier(page);
  await navigateHash(page, "#academy");
  await waitForAcademy(page);
  await navigateHash(page, "#academy/synthesis/propranolol/atlas");
  await waitForSynthesis(page);
  await navigateHash(page, "#academy/nomenclature/organic");
  await waitForNomenclature(page);
  await navigateHash(page, "#lab");
  await waitForLab(page);
  await navigateHash(page, "#home");
  await waitForHome(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

async function transcodeVideo(
  rawVideoPath: string,
  recordingOffsetSeconds: number,
  destination: string,
): Promise<void> {
  await runProcess(ffmpegPath, [
    "-y",
    "-i",
    rawVideoPath,
    "-ss",
    recordingOffsetSeconds.toFixed(3),
    "-t",
    String(VIDEO_DURATION_SECONDS),
    "-an",
    "-vf",
    "fps=30,scale=1440:900:flags=lanczos,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "25",
    "-movflags",
    "+faststart",
    destination,
  ]);
}

async function captureWalkthrough(browser: Browser): Promise<void> {
  const recordingDirectory = await mkdtemp(
    path.join(tmpdir(), "molevren-phase-a-video-"),
  );
  try {
    const videoState: ProductState = {
      locale: "en",
      motion: "full",
      presentation: "student",
    };
    const context = await browser.newContext({
      viewport: VIDEO_VIEWPORT,
      recordVideo: { dir: recordingDirectory, size: VIDEO_VIEWPORT },
      colorScheme: "light",
      locale: "en-US",
      reducedMotion: "no-preference",
      storageState: initialStorageState(videoState),
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const video = page.video();
    const recordingStartedAt = Date.now();
    let captureStartedAt = recordingStartedAt;

    try {
      await page.goto(appUrl("#home"), { waitUntil: "domcontentloaded" });
      await synchronizeProductState(page, videoState);
      await waitForHome(page);
      await warmVideoRoutes(page);
      await installVideoOverlay(page);
      await settleFrame(page, 300);
      captureStartedAt = Date.now();

      await setVideoChapter(page, "01 · Home · Molecular Atlas & Academy");
      await page.waitForTimeout(6_000);

      await navigateHash(page, "#atlas");
      await waitForAtlasBrowse(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await setVideoChapter(page, "02 · Atlas Browse · 1,552 records");
      await moveVideoPointer(page, page.locator('[data-atlas-record]').first());
      await page.waitForTimeout(7_000);

      await navigateHash(page, "#atlas/spatial");
      await waitForAtlasSpatial(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await setVideoChapter(page, "03 · Spatial · bounded molecular scene");
      await page.waitForTimeout(6_000);

      await navigateHash(page, `#drug/${BASIC_RECORD_SLUG}`);
      const basicRecord = await waitForBasicRecord(page);
      await positionAt(basicRecord.locator("#basic-record-structures"), 96);
      await setVideoChapter(page, "04 · Basic Record · identity before interpretation");
      await page.waitForTimeout(6_000);

      await navigateHash(page, "#drug/propranolol");
      const dossier = await waitForDossier(page);
      await positionAt(dossier, 70);
      await setVideoChapter(page, "05 · Curated Dossier · structure to evidence");
      await page.waitForTimeout(4_000);
      const chemistryMap = dossier.locator('[data-flagship-chemistry="story"]').first();
      if (await chemistryMap.count()) await positionAt(chemistryMap, 96);
      await page.waitForTimeout(4_000);

      await navigateHash(page, "#academy");
      const academy = await waitForAcademy(page);
      await positionAt(academy, 76);
      await setVideoChapter(page, "06 · Academy · eight-module learning map");
      await page.waitForTimeout(6_000);

      await navigateHash(page, "#academy/synthesis/propranolol/atlas");
      const synthesis = await waitForSynthesis(page);
      await positionAt(synthesis.locator("#synthesis-atlas-panel"), 90);
      await setVideoChapter(page, "07 · Synthesis · source-gated route atlas");
      await page.waitForTimeout(8_000);

      await navigateHash(page, "#academy/nomenclature/organic");
      const nomenclature = await waitForNomenclature(page);
      await positionAt(nomenclature, 76);
      await setVideoChapter(page, "08 · Nomenclature · structure language");
      await page.waitForTimeout(7_000);

      await navigateHash(page, "#lab");
      const lab = await waitForLab(page);
      await positionAt(lab.locator("#ketcher-workspace-heading"), 100);
      await setVideoChapter(page, "09 · Lab · private on-device editor");
      await page.waitForTimeout(9_000);

      const elapsed = (Date.now() - captureStartedAt) / 1_000;
      await page.waitForTimeout(
        Math.max(0, (VIDEO_DURATION_SECONDS + 1.5 - elapsed) * 1_000),
      );
    } finally {
      await page.close();
      await context.close();
    }

    const rawVideoPath = await video?.path();
    if (!rawVideoPath) {
      throw new Error("Playwright did not produce a walkthrough video.");
    }
    await transcodeVideo(
      rawVideoPath,
      Math.max(0, (captureStartedAt - recordingStartedAt) / 1_000),
      path.join(outputDirectory, VIDEO_FILENAME),
    );
  } finally {
    await rm(recordingDirectory, { recursive: true, force: true });
  }
}

function pngDimensions(buffer: Uint8Array): { width: number; height: number } {
  const signature = "89504e470d0a1a0a";
  if (NodeBuffer.from(buffer.subarray(0, 8)).toString("hex") !== signature) {
    throw new Error("Evidence file is not a PNG.");
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

async function inspectPng(filename: string): Promise<PngEvidence> {
  const filePath = path.join(outputDirectory, filename);
  const buffer = await readFile(filePath);
  if (buffer.length === 0) throw new Error(`${filename} is empty.`);
  const dimensions = pngDimensions(buffer);
  return {
    filename,
    bytes: buffer.length,
    ...dimensions,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function inspectVideo() {
  const videoPath = path.join(outputDirectory, VIDEO_FILENAME);
  const file = await stat(videoPath);
  if (file.size === 0) throw new Error(`${VIDEO_FILENAME} is empty.`);
  const result = await runProcess(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height",
    "-of",
    "json",
    videoPath,
  ]);
  const probe = JSON.parse(result.stdout) as {
    readonly streams?: readonly {
      readonly codec_type?: string;
      readonly codec_name?: string;
      readonly width?: number;
      readonly height?: number;
    }[];
    readonly format?: { readonly duration?: string };
  };
  const durationSeconds = Number(probe.format?.duration ?? 0);
  const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
  const audioStreamCount =
    probe.streams?.filter((stream) => stream.codec_type === "audio").length ?? 0;
  if (durationSeconds < 60 || durationSeconds > 90) {
    throw new Error(
      `${VIDEO_FILENAME} duration ${durationSeconds}s is outside 60–90 seconds.`,
    );
  }
  if (audioStreamCount !== 0) {
    throw new Error(`${VIDEO_FILENAME} is not silent.`);
  }
  if (!videoStream?.width || !videoStream.height) {
    throw new Error(`${VIDEO_FILENAME} has no readable video stream.`);
  }
  const buffer = await readFile(videoPath);
  return {
    filename: VIDEO_FILENAME,
    bytes: file.size,
    durationSeconds,
    width: videoStream.width,
    height: videoStream.height,
    codec: videoStream.codec_name ?? "unknown",
    audioStreamCount,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function verifyEvidence(runtimeErrors: readonly string[]): Promise<void> {
  const screenshots = await Promise.all(requiredScreenshots.map(inspectPng));
  const video = await inspectVideo();
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl,
    productionLogoSource: "public/brand/molevren-symbol-flat.svg",
    screenshotCount: screenshots.length,
    requiredScreenshotCount: requiredScreenshots.length,
    screenshots,
    walkthrough: video,
    runtimeErrors,
    checks: {
      everyRequiredScreenshotPresent: screenshots.length === requiredScreenshots.length,
      everyArtifactNonempty: true,
      walkthroughDurationWithin60To90Seconds:
        video.durationSeconds >= 60 && video.durationSeconds <= 90,
      walkthroughSilent: video.audioStreamCount === 0,
      desktopViewport: DESKTOP_VIEWPORT,
      mobileViewport: MOBILE_VIEWPORT,
      walkthroughViewport: VIDEO_VIEWPORT,
    },
  };
  await writeFile(
    path.join(outputDirectory, "capture-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  if (runtimeErrors.length > 0) {
    throw new Error(
      `Evidence capture observed runtime errors:\n${runtimeErrors.join("\n")}`,
    );
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        outputDirectory,
        screenshotCount: screenshots.length,
        videoDurationSeconds: video.durationSeconds,
        videoBytes: video.bytes,
        runtimeErrorCount: runtimeErrors.length,
      },
      null,
      2,
    )}\n`,
  );
}

async function capture(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await launchBrowser();
  const runtimeErrors: string[] = [];
  try {
    const brandContext = await browser.newContext({ colorScheme: "light" });
    const brandPage = await brandContext.newPage();
    try {
      await captureBrandEvidence(brandPage);
    } finally {
      await brandPage.close();
      await brandContext.close();
    }
    await captureProductEvidence(browser, runtimeErrors);
    await captureWalkthrough(browser);
  } finally {
    await browser.close();
  }
  await verifyEvidence(runtimeErrors);
}

await capture();
