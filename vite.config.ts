import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";

// Opt into polling only in development environments whose filesystem watcher
// cannot deliver native events. Production builds do not use this setting.
const usePolling = process.env.DEV_USE_POLLING === "true";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

const ketcherPackage = /^ketcher-(?:core|react|standalone)(?:\/|$)/u;
const ketcherCoreVirtualId = "\0dev-molecules:ketcher-core-esm";
const ketcherCoreModulePath = fileURLToPath(
  new URL("./node_modules/ketcher-core/dist/index.modern.js", import.meta.url),
);

const browserOnlyChemistryPlugin: Plugin = {
  name: "dev-molecules:browser-only-ketcher",
  enforce: "pre",
  resolveId(source) {
    // vinext analyzes client references in a server-consumer environment. The
    // Ketcher modules never execute there, and scanning their multi-megabyte
    // browser distributions with the server CommonJS transform overflows its
    // parser. Externalize only these explicit packages, only for server
    // consumers; Vite's client build still bundles the real editor and worker.
    if (this.environment.config.consumer === "server" && ketcherPackage.test(source)) {
      return { id: source, external: true };
    }
    // vinext's CommonJS detector strips comments with a backtracking regular
    // expression before it applies dependency filters. Ketcher Core's valid
    // 6.5 MB ESM distribution overflows that detector. A no-extension virtual
    // id lets the detector skip it while preserving the vendor ESM verbatim.
    if (this.environment.config.consumer === "client" && source === "ketcher-core") {
      return ketcherCoreVirtualId;
    }
    return null;
  },
  async load(id) {
    if (id === ketcherCoreVirtualId) {
      return readFile(ketcherCoreModulePath, "utf8");
    }
    return null;
  },
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // Ketcher 3.17.2 still ships two Node-style compile-time identifiers in
    // its browser bundle. Replace only those identifiers: `globalThis` is the
    // browser global and NODE_ENV is a non-secret build constant. Deliberately
    // do not expose or polyfill `process`, `process.env`, or runtime variables.
    define: {
      global: "globalThis",
      "process.env.NODE_ENV": JSON.stringify(
        command === "serve" ? "development" : "production",
      ),
      "import.meta.env.VITE_MOLEVREN_WORKING_BRAND": JSON.stringify(
        process.env.MOLEVREN_WORKING_BRAND ?? "on",
      ),
    },
    server: usePolling
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      browserOnlyChemistryPlugin,
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
