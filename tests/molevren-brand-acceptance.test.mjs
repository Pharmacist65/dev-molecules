import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { inflateSync } from "node:zlib";

import { MOLEVREN_BRAND } from "../lib/brand/molevren-brand.ts";
import { messages } from "../lib/i18n/messages.ts";

const publicRoot = new URL("../public/", import.meta.url);
const evidenceRoot = new URL("../docs/assets/molevren/", import.meta.url);

const productionAssets = [
  "brand/molevren-symbol-flat.svg",
  "brand/molevren-symbol-metallic.svg",
  "brand/molevren-wordmark.svg",
  "brand/molevren-header-lockup-dark.svg",
  "brand/molevren-lockup-horizontal-light.svg",
  "brand/molevren-lockup-horizontal-dark.svg",
  "brand/molevren-lockup-stacked-light.svg",
  "brand/molevren-lockup-stacked-dark.svg",
  "brand/molevren-monochrome-dark.svg",
  "brand/molevren-monochrome-light.svg",
  "brand/molevren-favicon.svg",
  "brand/molevren-mask-icon.svg",
  "brand/molevren-og-1200x630.png",
  "brand/molevren-social-square-1080.png",
];

function validateSvgDocument(source, filename) {
  assert.match(source, /^\s*<svg\b/u, `${filename} must start with an SVG root`);
  assert.match(source, /<svg\b[^>]*\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
  assert.match(source, /<svg\b[^>]*\bviewBox="[^"]+"/u);
  assert.match(source, /<\/svg>\s*$/u, `${filename} must close its SVG root`);
  assert.doesNotMatch(source, /<image\b|data:image\//iu, `${filename} must remain vector-native`);

  const stack = [];
  const tagPattern = /<(\/?)(([A-Za-z][\w:.-]*))([^<>]*?)(\/?)>/gu;
  let tagCount = 0;
  for (const match of source.matchAll(tagPattern)) {
    tagCount += 1;
    const closing = match[1] === "/";
    const name = match[2];
    const attributes = match[4];
    const selfClosing = match[5] === "/";
    assert.equal((attributes.match(/"/gu) ?? []).length % 2, 0, `${filename} has an unclosed attribute`);
    assert.equal((attributes.match(/'/gu) ?? []).length % 2, 0, `${filename} has an unclosed attribute`);
    if (closing) {
      assert.equal(stack.pop(), name, `${filename} closes <${name}> out of order`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  assert.ok(tagCount >= 2, `${filename} must contain parseable SVG elements`);
  assert.deepEqual(stack, [], `${filename} must contain balanced SVG tags`);
}

function readPngDimensions(buffer, filename) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${filename} must be PNG`);
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR", `${filename} must contain IHDR first`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeRgbaPng(buffer, filename) {
  const header = readPngDimensions(buffer, filename);
  assert.equal(header.bitDepth, 8, `${filename} must use eight-bit channels`);
  assert.equal(header.colorType, 6, `${filename} must use RGBA pixels`);

  const idat = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    assert.ok(dataEnd + 4 <= buffer.length, `${filename} contains a truncated PNG chunk`);
    if (type === "IDAT") idat.push(buffer.subarray(dataStart, dataEnd));
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  assert.ok(idat.length > 0, `${filename} must contain image data`);

  const bytesPerPixel = 4;
  const rowLength = header.width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idat));
  assert.equal(inflated.length, (rowLength + 1) * header.height);
  const pixels = Buffer.alloc(rowLength * header.height);
  let inputOffset = 0;

  for (let row = 0; row < header.height; row += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    assert.ok(filter <= 4, `${filename} has an unsupported PNG filter`);
    const outputOffset = row * rowLength;
    for (let column = 0; column < rowLength; column += 1) {
      const raw = inflated[inputOffset + column];
      const left = column >= bytesPerPixel ? pixels[outputOffset + column - bytesPerPixel] : 0;
      const above = row > 0 ? pixels[outputOffset - rowLength + column] : 0;
      const upperLeft = row > 0 && column >= bytesPerPixel
        ? pixels[outputOffset - rowLength + column - bytesPerPixel]
        : 0;
      const predictor = filter === 1
        ? left
        : filter === 2
          ? above
          : filter === 3
            ? Math.floor((left + above) / 2)
            : filter === 4
              ? paeth(left, above, upperLeft)
              : 0;
      pixels[outputOffset + column] = (raw + predictor) & 0xff;
    }
    inputOffset += rowLength;
  }
  return { ...header, pixels };
}

function countPixelsNear(pixels, target, tolerance = 90) {
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < 64) continue;
    const distance = Math.abs(pixels[offset] - target[0])
      + Math.abs(pixels[offset + 1] - target[1])
      + Math.abs(pixels[offset + 2] - target[2]);
    if (distance <= tolerance) count += 1;
  }
  return count;
}

async function getRenderedHtml() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("brand-acceptance", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("https://molecules.example/", {
      headers: {
        accept: "text/html",
        host: "molecules.example",
        "x-forwarded-host": "molecules.example",
        "x-forwarded-proto": "https",
      },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  return response.text();
}

test("the complete production Molevren asset registry exists and every SVG parses", async () => {
  assert.deepEqual(
    Object.values(MOLEVREN_BRAND.assets).sort(),
    productionAssets.slice().sort(),
  );

  for (const relativePath of productionAssets) {
    const fileUrl = new URL(relativePath, publicRoot);
    const fileStat = await stat(fileUrl);
    assert.ok(fileStat.size > 0, `${relativePath} must not be empty`);
    if (relativePath.endsWith(".svg")) {
      validateSvgDocument(await readFile(fileUrl, "utf8"), relativePath);
    }
  }

  const socialCard = await readFile(new URL("brand/molevren-og-1200x630.png", publicRoot));
  const socialSquare = await readFile(new URL("brand/molevren-social-square-1080.png", publicRoot));
  assert.deepEqual(readPngDimensions(socialCard, "Molevren OG card"), {
    width: 1200,
    height: 630,
    bitDepth: 8,
    colorType: 2,
  });
  assert.deepEqual(readPngDimensions(socialSquare, "Molevren social square"), {
    width: 1080,
    height: 1080,
    bitDepth: 8,
    colorType: 2,
  });
});

test("favicon PNGs and ICO retain visible orange, navy, and ivory geometry at small sizes", async () => {
  for (const size of [16, 32, 48]) {
    const filename = `brand/icons/favicon-${size}.png`;
    const decoded = decodeRgbaPng(await readFile(new URL(filename, publicRoot)), filename);
    assert.equal(decoded.width, size);
    assert.equal(decoded.height, size);
    assert.ok(countPixelsNear(decoded.pixels, [255, 138, 0]) >= Math.max(2, size / 4), `${filename} must retain orange geometry`);
    assert.ok(countPixelsNear(decoded.pixels, [11, 19, 36]) >= size, `${filename} must retain the navy field`);
    assert.ok(countPixelsNear(decoded.pixels, [255, 253, 247]) >= Math.max(2, size / 5), `${filename} must retain the M mark`);
  }

  const faviconSvg = await readFile(new URL("brand/molevren-favicon.svg", publicRoot), "utf8");
  assert.doesNotMatch(faviconSvg, /<text\b|>\s*MOLEVREN\s*<|STRUCTURE\. MOTION\. KNOWLEDGE\./iu);
  assert.match(faviconSvg, /<path\b[^>]*fill="#FFFDF7"/u);
  assert.ok((faviconSvg.match(/<circle\b/gu) ?? []).length >= 6);

  const ico = await readFile(new URL("favicon.ico", publicRoot));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  assert.equal(count, 3);
  const sizes = Array.from({ length: count }, (_, index) => {
    const entryOffset = 6 + index * 16;
    return [ico[entryOffset] || 256, ico[entryOffset + 1] || 256];
  });
  assert.deepEqual(sizes, [[16, 16], [32, 32], [48, 48]]);
});

test("the web manifest resolves exact PWA icon paths, sizes, and maskable purpose", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", publicRoot), "utf8"));
  assert.equal(manifest.name, "Molevren — Pharmaceutical Molecular Atlas & Academy");
  assert.equal(manifest.short_name, "Molevren");
  assert.equal(manifest.start_url, "./#home");
  assert.equal(manifest.background_color.toLowerCase(), "#050a16");
  assert.equal(manifest.theme_color.toLowerCase(), "#0b1324");
  assert.deepEqual(manifest.icons, [
    { src: "brand/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
    { src: "brand/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    { src: "brand/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ]);

  for (const icon of manifest.icons) {
    const [expectedWidth, expectedHeight] = icon.sizes.split("x").map(Number);
    const dimensions = readPngDimensions(await readFile(new URL(icon.src, publicRoot)), icon.src);
    assert.equal(dimensions.width, expectedWidth);
    assert.equal(dimensions.height, expectedHeight);
  }
  const apple = readPngDimensions(
    await readFile(new URL("apple-touch-icon.png", publicRoot)),
    "apple-touch-icon.png",
  );
  assert.deepEqual([apple.width, apple.height], [180, 180]);
});

test("metadata and localized copy preserve the TR/EN Molevren brand hierarchy", async () => {
  const [layoutSource, pageSource, appSource, shellStyles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/platform.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(layoutSource, /title = "Molevren — Pharmaceutical Molecular Atlas & Academy"/u);
  assert.match(layoutSource, /openGraph:[\s\S]*siteName: "Molevren"[\s\S]*locale: "tr_TR"[\s\S]*alternateLocale: \["en_US"\]/u);
  assert.match(layoutSource, /twitter:[\s\S]*card: "summary_large_image"/u);
  assert.match(layoutSource, /molevren-og-1200x630\.png/u);
  assert.match(layoutSource, /manifest: "\/manifest\.webmanifest"/u);
  assert.match(layoutSource, /molevren-favicon\.svg/u);
  assert.match(layoutSource, /mask-icon[\s\S]*color: "#FF8A00"/u);
  assert.match(pageSource, /Molevren — Pharmaceutical Molecular Atlas & Academy/u);

  for (const locale of ["tr", "en"]) {
    assert.equal(messages[locale]["brand.publicName"], "Molevren");
    assert.ok(messages[locale]["brand.descriptor"].length >= 24);
    assert.ok(messages[locale]["home.title"].length >= 24);
    assert.ok(messages[locale]["home.description"].length >= 60);
  }
  assert.notEqual(messages.tr["brand.descriptor"], messages.en["brand.descriptor"]);
  assert.notEqual(messages.tr["home.title"], messages.en["home.title"]);
  assert.match(appSource, /`\$\{MOLEVREN_BRAND\.publicName\} — \$\{t\("brand\.descriptor"\)\}`/u);
  assert.match(appSource, /getMolevrenAssetUrl\(assetBasePath, "headerDark"\)/u);
  assert.match(appSource, /className=\{styles\.brandLine\} data-brand-line="true">\{t\("brand\.line"\)\}/u);
  assert.match(shellStyles, /\.brandSignature\s*\{[\s\S]*width: clamp\(244px, 18vw, 288px\)/u);
  assert.match(shellStyles, /\.brandLine\s*\{[\s\S]*font-size: clamp\(0\.6875rem, 0\.75vw, 0\.75rem\)/u);
  assert.match(appSource, /getMolevrenAssetUrl\(assetBasePath, "symbolFlat"\)/u);
  assert.match(shellStyles, /\.app\[data-working-brand="molevren"\] > \.topbar\s*\{[\s\S]*background:\s*rgb\(5 10 22 \/ 84%\)/u);
});

test("the default public HTML exposes Molevren and confines Dev Molecules to technical attribution", async () => {
  const html = await getRenderedHtml();
  const publicShell = html.split("<!--$-->")[0];
  assert.match(publicShell, /data-working-brand="molevren"/u);
  assert.match(publicShell, /molevren-header-lockup-dark\.svg/u);
  assert.match(publicShell, /<strong>MOLEVREN<\/strong>/u);
  assert.match(publicShell, /Molevren, Dev Molecules platformu üzerinde geliştirilmiştir\./u);
  assert.doesNotMatch(publicShell, />DEV MOLECULES</u);
  assert.equal((publicShell.match(/Dev Molecules/gu) ?? []).length, 1);
  assert.doesNotMatch(publicShell, /<title>Dev Molecules|application-name" content="Dev Molecules/iu);
});

test("the committed Phase A evidence set is complete, internally consistent, and uses production video", async () => {
  const requiredScreenshots = [
    "academy.png",
    "atlas-browse.png",
    "atlas-spatial.png",
    "basic-record.png",
    "brand-board.png",
    "dossier-reference.png",
    "dossier-story.png",
    "favicon-preview.png",
    "home-en.png",
    "home-motion-off.png",
    "home-motion-on.png",
    "home-tr.png",
    "lab.png",
    "logo-dark.png",
    "logo-light.png",
    "mobile-home.png",
    "nomenclature.png",
    "synthesis.png",
  ];
  const expectedFiles = [
    ...requiredScreenshots,
    "capture-manifest.json",
    "molevren-phase-a-walkthrough.mp4",
  ].sort();
  assert.deepEqual((await readdir(evidenceRoot)).sort(), expectedFiles);

  const manifest = JSON.parse(
    await readFile(new URL("capture-manifest.json", evidenceRoot), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.productionLogoSource, "public/brand/molevren-symbol-flat.svg");
  assert.equal(manifest.screenshotCount, requiredScreenshots.length);
  assert.equal(manifest.requiredScreenshotCount, requiredScreenshots.length);
  assert.deepEqual(
    manifest.screenshots.map(({ filename }) => filename).sort(),
    requiredScreenshots,
  );
  assert.deepEqual(manifest.runtimeErrors, []);

  for (const item of manifest.screenshots) {
    const bytes = await readFile(new URL(item.filename, evidenceRoot));
    const dimensions = readPngDimensions(bytes, item.filename);
    assert.equal(bytes.byteLength, item.bytes, `${item.filename}: byte count`);
    assert.equal(dimensions.width, item.width, `${item.filename}: width`);
    assert.equal(dimensions.height, item.height, `${item.filename}: height`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      item.sha256,
      `${item.filename}: SHA-256`,
    );
  }

  const video = await readFile(
    new URL("molevren-phase-a-walkthrough.mp4", evidenceRoot),
  );
  assert.equal(video.byteLength, manifest.walkthrough.bytes);
  assert.equal(
    createHash("sha256").update(video).digest("hex"),
    manifest.walkthrough.sha256,
  );
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.ok(video.includes(Buffer.from("avc1")), "walkthrough must contain H.264/AVC video");
  assert.ok(video.includes(Buffer.from("vide")), "walkthrough must contain a video handler");
  assert.equal(video.includes(Buffer.from("soun")), false, "walkthrough must be silent");
  assert.ok(manifest.walkthrough.durationSeconds >= 60);
  assert.ok(manifest.walkthrough.durationSeconds <= 90);
  assert.equal(manifest.walkthrough.audioStreamCount, 0);
});
