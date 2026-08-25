import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function customProperty(css, name) {
  const match = css.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*:\\s*([^;]+);`, "u"));
  assert.ok(match, `${name} must be declared`);
  return match[1].trim();
}

function selectorBlock(css, selector) {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `${selector} must exist`);
  const openingBrace = css.indexOf("{", start);
  assert.ok(openingBrace >= 0, `${selector} must open a block`);
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`${selector} must close its block`);
}

async function collectSourceFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const childUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(childUrl));
    else if ([".css", ".ts", ".tsx"].includes(extname(entry.name))) files.push(childUrl);
  }
  return files;
}

test("the Molevren token layer owns every required visual system category", async () => {
  const [tokens, tokenModule, fontCss] = await Promise.all([
    readFile(new URL("../styles/molevren-tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/brand/molevren-tokens.ts", import.meta.url), "utf8"),
    readFile(new URL("../styles/molevren-fonts.css", import.meta.url), "utf8"),
  ]);
  const requiredTokens = [
    "--color-metallic-orange",
    "--color-parliament-blue",
    "--color-deep-navy",
    "--color-midnight-stage",
    "--color-soft-lake-ivory",
    "--color-paper-ivory",
    "--font-family-display",
    "--font-family-ui",
    "--font-family-mono",
    "--space-page-inline",
    "--radius-lg",
    "--border-color-on-dark",
    "--shadow-elevated",
    "--blur-lg",
    "--motion-duration-ui",
    "--motion-ease-standard",
    "--z-atmosphere",
    "--z-content",
    "--surface-midnight",
    "--surface-ivory",
    "--surface-paper",
    "--surface-editor",
    "--molecular-stage-node-orange",
    "--molecular-stage-link-opacity",
    "--focus-ring-width",
    "--focus-ring-color",
  ];
  for (const token of requiredTokens) customProperty(tokens, token);

  assert.match(tokenModule, /export const MOLEVREN_TOKENS/u);
  for (const category of [
    "color",
    "gradient",
    "typography",
    "spacing",
    "radius",
    "border",
    "shadow",
    "blur",
    "motion",
    "zIndex",
    "surface",
    "molecularStage",
    "focusRing",
  ]) {
    assert.match(tokenModule, new RegExp(`\\b${category}\\b`, "u"));
  }
  assert.match(fontCss, /@fontsource-variable\/fraunces/u);
  assert.match(fontCss, /@fontsource-variable\/manrope/u);
  assert.match(fontCss, /@fontsource\/ibm-plex-mono/u);
  assert.doesNotMatch(fontCss, /https?:\/\//u, "brand fonts must remain self-hosted");
});

test("full-page surfaces cannot fall back to pure white", async () => {
  const [globals, shell, tokens] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/platform.module.css", import.meta.url), "utf8"),
    readFile(new URL("../styles/molevren-tokens.css", import.meta.url), "utf8"),
  ]);

  const htmlBlock = selectorBlock(globals, "html");
  const bodyBlock = selectorBlock(globals, "body");
  const molevrenAppBlock = selectorBlock(shell, '.app[data-working-brand="molevren"]');
  for (const [name, block] of [
    ["html", htmlBlock],
    ["body", bodyBlock],
    ["Molevren app", molevrenAppBlock],
  ]) {
    assert.doesNotMatch(block, /(?:background|background-color)\s*:\s*(?:#fff(?:fff)?\b|white\b|rgb\(255[ ,]+255[ ,]+255\))/iu, `${name} must not be pure white`);
  }
  assert.match(htmlBlock, /background:\s*var\(--background\)/u);
  assert.match(bodyBlock, /background:\s*var\(--background\)/u);
  assert.match(molevrenAppBlock, /background:\s*var\(--gradient-midnight-stage\)/u);
  assert.equal(customProperty(tokens, "--background"), "var(--surface-midnight)");
  assert.equal(customProperty(tokens, "--surface-editor"), "var(--color-paper-ivory)");
  assert.notEqual(customProperty(tokens, "--color-paper-ivory").toLowerCase(), "#ffffff");
});

test("body typography keeps a 15px floor on desktop and mobile", async () => {
  const [globals, shell, tokens] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/platform.module.css", import.meta.url), "utf8"),
    readFile(new URL("../styles/molevren-tokens.css", import.meta.url), "utf8"),
  ]);
  const toPixels = (value) => {
    const match = value.match(/^([0-9.]+)rem$/u);
    assert.ok(match, `${value} must use a rem body size`);
    return Number(match[1]) * 16;
  };
  assert.ok(toPixels(customProperty(tokens, "--font-size-body")) >= 15);
  assert.ok(toPixels(customProperty(tokens, "--font-size-body-mobile")) >= 15);
  assert.match(selectorBlock(globals, "body"), /font-family:\s*var\(--font-molevren-ui\)/u);
  assert.match(
    selectorBlock(shell, '.app[data-working-brand="molevren"]'),
    /font-size:\s*var\(--font-size-body\)/u,
  );
  assert.match(tokens, /@media \(max-width: 48rem\)[\s\S]*--font-size-body:\s*var\(--font-size-body-mobile\)/u);
});

test("core brand hex values stay centralized or appear only as explicit token fallbacks", async () => {
  const sourceFiles = (await Promise.all(
    ["app/", "components/", "lib/", "styles/"].map((directory) =>
      collectSourceFiles(new URL(`../${directory}`, import.meta.url)),
    ),
  )).flat();
  const allowedFiles = new Set([
    "app/layout.tsx",
    "lib/brand/molevren-brand.ts",
    "lib/brand/molevren-tokens.ts",
    "styles/molevren-tokens.css",
  ]);
  const brandHex = /#(?:ff8a00|0a3d91|0b1324|050a16|f6f1e8|fffdf7)\b/giu;
  const violations = [];

  for (const fileUrl of sourceFiles) {
    const filename = relative(projectRoot, fileURLToPath(fileUrl));
    if (allowedFiles.has(filename)) continue;
    const source = await readFile(fileUrl, "utf8");
    const lines = source.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const match of line.matchAll(brandHex)) {
        const escaped = match[0].replace("#", "#");
        const isTokenFallback = new RegExp(`var\\([^;]*,\\s*${escaped}\\s*\\)`, "iu").test(line);
        if (!isTokenFallback) violations.push(`${filename}:${index + 1}:${match[0]}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
