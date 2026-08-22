import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configPaths = ["../vite.config.ts", "../vite.pages.config.ts"];

for (const configPath of configPaths) {
  test(`${configPath} exposes only Ketcher's two safe browser build constants`, async () => {
    const source = await readFile(new URL(configPath, import.meta.url), "utf8");

    assert.match(source, /global:\s*"globalThis"/u);
    assert.match(source, /"process\.env\.NODE_ENV":\s*JSON\.stringify/u);
    assert.match(source, /command === "serve" \? "development" : "production"/u);

    assert.doesNotMatch(source, /(?:^|\s)process:\s*\{/mu);
    assert.doesNotMatch(source, /"process\.env":/u);
    assert.doesNotMatch(source, /loadEnv\s*\(/u);
  });
}

test("the standalone Indigo worker receives export commands sequentially", async () => {
  const source = await readFile(
    new URL("../components/lab/KetcherEditorSurface.tsx", import.meta.url),
    "utf8",
  );

  const smilesIndex = source.indexOf("await ketcher.getSmiles()");
  const molfileIndex = source.indexOf('await ketcher.getMolfile("v3000")');
  const inchiKeyIndex = source.indexOf("await ketcher.getInChIKey()");

  assert.ok(smilesIndex > -1);
  assert.ok(molfileIndex > smilesIndex);
  assert.ok(inchiKeyIndex > molfileIndex);
  assert.doesNotMatch(source, /Promise\.all\s*\(\s*\[\s*ketcher\./u);
  assert.match(
    source,
    /from "ketcher-standalone\/dist\/binaryWasm"/u,
    "the browser build must use Ketcher's external module worker, not its embedded blob worker",
  );
});

test("server analysis externalizes only the three browser-only Ketcher packages", async () => {
  const source = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

  assert.match(source, /config\.consumer === "server"/u);
  assert.match(source, /\^ketcher-\(\?:core\|react\|standalone\)/u);
  assert.match(source, /return \{ id: source, external: true \}/u);
  assert.match(source, /source === "ketcher-core"/u);
  assert.match(source, /ketcherCoreVirtualId = "\\0dev-molecules:ketcher-core-esm"/u);
  assert.match(source, /readFile\(ketcherCoreModulePath, "utf8"\)/u);
});
