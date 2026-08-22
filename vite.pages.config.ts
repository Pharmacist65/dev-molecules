import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

function normalizeBasePath(value: string | undefined) {
  const withLeadingSlash = value?.startsWith("/") ? value : `/${value ?? "dev-molecules"}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./deployment/github-pages", import.meta.url)),
  base: normalizeBasePath(process.env.GITHUB_PAGES_BASE_PATH),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  define: {
    "import.meta.env.VITE_STATIC_EVIDENCE": JSON.stringify("true"),
  },
  build: {
    outDir: fileURLToPath(new URL("./dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
