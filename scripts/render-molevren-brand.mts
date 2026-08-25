import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium, type Page } from "@playwright/test";

const root = process.cwd();
const brandRoot = join(root, "public", "brand");
const iconRoot = join(brandRoot, "icons");
const docsBrandRoot = join(root, "docs", "assets", "brand");

const dataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

async function brandFontCss() {
  const [fraunces, manrope] = await Promise.all([
    readFile(join(root, "node_modules", "@fontsource-variable", "fraunces", "files", "fraunces-latin-wght-normal.woff2")),
    readFile(join(root, "node_modules", "@fontsource-variable", "manrope", "files", "manrope-latin-wght-normal.woff2")),
  ]);
  return `
    @font-face{font-family:FrauncesBrand;font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${Buffer.from(fraunces).toString("base64")}) format("woff2-variations")}
    @font-face{font-family:ManropeBrand;font-style:normal;font-weight:200 800;src:url(data:font/woff2;base64,${Buffer.from(manrope).toString("base64")}) format("woff2-variations")}
  `;
}

async function renderSvg(
  page: Page,
  sourceName: string,
  destination: string,
  width: number,
  height: number,
) {
  const svg = await readFile(join(brandRoot, sourceName), "utf8");
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}img{display:block;width:100%;height:100%;object-fit:contain}</style><img alt="" src="${dataUri(svg)}">`);
  await page.locator("img").screenshot({ path: destination, omitBackground: true });
}

function encodeIco(images: readonly Buffer[], sizes: readonly number[]): Buffer {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = headerSize;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    const size = sizes[index] ?? 0;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...images]);
}

async function renderSocialCard(
  page: Page,
  destination: string,
  width: number,
  height: number,
  square = false,
) {
  const symbol = dataUri(await readFile(join(brandRoot, "molevren-symbol-metallic.svg"), "utf8"));
  const wordmark = dataUri(
    (await readFile(join(brandRoot, "molevren-wordmark.svg"), "utf8"))
      .replaceAll("#0B1324", "#FFFDF7"),
  );
  const fonts = await brandFontCss();
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>
    ${fonts}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
    body{display:grid;place-items:center;background:radial-gradient(circle at 78% 18%,#174c9c 0,transparent 34%),radial-gradient(circle at 15% 82%,#6f2a00 0,transparent 31%),#050a16;color:#fffdf7;font-family:ManropeBrand,Arial,sans-serif}
    .network{position:absolute;inset:0;opacity:.16;background-image:linear-gradient(30deg,transparent 47%,#89a8df 48%,transparent 49%),linear-gradient(150deg,transparent 47%,#ff9a2e 48%,transparent 49%);background-size:110px 190px}
    .frame{position:absolute;inset:${square ? "56" : "48"}px;border:1px solid rgba(255,138,0,.35);border-radius:32px}
    .content{position:relative;z-index:2;display:grid;width:${square ? "78%" : "86%"};grid-template-columns:${square ? "1fr" : "210px 1fr"};align-items:center;gap:${square ? "34px" : "58px"};text-align:${square ? "center" : "left"}}
    .symbol{width:${square ? "250px" : "210px"};margin:${square ? "0 auto" : "0"}}
    .wordmark{width:100%}
    .descriptor{margin:20px 0 0;color:#c6d4f2;font-size:${square ? "30px" : "26px"};line-height:1.3}
    .line{margin-top:22px;color:#ff9a2e;font-size:${square ? "16px" : "14px"};font-weight:700;letter-spacing:.28em}
    .pill{position:absolute;right:${square ? "74" : "68"}px;bottom:${square ? "72" : "62"}px;padding:10px 16px;border:1px solid #ff8a00;border-radius:999px;color:#ffd0a4;font-size:13px;font-weight:800;letter-spacing:.12em}
  </style><div class="network"></div><div class="frame"></div><main class="content"><img class="symbol" alt="" src="${symbol}"><div><img class="wordmark" alt="MOLEVREN" src="${wordmark}"><p class="descriptor">Pharmaceutical Molecular Atlas &amp; Academy</p><p class="line">STRUCTURE · MOTION · KNOWLEDGE</p></div></main><div class="pill">PUBLIC ALPHA</div>`);
  await page.screenshot({ path: destination });
}

