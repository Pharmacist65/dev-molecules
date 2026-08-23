import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Home's editorial grid can shrink without inflating the mobile viewport", async () => {
  const [homeCss, homeSource] = await Promise.all([
    readSource("../components/platform/HomeLanding.module.css"),
    readSource("../components/platform/HomeLanding.tsx"),
  ]);

  assert.match(
    homeCss,
    /\.introduction\s*\{[^}]*min-width:\s*0\s*;/su,
    "the text-side grid item must opt out of its intrinsic minimum width",
  );
  assert.match(
    homeCss,
    /\.stageHost\s*\{[^}]*min-width:\s*0\s*;/su,
    "the molecular-stage grid item must remain shrinkable too",
  );
  assert.doesNotMatch(
    homeSource,
    /matchMedia|innerWidth|useMediaQuery/u,
    "Home responsiveness must remain CSS-driven",
  );
});
