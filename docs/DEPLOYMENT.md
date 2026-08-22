# Dev Molecules — Deployment

## Public application

The public application is served at:

<https://pharmacist65.github.io/dev-molecules/>

It is a GitHub project site, so every application asset must remain under the `/dev-molecules/` base path. Explore navigation uses URL hashes and therefore works without server-side route rewrites.

## Build boundary

The repository has two production adapters around one product implementation:

- `npm run build` produces the vinext/Sites server-capable build.
- `npm run build:pages` produces the static GitHub Pages artifact in `dist-pages/`.

The Pages entry imports `DevMoleculesApp` directly. It does not copy the product shell, scientific records, scoring rules, or rendering implementation. The static build prefixes checked-in structure-asset requests with the project base path while leaving canonical domain asset records unchanged.

GitHub Pages cannot execute `/api/evidence`. In that deployment, Discover calls the existing curated `createLocalEvidenceCard` application service directly. It produces the same fail-closed evidence content that the server endpoint uses as its baseline; card timestamps and IDs are generated when the user requests the card. No OpenAI credential, GitHub credential, or user research content is placed in the client bundle.

## CI and least privilege

`.github/workflows/quality.yml` runs on every push and pull request. It validates type safety, lint, dependency audit, the server-capable build, the static build, Node tests, the main browser suite, and the Pages-specific browser suite.

On a push to `main`, the tested `dist-pages/` directory is uploaded as the Pages artifact. Deployment is a separate job that:

- runs only after both quality jobs pass;
- does not check out or execute repository code;
- receives only `pages: write` and `id-token: write`;
- uses SHA-pinned official GitHub Actions.

Repository Pages settings must use **GitHub Actions** as the build source. No personal access token or repository secret is required for deployment.

## Local verification

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run build:pages
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
```

The Pages test opens the production artifact at `/dev-molecules/`, loads real PubChem 3D and 2D SDF records, verifies a direct molecule-focus hash, requires one WebGL context, generates a curated Discover card without an API request, and fails on console, page, or network errors.

## Release and rollback

The workflow environment records each Pages deployment against its source revision. A release is accepted only after the workflow is green and an unauthenticated browser receives the public URL, static assets, and a real SDF with HTTP 200 responses.

If a release fails after deployment, restore a previously verified source tree on `main` and let the same gated workflow redeploy it. Do not upload a local directory manually, bypass the quality workflow, or place a token in a public client environment variable.
