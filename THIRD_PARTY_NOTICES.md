# Third-party notices

Dev Molecules keeps the interactive rendering boundary replaceable. This release adds only the following direct open-source packages for the new capability:

## Runtime

- **three 0.185.1** — Three.js Authors — MIT License
  Project: <https://github.com/mrdoob/three.js>
  Purpose: the shared WebGL molecular scene, perspective camera, depth-tested atom spheres and bond cylinders. The package has no runtime dependencies.
- **smiles-drawer 2.4.1** — Daniel Probst and Reymond Group — MIT License
  Project: <https://github.com/reymond-group/smilesDrawer>
  Purpose: deterministic client-side parsing and two-dimensional depiction of source-linked SMILES in Synthesis Atlas and Nomenclature Academy. It does not generate or validate synthetic routes.
- **chroma-js 2.6.0** — Gregor Aisch — BSD-3-Clause AND Apache-2.0 Licenses
  Project: <https://github.com/gka/chroma.js>
  Purpose: transitive color utility used by `smiles-drawer`.
- **ketcher-core 3.17.2**, **ketcher-react 3.17.2** and
  **ketcher-standalone 3.17.2** — EPAM Systems — Apache License 2.0
  Project: <https://github.com/epam/ketcher>
  Purpose: the route-lazy, browser-only chemical structure editor and its
  local binary-WASM structure-service provider in Lab. The integration does
  not send user-created structures to a Dev Molecules server.

## Development and verification

- **@playwright/test 1.62.1** — Microsoft Corporation — Apache License 2.0
  Project: <https://github.com/microsoft/playwright>
  Purpose: browser interaction, network, console, performance and visual acceptance tests. It is not shipped as application runtime code.
- **@types/three 0.185.4** — DefinitelyTyped contributors — MIT License
  Project: <https://github.com/DefinitelyTyped/DefinitelyTyped>
  Purpose: compile-time TypeScript declarations only.

The lockfile pins exact direct versions. Both `npm audit` and `npm audit --omit=dev` report zero known vulnerabilities for this dependency set as checked on 2026-08-23. Toolchain upgrades are compatibility-tested rather than forced across the Vinext/worker boundary.

## Data and scientific-content notices

### DrugCentral-derived catalog material

The catalog snapshot uses selected fields from **DrugCentral**, maintained by the University of New Mexico Translational Informatics Division. The defining publication is [DrugCentral: online drug compendium](https://doi.org/10.1093/nar/gkw993), *Nucleic Acids Research* 45(D1), D932–D939 (2017). Source files are linked in the checked snapshot and originate from [DrugCentral](https://drugcentral.org/).

DrugCentral database content is made available under the [Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/). Dev Molecules modifies that source material by selecting the configured FDA-list rows, joining same-ID structure records, normalizing fields, matching exact InChIKeys to PubChem, declaring exclusions, and generating compact search indexes, shards and coverage reports. No endorsement by DrugCentral or its contributors is implied.

The DrugCentral-derived portions of `scripts/catalog/source-snapshots/` and `public/catalog/` are redistributed under CC BY-SA 4.0. Recipients must preserve attribution, the license link and the modification notice; ShareAlike applies to adapted database material. This data license is separate from the source-code licensing status described in the README and does not itself grant a license to unrelated application code.

### PubChem structure records

Two- and three-dimensional SDF records are retrieved from [PubChem PUG REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) by exact CID after identity matching. The catalog retains PubChem CID, source URL, retrieval metadata and content hashes. NCBI's [data and copyright policies](https://www.ncbi.nlm.nih.gov/home/about/policies/) apply; NCBI cannot grant rights in third-party submitted content. Institutional redistribution review therefore remains a documented release boundary.
