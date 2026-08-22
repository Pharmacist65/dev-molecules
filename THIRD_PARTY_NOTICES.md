# Third-party notices

Dev Molecules keeps the interactive rendering boundary replaceable. This release adds only the following direct open-source packages for the new capability:

## Runtime

- **three 0.185.1** — Three.js Authors — MIT License
  Project: <https://github.com/mrdoob/three.js>
  Purpose: the shared WebGL molecular scene, perspective camera, depth-tested atom spheres and bond cylinders. The package has no runtime dependencies.
- **smiles-drawer 2.4.1** — Daniel Probst and Reymond Group — MIT License
  Project: <https://github.com/reymond-group/smilesDrawer>
  Purpose: deterministic client-side parsing and two-dimensional depiction of source-linked SMILES in Synthesis Theatre. It does not generate or validate synthetic routes.
- **chroma-js 2.6.0** — Gregor Aisch — BSD-3-Clause AND Apache-2.0 Licenses
  Project: <https://github.com/gka/chroma.js>
  Purpose: transitive color utility used by `smiles-drawer`.

## Development and verification

- **@playwright/test 1.62.1** — Microsoft Corporation — Apache License 2.0
  Project: <https://github.com/microsoft/playwright>
  Purpose: browser interaction, network, console, performance and visual acceptance tests. It is not shipped as application runtime code.
- **@types/three 0.185.4** — DefinitelyTyped contributors — MIT License
  Project: <https://github.com/DefinitelyTyped/DefinitelyTyped>
  Purpose: compile-time TypeScript declarations only.

The lockfile pins exact direct versions. Both `npm audit` and `npm audit --omit=dev` report zero known vulnerabilities for this dependency set as checked on 2026-08-22. Toolchain upgrades are compatibility-tested rather than forced across the Sites/vinext boundary.