async function renderBrandBoard(page: Page) {
  const flat = dataUri(await readFile(join(brandRoot, "molevren-symbol-flat.svg"), "utf8"));
  const metallic = dataUri(await readFile(join(brandRoot, "molevren-symbol-metallic.svg"), "utf8"));
  const horizontalLight = dataUri(await readFile(join(brandRoot, "molevren-lockup-horizontal-light.svg"), "utf8"));
  const horizontalDark = dataUri(await readFile(join(brandRoot, "molevren-lockup-horizontal-dark.svg"), "utf8"));
  const favicon = dataUri(await readFile(join(brandRoot, "molevren-favicon.svg"), "utf8"));
  const fonts = await brandFontCss();
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.setContent(`<!doctype html><style>
    ${fonts}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{padding:52px;background:#f6f1e8;color:#0b1324;font-family:ManropeBrand,Arial,sans-serif}
    h1,h2,p{margin:0}.head{display:flex;align-items:end;justify-content:space-between;border-bottom:2px solid #0a3d91;padding-bottom:24px}.head h1{font:600 48px FrauncesBrand,Georgia,serif}.head p{color:#0a3d91;font-weight:800;letter-spacing:.16em}
    .grid{display:grid;height:900px;grid-template-columns:1.1fr .9fr;grid-template-rows:420px 1fr;gap:24px;padding-top:24px}.card{position:relative;overflow:hidden;border:1px solid #d6d8dc;border-radius:24px;background:#fffdf7;padding:28px}.card h2{position:absolute;top:24px;left:28px;color:#0a3d91;font-size:14px;letter-spacing:.12em}.primary{display:grid;place-items:center}.primary img{width:62%;max-height:310px}.applications{display:grid;grid-template-rows:1fr 1fr;gap:18px;background:transparent;border:0;padding:0}.applications>div{display:grid;place-items:center;border-radius:24px;overflow:hidden}.applications img{width:92%;height:92%;object-fit:contain}.palette{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;padding-top:64px}.swatch{display:grid;align-content:end;min-height:185px;padding:16px;border-radius:18px;color:#fff;font-weight:800}.swatch small{display:block;margin-top:6px;font-weight:500}.type{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding-top:76px}.type h3{margin:0 0 12px;font:600 42px FrauncesBrand,Georgia,serif}.type strong{display:block;font-size:38px}.type p{margin-top:18px;color:#5b6574;font-size:17px;line-height:1.6}.iconrow{display:flex;align-items:center;gap:28px;margin-top:46px}.iconrow img:first-child{width:118px}.iconrow img:last-child{width:92px;border-radius:22px}
  </style><header class="head"><h1>Molevren production brand system</h1><p>STRUCTURE · MOTION · KNOWLEDGE</p></header><section class="grid"><article class="card primary"><h2>01 · PRIMARY SYMBOL</h2><img src="${metallic}" alt=""></article><article class="applications"><div style="background:#fffdf7"><img src="${horizontalLight}" alt=""></div><div style="background:#0b1324"><img src="${horizontalDark}" alt=""></div></article><article class="card"><h2>02 · COLOR SYSTEM</h2><div class="palette"><div class="swatch" style="background:#ff8a00">Orange<small>#FF8A00</small></div><div class="swatch" style="background:#0a3d91">Parliament<small>#0A3D91</small></div><div class="swatch" style="background:#0b1324">Deep Navy<small>#0B1324</small></div><div class="swatch" style="background:#2d5be3">Cobalt<small>#2D5BE3</small></div><div class="swatch" style="background:#00b3c6">Mole Teal<small>#00B3C6</small></div></div><div class="iconrow"><img src="${flat}" alt=""><img src="${favicon}" alt=""></div></article><article class="card"><h2>03 · TYPOGRAPHY &amp; USE</h2><div class="type"><div><h3>Editorial structure</h3><p>Fraunces for hero and dossier titles. Warm, precise and reserved for hierarchy.</p></div><div><strong>Manrope UI</strong><p>Manrope for navigation and reading. IBM Plex Mono for formulae, CIDs and identifiers.</p></div></div></article></section>`);
  await page.screenshot({ path: join(docsBrandRoot, "molevren-brand-board.png") });
}

await Promise.all([mkdir(iconRoot, { recursive: true }), mkdir(docsBrandRoot, { recursive: true })]);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const iconSizes = [16, 32, 48] as const;
  for (const size of iconSizes) {
    await renderSvg(page, "molevren-favicon.svg", join(iconRoot, `favicon-${size}.png`), size, size);
  }
  await renderSvg(page, "molevren-favicon.svg", join(iconRoot, "apple-touch-icon-180.png"), 180, 180);
  await renderSvg(page, "molevren-favicon.svg", join(root, "public", "apple-touch-icon.png"), 180, 180);
  await renderSvg(page, "molevren-favicon.svg", join(iconRoot, "pwa-192.png"), 192, 192);
  await renderSvg(page, "molevren-favicon.svg", join(iconRoot, "pwa-512.png"), 512, 512);
  await renderSvg(page, "molevren-favicon.svg", join(iconRoot, "maskable-512.png"), 512, 512);
  const icoImages = await Promise.all(iconSizes.map((size) => readFile(join(iconRoot, `favicon-${size}.png`))));
  await writeFile(join(root, "public", "favicon.ico"), encodeIco(icoImages, iconSizes));
  await renderSocialCard(page, join(brandRoot, "molevren-og-1200x630.png"), 1200, 630);
  await renderSocialCard(page, join(brandRoot, "molevren-social-square-1080.png"), 1080, 1080, true);
  await renderBrandBoard(page);
} finally {
  await browser.close();
}
