import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { resolvePublicAssetPath } = await tsImport(
  "../lib/application/explore-catalog.ts",
  import.meta.url,
);

test("public structure assets preserve root hosting and support a Pages project base", () => {
  const structurePath = "/structures/pubchem/cid-4946-3d.sdf";

  assert.equal(resolvePublicAssetPath(structurePath), structurePath);
  assert.equal(resolvePublicAssetPath(structurePath, "/"), structurePath);
  assert.equal(
    resolvePublicAssetPath(structurePath, "/dev-molecules"),
    "/dev-molecules/structures/pubchem/cid-4946-3d.sdf",
  );
  assert.equal(
    resolvePublicAssetPath(structurePath, "/dev-molecules/"),
    "/dev-molecules/structures/pubchem/cid-4946-3d.sdf",
  );
});
