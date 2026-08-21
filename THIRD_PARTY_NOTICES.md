# Third-party notices

Dev Molecules keeps the interactive rendering boundary replaceable. This release adds only the following direct open-source packages for the new capability:

## Runtime

- **three 0.185.1** — Three.js Authors — MIT License
  Project: <https://github.com/mrdoob/three.js>
  Purpose: the shared WebGL molecular scene, perspective camera, depth-tested atom spheres and bond cylinders. The package has no runtime dependencies.

## Development and verification

- **@playwright/test 1.62.1** — Microsoft Corporation — Apache License 2.0
  Project: <https://github.com/microsoft/playwright>
  Purpose: browser interaction, network, console, performance and visual acceptance tests. It is not shipped as application runtime code.
- **@types/three 0.185.4** — DefinitelyTyped contributors — MIT License
  Project: <https://github.com/DefinitelyTyped/DefinitelyTyped>
  Purpose: compile-time TypeScript declarations only.

The lockfile pins exact versions. `npm audit --omit=dev` reports zero production vulnerabilities for this dependency set as checked on 2026-08-21. Development-tool advisories are reviewed separately and are not silently force-upgraded across the Sites/vinext compatibility boundary.
